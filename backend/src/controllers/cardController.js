const cardService = require("../services/cardService");

exports.getAllCards = async (req, res) => {
  try {
    console.log("GET /cards - fetching all cards");
    const cards = await cardService.getCards();
    res.json(cards);
  } catch (error) {
    console.error("Error in getAllCards:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createCard = async (req, res) => {
  try {
    console.log("POST /cards - request body:", req.body);

    const { title, rarity } = req.body;

    if (!title || !rarity) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["title", "rarity"],
        received: { title, rarity },
      });
    }

    const card = await cardService.createCard(title, rarity);
    console.log("Card created:", card);
    res.status(201).json(card);
  } catch (error) {
    console.error("Error in createCard:", error);
    res.status(500).json({ error: error.message });
  }
};
