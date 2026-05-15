const collectionService = require("../services/collectionService");
const logger = require("../config/logger");

const getCollections = async (req, res) => {
  try {
    const collections = await collectionService.getAllCollections(req.session.userId);
    res.json({ collections });
  } catch (err) {
    logger.error({ event: "get_collections_error", error: err.message });
    res.status(500).json({ error: "Failed to get collections" });
  }
};

module.exports = { getCollections };
