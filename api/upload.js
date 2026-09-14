const { put } = require("@vercel/blob");

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }
  try {
    const { filename, dataUrl } = req.body || {};
    if (!filename || !dataUrl) {
      res.status(400).json({ error: "filename e dataUrl são obrigatórios" });
      return;
    }
    const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: "dataUrl inválida" });
      return;
    }
    const [, contentType, base64] = match;
    const buffer = Buffer.from(base64, "base64");
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const pathname = `data/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const blob = await put(pathname, buffer, { access: "public", contentType });
    res.status(201).json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: "Falha no upload", detail: String(err) });
  }
}

handler.config = { api: { bodyParser: { sizeLimit: "15mb" } } };

module.exports = handler;
