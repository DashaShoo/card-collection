const profileService = require("../services/profileService");
const logger = require("../config/logger");

const getStats = async (req, res) => {
  try {
    const stats = await profileService.getProfileStats(req.session.userId);
    res.json(stats);
  } catch (err) {
    logger.error({ event: "profile_stats_error", error: err.message });
    res.status(500).json({ error: "Failed to get profile stats" });
  }
};

module.exports = { getStats };
