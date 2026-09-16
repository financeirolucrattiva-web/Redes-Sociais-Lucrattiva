const { getPost, savePost, deletePost } = require("../../lib/store");
const { checkAuth } = require("../../lib/auth");

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === "PATCH") {
    if (!checkAuth(req)) {
      res.status(401).json({ error: "senha inválida" });
      return;
    }
    try {
      const post = await getPost(id);
      if (!post) {
        res.status(404).json({ error: "Não encontrado" });
        return;
      }
      const body = req.body || {};
      if (body.status) post.status = body.status;
      await savePost(post);
      res.status(200).json(post);
    } catch (err) {
      res.status(500).json({ error: "Falha ao atualizar", detail: String(err) });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!checkAuth(req)) {
      res.status(401).json({ error: "senha inválida" });
      return;
    }
    try {
      await deletePost(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: "Falha ao excluir", detail: String(err) });
    }
    return;
  }

  res.setHeader("Allow", "PATCH, DELETE");
  res.status(405).end();
};
