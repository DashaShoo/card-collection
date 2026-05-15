const dailyCardService = require("../services/dailyCardService");
const logger = require("../config/logger");

const getStatus = async (req, res) => {
  try {
    const status = await dailyCardService.getDailyStatus(req.session.userId);
    res.json(status);
  } catch (err) {
    logger.error({ event: "daily_status_error", error: err.message });
    res.status(500).json({ error: "Failed to get daily status" });
  }
};

const claim = async (req, res) => {
  try {
    const result = await dailyCardService.claimDailyCard(req.session.userId);
    if (!result.success) {
      return res.status(429).json({
        error: "Already claimed today",
        nextClaimAt: result.nextClaimAt,
      });
    }
    logger.info({ event: "daily_card_claimed", userId: req.session.userId });
    res.json(result);
  } catch (err) {
    logger.error({ event: "daily_claim_error", error: err.message });
    res.status(500).json({ error: "Failed to claim card" });
  }
};

module.exports = { getStatus, claim };
