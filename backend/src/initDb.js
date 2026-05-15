const pool = require("./config/db");
const logger = require("./config/logger");
const bcrypt = require("bcryptjs");

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
        image_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
        count INTEGER DEFAULT 1 NOT NULL,
        first_obtained_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, card_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_claims (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        last_claimed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await seedData();

    logger.info({ event: "database_initialized" });
  } catch (error) {
    logger.error({
      event: "database_initialization_error",
      error: error.message,
    });
    throw error;
  }
}

async function seedData() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM collections");
  if (parseInt(rows[0].count) > 0) return;

  const col1 = await pool.query(
    "INSERT INTO collections (name, description) VALUES ($1, $2) RETURNING id",
    ["Морские существа", "Обитатели морских глубин"],
  );
  const col2 = await pool.query(
    "INSERT INTO collections (name, description) VALUES ($1, $2) RETURNING id",
    ["Архитектура", "Великие архитектурные сооружения"],
  );
  const col3 = await pool.query(
    "INSERT INTO collections (name, description) VALUES ($1, $2) RETURNING id",
    ["Персонажи", "Легендарные персонажи мира"],
  );

  const c1 = col1.rows[0].id;
  const c2 = col2.rows[0].id;
  const c3 = col3.rows[0].id;

  const cardsData = [
    [c1, "Золотая рыбка", "common", "/cards/fish1.svg"],
    [c1, "Морская рыбка", "rare", "/cards/fish2.svg"],
    [c1, "Рыба клоун", "epic", "/cards/fish3.svg"],
    [c2, "Обычный дом", "common", "/cards/house1.svg"],
    [c2, "Большой дом", "epic", "/cards/house2.svg"],
    [c2, "Больница", "rare", "/cards/house3.svg"],
    [c3, "Девочка", "common", "/cards/person1.svg"],
    [c3, "Нарядная девочка", "epic", "/cards/person2.svg"],
    [c3, "Бабушка", "legendary", "/cards/person3.svg"],
  ];

  for (const [colId, name, rarity, imageUrl] of cardsData) {
    await pool.query(
      "INSERT INTO cards (collection_id, name, rarity, image_url) VALUES ($1, $2, $3, $4)",
      [colId, name, rarity, imageUrl],
    );
  }

  const passwordHash = await bcrypt.hash("demo123", 10);

  // Check if user already exists
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    ["demo@example.com"],
  );

  let userId;
  if (existingUser.rows.length === 0) {
    const userResult = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      ["demo", "demo@example.com", passwordHash],
    );
    userId = userResult.rows[0].id;
  } else {
    userId = existingUser.rows[0].id;
  }

  if (userId) {
    const commonCards = await pool.query(
      "SELECT id FROM cards WHERE rarity = 'common' LIMIT 2",
    );
    for (const card of commonCards.rows) {
      const cardExists = await pool.query(
        "SELECT id FROM user_cards WHERE user_id = $1 AND card_id = $2",
        [userId, card.id],
      );
      if (cardExists.rows.length === 0) {
        await pool.query(
          "INSERT INTO user_cards (user_id, card_id) VALUES ($1, $2)",
          [userId, card.id],
        );
      }
    }
  }

  logger.info({ event: "seed_data_created" });
}

module.exports = initDb;
