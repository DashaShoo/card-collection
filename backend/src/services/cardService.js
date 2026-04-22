const pool = require("../config/db");

async function getCards() {
  const result = await pool.query("SELECT * FROM cards");
  return result.rows;
}

async function createCard(title, rarity) {
  const result = await pool.query(
    "INSERT INTO cards (title, rarity) VALUES ($1, $2) RETURNING *",
    [title, rarity],
  );

  return result.rows[0];
}

module.exports = {
  getCards,
  createCard,
};
