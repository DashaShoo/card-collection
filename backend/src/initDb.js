const pool = require("./config/db");
const logger = require("./config/logger");

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        title TEXT,
        rarity TEXT
      );
    `);

    logger.info({
      event: "database_initialized",
      message: "Cards table initialized successfully",
    });
  } catch (error) {
    logger.error({
      event: "database_initialization_error",
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = initDb;
