const { list } = require("@vercel/blob");

const PREFIX = "data/week/";

module.exports = async (req, res) => {
  try {
    const { blobs } = await list({ prefix: PREFIX });
    if (!blobs.length) {
      res.status(200).json(null);
      return;
    }
    blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));
    const latest = blobs[0];
    const data = await (await fetch(latest.url, { cache: "no-store" })).json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
