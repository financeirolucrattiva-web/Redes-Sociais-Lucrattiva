const { getPost, savePost } = require("../../lib/store");

const GRAPH = "https://graph.facebook.com/v21.0";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;

async function graphPost(path, params) {
  const url = `${GRAPH}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: PAGE_ACCESS_TOKEN });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (data.error) {
    const err = new Error(data.error.message || JSON.stringify(data.error));
    err.code = data.error.code;
    throw err;
  }
  return data;
}

async function publishWithRetry(creationId) {
  for (let i = 0; i < 4; i++) {
    try {
      return await graphPost(`${IG_BUSINESS_ACCOUNT_ID}/media_publish`, { creation_id: creationId });
    } catch (err) {
      // código 9007 = mídia ainda processando, tenta de novo em pouco tempo
      if (err.code === 9007 && i < 3) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }
  if (!PAGE_ACCESS_TOKEN || !IG_BUSINESS_ACCOUNT_ID) {
    res.status(500).json({ error: "PAGE_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID não configurados" });
    return;
  }

  const id = req.query.id || (req.body && req.body.id);
  if (!id) {
    res.status(400).json({ error: "faltou id do post" });
    return;
  }

  try {
    const post = await getPost(id);
    if (!post) {
      res.status(404).json({ error: "post não encontrado" });
      return;
    }
    if (!post.images || !post.images.length) {
      res.status(400).json({ error: "post não tem imagens" });
      return;
    }

    const caption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");
    let creationId;

    if (post.images.length === 1) {
      const media = await graphPost(`${IG_BUSINESS_ACCOUNT_ID}/media`, {
        image_url: post.images[0],
        caption,
      });
      creationId = media.id;
    } else {
      const childIds = [];
      for (const imageUrl of post.images) {
        const child = await graphPost(`${IG_BUSINESS_ACCOUNT_ID}/media`, {
          image_url: imageUrl,
          is_carousel_item: "true",
        });
        childIds.push(child.id);
      }
      const carousel = await graphPost(`${IG_BUSINESS_ACCOUNT_ID}/media`, {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption,
      });
      creationId = carousel.id;
    }

    const published = await publishWithRetry(creationId);

    post.status = "postado";
    post.instagramMediaId = published.id;
    await savePost(post);

    res.status(200).json({ ok: true, instagram_media_id: published.id });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 10 };
