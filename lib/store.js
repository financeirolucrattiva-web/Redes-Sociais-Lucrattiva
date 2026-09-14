const { put, list, del } = require("@vercel/blob");

const PREFIX = "data/posts/";

function pathFor(id) {
  return `${PREFIX}${id}.json`;
}

async function findBlob(id) {
  const { blobs } = await list({ prefix: pathFor(id) });
  return blobs[0] || null;
}

async function getPost(id) {
  const blob = await findBlob(id);
  if (!blob) return null;
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function listPosts() {
  const { blobs } = await list({ prefix: PREFIX });
  const posts = await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        return res.ok ? res.json() : null;
      } catch {
        return null;
      }
    })
  );
  return posts.filter(Boolean).sort((a, b) => {
    const ka = `${a.date || ""} ${a.time || ""}`;
    const kb = `${b.date || ""} ${b.time || ""}`;
    return kb.localeCompare(ka);
  });
}

async function savePost(post) {
  await put(pathFor(post.id), JSON.stringify(post), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return post;
}

async function deletePost(id) {
  const blob = await findBlob(id);
  if (blob) await del(blob.url);
}

module.exports = { listPosts, getPost, savePost, deletePost };
