const { getPost, savePost } = require("../../lib/store");

const GRAPH = "https://graph.facebook.com/v21.0";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const IG_BUSINESS_ACCOUNT_ID = process.env.IG_BUSINESS_ACCOUNT_ID;

async function graphPost(path, params) {
  const url = `${GRAPH}/${path}`;
  const body = new URLSearchParams({ ...params, access_token: PAGE_ACCESS_TOKEN });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data;
}

async function waitUntilReady(creationId) {
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}`);
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Falha ao processar mídia no Instagram");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

module.exports = async (req, res) => {
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

    await waitUntilReady(creationId);
    const published = await graphPost(`${IG_BUSINESS_ACCOUNT_ID}/media_publish`, {
      creation_id: creationId,
    });

    post.status = "postado";
    post.instagramMediaId = published.id;
    await savePost(post);

    res.status(200).json({ ok: true, instagram_media_id: published.id });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
