const { uploadImage } = require("../lib/storage");
const { checkAuth } = require("../lib/auth");

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }
  if (!checkAuth(req)) {
    res.status(401).json({ error: "senha inválida" });
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
    const url = await uploadImage(buffer, safeName, contentType);
    res.status(201).json({ url });
  } catch (err) {
    res.status(500).json({ error: "Falha no upload", detail: String(err) });
  }
}

handler.config = { api: { bodyParser: { sizeLimit: "15mb" } } };

module.exports = handler;
