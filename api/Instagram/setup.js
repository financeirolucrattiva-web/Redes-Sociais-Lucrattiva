const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const GRAPH = "https://graph.facebook.com/v21.0";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderPage(fields) {
  const rows = fields
    .map(
      ([label, value]) => `
    <div style="margin-bottom:16px">
      <label style="display:block;font-weight:bold;margin-bottom:4px">${escapeHtml(label)}</label>
      <div style="display:flex;gap:8px">
        <input readonly value="${escapeHtml(value)}" style="flex:1;font-family:monospace;padding:8px;font-size:13px" onclick="this.select()">
        <button onclick="navigator.clipboard.writeText('${escapeHtml(value).replace(/'/g, "\\'")}');this.textContent='Copiado!'">Copiar</button>
      </div>
    </div>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup Instagram</title></head>
  <body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 16px">
    <h2>Dados pra configurar a publicação automática</h2>
    <p>Clica em "Copiar" em cada campo e manda pro chat.</p>
    ${rows}
  </body></html>`;
}

module.exports = async (req, res) => {
  const shortToken = req.query.user_token;
  if (!shortToken) {
    res.status(400).send("faltou ?user_token=... na URL");
    return;
  }
  if (!APP_ID || !APP_SECRET) {
    res.status(500).send("META_APP_ID / META_APP_SECRET não configurados nas env vars");
    return;
  }

  try {
    const debugRes = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(shortToken)}&access_token=${APP_ID}|${APP_SECRET}`);
    const debugData = await debugRes.json();
    const grantedScopes = (debugData?.data?.scopes || []).join(", ");

    let longToken = shortToken;
    const exchangeUrl = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();
    if (exchangeData.access_token) {
      longToken = exchangeData.access_token;
    }

    const accountsRes = await fetch(`${GRAPH}/me/accounts?access_token=${encodeURIComponent(longToken)}`);
    const accountsData = await accountsRes.json();
    if (!accountsData.data || !accountsData.data.length) {
      res.status(500).send("nenhuma Página encontrada: " + JSON.stringify(accountsData));
      return;
    }

    const page = accountsData.data[0];
    const igRes = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`);
    const igData = await igRes.json();
    const igId = igData.instagram_business_account ? igData.instagram_business_account.id : "";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(
      renderPage([
        ["Permissões concedidas", grantedScopes],
        ["Página", page.name + " (" + page.id + ")"],
        ["PAGE_ACCESS_TOKEN", page.access_token],
        ["IG_BUSINESS_ACCOUNT_ID", igId],
        ["Erro Instagram (se vazio, deu certo)", igData.error ? JSON.stringify(igData.error) : ""],
      ])
    );
  } catch (err) {
    res.status(500).send("Erro: " + String(err));
  }
};
