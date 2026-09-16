function checkAuth(req) {
  const required = process.env.PANEL_PASSWORD;
  if (!required) return true; // sem senha configurada, mantém aberto (compatibilidade)
  const got = req.headers["x-panel-password"];
  return got === required;
}

module.exports = { checkAuth };
