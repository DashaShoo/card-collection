const pool = require("../config/db");
const logger = require("../config/logger");

async function getCards() {
  try {
    const result = await pool.query("SELECT * FROM cards");
    logger.debug({
      event: "database_query",
      query: "SELECT * FROM cards",
      resultCount: result.rows.length,
    });
    return result.rows;
  } catch (error) {
    logger.error({
      event: "database_query_error",
      query: "SELECT * FROM cards",
      error: error.message,
    });
    throw error;
  }
}

async function createCard(title, rarity) {
  try {
    const result = await pool.query(
      "INSERT INTO cards (title, rarity) VALUES ($1, $2) RETURNING *",
      [title, rarity],
    );

    logger.debug({
      event: "database_query",
      query: "INSERT INTO cards",
      cardId: result.rows[0].id,
    });

    return result.rows[0];
  } catch (error) {
    logger.error({
      event: "database_query_error",
      query: "INSERT INTO cards",
      error: error.message,
      params: { title, rarity },
    });
    throw error;
  }
}

module.exports = {
  getCards,
  createCard,
};
