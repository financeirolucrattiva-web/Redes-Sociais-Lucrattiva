const { listPosts, savePost } = require("../../lib/store");
const { checkAuth } = require("../../lib/auth");

function newId() {
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const posts = await listPosts();
      res.status(200).json(posts);
    } catch (err) {
      res.status(500).json({ error: "Falha ao carregar conteúdos", detail: String(err) });
    }
    return;
  }

  if (req.method === "POST") {
    if (!checkAuth(req)) {
      res.status(401).json({ error: "senha inválida" });
      return;
    }
    try {
      const body = req.body || {};
      const post = {
        id: newId(),
        date: body.date || "",
        time: body.time || "",
        network: body.network || "",
        format: body.format || "",
        theme: body.theme || "",
        caption: body.caption || "",
        hashtags: body.hashtags || "",
        notes: body.notes || "",
        images: Array.isArray(body.images) ? body.images : [],
        status: "pendente",
        createdAt: new Date().toISOString(),
      };
      await savePost(post);
      res.status(201).json(post);
    } catch (err) {
      res.status(500).json({ error: "Falha ao salvar", detail: String(err) });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end();
};
