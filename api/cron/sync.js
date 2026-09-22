const { uploadImage } = require("../../lib/storage");
const { hasSynced, markSynced, savePost } = require("../../lib/store");
const { listDeploymentRuns, getSession, listAllEvents, extractContent } = require("../../lib/anthropic");

async function uploadGeneratedImage(base64, index) {
  const buffer = Buffer.from(base64, "base64");
  return uploadImage(buffer, `slide-${index}.png`, "image/png");
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "não autorizado" });
      return;
    }
  }

  const result = { created: [], skipped: [], errors: [] };
  try {
    const runs = await listDeploymentRuns();
    for (const run of runs) {
      const sessionId = run.session_id;
      if (!sessionId) {
        result.skipped.push({ run: run.id, reason: run.error ? run.error.type : "sem sessão" });
        continue;
      }
      const postId = `agent-${sessionId}`;
      try {
        if (await hasSynced(sessionId)) {
          result.skipped.push({ run: run.id, reason: "já sincronizado antes" });
          continue;
        }

        const session = await getSession(sessionId);
        if (session.status !== "idle") {
          result.skipped.push({ run: run.id, reason: `sessão ainda ${session.status}` });
          continue;
        }

        const events = await listAllEvents(sessionId);
        const parsed = extractContent(events);

        if (!parsed.caption && !parsed.imagesB64.length) {
          result.skipped.push({ run: run.id, reason: "sem conteúdo reconhecível" });
          continue;
        }

        const urls = [];
        for (let i = 0; i < parsed.imagesB64.length; i++) {
          urls.push(await uploadGeneratedImage(parsed.imagesB64[i], i + 1));
        }

        const scheduledAt = run.trigger_context && run.trigger_context.scheduled_at;
        const date = (scheduledAt || run.created_at || new Date().toISOString()).slice(0, 10);

        const post = {
          id: postId,
          date,
          time: parsed.time,
          network: parsed.network,
          format: parsed.format,
          theme: parsed.theme,
          caption: parsed.caption,
          hashtags: parsed.hashtags,
          notes: "Gerado automaticamente pelo agente — revisar antes de postar.",
          images: urls,
          status: "pendente",
          createdAt: run.created_at || new Date().toISOString(),
          sourceSessionId: sessionId,
        };
        await savePost(post);
        await markSynced(sessionId);
        result.created.push({ run: run.id, postId, theme: parsed.theme, images: urls.length });
      } catch (err) {
        result.errors.push({ run: run.id, error: String(err) });
      }
    }
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: String(err), partial: result });
  }
};
