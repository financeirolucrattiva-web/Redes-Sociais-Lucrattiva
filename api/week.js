const { getLatestWeek } = require("../lib/store");

module.exports = async (req, res) => {
  try {
    const week = await getLatestWeek();
    res.status(200).json(week);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
