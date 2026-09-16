const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const GRAPH = "https://graph.facebook.com/v21.0";

module.exports = async (req, res) => {
  const shortToken = req.query.user_token;
  if (!shortToken) {
    res.status(400).json({ error: "faltou ?user_token=... na URL" });
    return;
  }
  if (!APP_ID || !APP_SECRET) {
    res.status(500).json({ error: "META_APP_ID / META_APP_SECRET não configurados nas env vars" });
    return;
  }

  try {
    const debugRes = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(shortToken)}&access_token=${APP_ID}|${APP_SECRET}`);
    const debugData = await debugRes.json();
    const grantedScopes = debugData?.data?.scopes || debugData;

    let longToken = shortToken;
    const exchangeUrl = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();
    if (exchangeData.access_token) {
      longToken = exchangeData.access_token;
    }
    // se a troca falhar (ex: token de usuário de sistema, que já não expira),
    // segue usando o token original direto

    const accountsRes = await fetch(`${GRAPH}/me/accounts?access_token=${encodeURIComponent(longToken)}`);
    const accountsData = await accountsRes.json();
    if (!accountsData.data || !accountsData.data.length) {
      res.status(500).json({ error: "nenhuma Página encontrada nessa conta", details: accountsData });
      return;
    }

    const results = [];
    for (const page of accountsData.data) {
      const igRes = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`);
      const igData = await igRes.json();
      results.push({
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        instagram_business_account_id: igData.instagram_business_account ? igData.instagram_business_account.id : null,
        raw_ig_response: igData,
      });
    }

    // busca também pelos ativos de Instagram do negócio, caso o vínculo
    // clássico (Página -> Instagram) não apareça acima
    let businessInstagramAccounts = [];
    try {
      const businessIds = req.query.business_id
        ? [req.query.business_id]
        : (await (await fetch(`${GRAPH}/me/businesses?access_token=${encodeURIComponent(longToken)}`)).json()).data?.map((b) => b.id) || [];

      for (const bizId of businessIds) {
        const igAccRes = await fetch(`${GRAPH}/${bizId}/instagram_accounts?access_token=${encodeURIComponent(longToken)}`);
        const igAccData = await igAccRes.json();
        if (igAccData.error) {
          businessInstagramAccounts.push({ business_id: bizId, error: igAccData.error });
          continue;
        }
        for (const acc of igAccData.data || []) {
          businessInstagramAccounts.push({
            business_id: bizId,
            instagram_account_id: acc.id,
            username: acc.username,
          });
        }
      }
    } catch (e) {
      businessInstagramAccounts = [{ error: String(e) }];
    }

    res.status(200).json({ granted_scopes: grantedScopes, pages: results, business_instagram_accounts: businessInstagramAccounts });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
