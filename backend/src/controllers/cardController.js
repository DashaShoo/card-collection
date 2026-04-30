const cardService = require("../services/cardService");
const logger = require("../config/logger");

exports.getAllCards = async (req, res) => {
  try {
    logger.info({
      requestId: req.id,
      event: "fetching_all_cards",
      endpoint: "GET /cards",
    });

    const cards = await cardService.getCards();

    logger.info({
      requestId: req.id,
      event: "cards_fetched",
      cardCount: cards.length,
    });

    res.json(cards);
  } catch (error) {
    logger.error({
      requestId: req.id,
      event: "fetch_cards_error",
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ error: error.message });
  }
};

exports.createCard = async (req, res) => {
  try {
    const { title, rarity } = req.body;

    logger.info({
      requestId: req.id,
      event: "creating_card",
      title,
      rarity,
    });

    if (!title || !rarity) {
      logger.warn({
        requestId: req.id,
        event: "card_creation_validation_error",
        message: "Missing required fields",
        received: { title, rarity },
      });

      return res.status(400).json({
        error: "Missing required fields",
        required: ["title", "rarity"],
        received: { title, rarity },
      });
    }

    const card = await cardService.createCard(title, rarity);

    logger.info({
      requestId: req.id,
      event: "card_created",
      cardId: card.id,
      title: card.title,
      rarity: card.rarity,
    });

    res.status(201).json(card);
  } catch (error) {
    logger.error({
      requestId: req.id,
      event: "create_card_error",
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ error: error.message });
  }
};
