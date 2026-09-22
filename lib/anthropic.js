const API_BASE = "https://api.anthropic.com";
const DEPLOYMENT_ID = "depl_01K2KYhuTePHGW1X68hwJFtK";
const WEEKLY_DEPLOYMENT_ID = process.env.WEEKLY_DEPLOYMENT_ID || "";

function headers() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada nas variáveis de ambiente");
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "managed-agents-2026-04-01",
  };
}

async function apiGet(path) {
  const res = await fetch(API_BASE + path, { headers: headers() });
  if (!res.ok) throw new Error(`Anthropic API ${path} -> ${res.status}`);
  return res.json();
}

async function listDeploymentRuns(deploymentId = DEPLOYMENT_ID) {
  const data = await apiGet(`/v1/deployment_runs?beta=true&deployment_id=${deploymentId}&limit=50`);
  return data.data || [];
}

async function getSession(sessionId) {
  return apiGet(`/v1/sessions/${sessionId}?beta=true`);
}

async function listAllEvents(sessionId) {
  const events = [];
  let cursor = null;
  for (let i = 0; i < 50; i++) {
    let path = `/v1/sessions/${sessionId}/events?beta=true&limit=100`;
    if (cursor) path += `&after=${cursor}`;
    const page = await apiGet(path);
    const items = page.data || [];
    events.push(...items);
    if (!page.has_more || !items.length) break;
    cursor = items[items.length - 1].id;
  }
  return events;
}

function extractContent(events) {
  const images = [];
  const textParts = [];
  let legendaContent = null;

  for (const e of events) {
    if (Array.isArray(e.content)) {
      for (const c of e.content) {
        if (!c || typeof c !== "object") continue;
        if (c.type === "image" && c.source && c.source.type === "base64") {
          images.push(c.source.data);
        }
        if (c.type === "text" && e.type === "agent.message") {
          textParts.push(c.text);
        }
      }
    }
    if (e.type === "agent.tool_use" && e.name === "write") {
      const input = e.input || {};
      const p = input.path || input.file_path || "";
      if (/legenda_\d+\.md$/.test(p)) {
        legendaContent = input.content || "";
      }
    }
  }

  const summary = textParts.join("\n");

  function field(name, fallback) {
    const m = summary.match(new RegExp(`\\*\\*${name}\\*\\*\\s*\\|\\s*([^|\\n]+)`));
    return m ? m[1].trim() : fallback;
  }

  // o agente às vezes escreve o resumo em tabela ("**Tema** | valor"), às vezes
  // em título solto ("## Tema escolhido: valor" ou "Tema: valor") — tenta os dois
  function fieldOrHeading(name, headingPattern, fallback) {
    const tableValue = field(name, null);
    if (tableValue) return tableValue;
    const m = summary.match(headingPattern);
    return m ? m[1].trim() : fallback;
  }

  const theme = fieldOrHeading(
    "Tema",
    /#{0,3}\s*Tema(?: escolhido)?:?\s*\**\s*([^\n]+)/i,
    "Conteúdo do dia"
  );
  let network = field("Rede", "Instagram");
  network = network.replace(/\(.*/, "").trim() || "Instagram";
  let format = fieldOrHeading("Formato", /#{0,3}\s*Formato:?\s*\**\s*([^\n]+)/i, null);
  if (!format) {
    if (/carross/i.test(summary)) format = "Carrossel";
    else if (/reels/i.test(summary)) format = "Reels";
    else format = images.length > 1 ? "Carrossel" : "Imagem";
  }
  format = format.replace(/,.*/, "").trim();

  // formato não-carrossel: o agente costuma revisar/ajustar a arte várias vezes,
  // e cada revisão aparece como uma imagem no histórico — fica só a última (final)
  let finalImages = images;
  if (!/carross/i.test(format) && images.length > 1) {
    finalImages = [images[images.length - 1]];
  }
  const horarioRaw = field("Horário recomendado", "");
  const hm = horarioRaw.match(/(\d{1,2})[:h](\d{2})/);
  const time = hm ? `${String(hm[1]).padStart(2, "0")}:${hm[2]}` : "07:00";

  let caption = "";
  let hashtags = "";
  if (legendaContent) {
    let cm = legendaContent.match(/## LEGENDA FINAL\s*\n+([\s\S]*?)\n+---/);
    if (!cm) cm = legendaContent.match(/## LEGENDA FINAL\s*\n+([\s\S]*?)(?:\n+## |$)/);
    if (cm) caption = cm[1].trim();
    const hm2 = legendaContent.match(/## HASHTAGS\s*\n+([\s\S]*?)(?:\n+## |$)/);
    if (hm2) hashtags = hm2[1].trim();
  }

  return { theme, network, format, time, caption, hashtags, imagesB64: finalImages };
}

function extractWeeklyPlan(events) {
  const textParts = [];
  for (const e of events) {
    if (Array.isArray(e.content)) {
      for (const c of e.content) {
        if (c && c.type === "text" && e.type === "agent.message") {
          textParts.push(c.text);
        }
      }
    }
  }
  const summary = textParts.join("\n");

  const rows = [];
  const lineRe = /^\|\s*([^|]+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d{1,2}[:h]\d{2})\s*\|\s*$/gm;
  let match;
  while ((match = lineRe.exec(summary))) {
    const [, day, date, theme, format, timeRaw] = match;
    if (/^-+$/.test(day.trim())) continue; // linha separadora da tabela
    const hm = timeRaw.match(/(\d{1,2})[:h](\d{2})/);
    rows.push({
      day: day.trim(),
      date: date.trim(),
      theme: theme.trim(),
      format: format.trim(),
      time: hm ? `${String(hm[1]).padStart(2, "0")}:${hm[2]}` : timeRaw.trim(),
    });
  }
  return rows;
}

module.exports = {
  listDeploymentRuns,
  getSession,
  listAllEvents,
  extractContent,
  extractWeeklyPlan,
  WEEKLY_DEPLOYMENT_ID,
};
