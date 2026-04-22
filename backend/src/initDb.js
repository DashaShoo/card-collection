const pool = require("./config/db");

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      title TEXT,
      rarity TEXT
    );
  `);

  console.log("DB initialized");
}

module.exports = initDb;
