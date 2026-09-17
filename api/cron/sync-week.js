const { saveWeek } = require("../../lib/store");
const { listDeploymentRuns, getSession, listAllEvents, extractWeeklyPlan, WEEKLY_DEPLOYMENT_ID } = require("../../lib/anthropic");

function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (!WEEKLY_DEPLOYMENT_ID) {
    res.status(500).json({ error: "WEEKLY_DEPLOYMENT_ID não configurado nas variáveis de ambiente" });
    return;
  }

  const result = { created: [], skipped: [], errors: [] };
  try {
    const runs = await listDeploymentRuns(WEEKLY_DEPLOYMENT_ID);
    for (const run of runs) {
      const sessionId = run.session_id;
      if (!sessionId) {
        result.skipped.push({ run: run.id, reason: run.error ? run.error.type : "sem sessão" });
        continue;
      }
      try {
        const session = await getSession(sessionId);
        if (session.status !== "idle") {
          result.skipped.push({ run: run.id, reason: `sessão ainda ${session.status}` });
          continue;
        }

        const events = await listAllEvents(sessionId);
        const rows = extractWeeklyPlan(events);
        if (!rows.length) {
          result.skipped.push({ run: run.id, reason: "sem tabela reconhecível" });
          continue;
        }

        const weekStart = mondayOf(rows[0].date);
        await saveWeek({ weekStart, days: rows, sourceSessionId: sessionId });
        result.created.push({ run: run.id, weekStart, days: rows.length });
      } catch (err) {
        result.errors.push({ run: run.id, error: String(err) });
      }
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: String(err), partial: result });
  }
};
