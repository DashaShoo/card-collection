const pool = require("../config/db");

async function getProfileStats(userId) {
  const { rows: userRows } = await pool.query(
    "SELECT username, email, created_at FROM users WHERE id = $1",
    [userId]
  );
  const user = userRows[0];

  const { rows: totalRows } = await pool.query(
    "SELECT COALESCE(SUM(count), 0) AS total FROM user_cards WHERE user_id = $1",
    [userId]
  );

  const { rows: uniqueRows } = await pool.query(
    "SELECT COUNT(*) AS unique_count FROM user_cards WHERE user_id = $1",
    [userId]
  );

  const { rows: gameRows } = await pool.query("SELECT COUNT(*) AS total FROM cards");

  const { rows: colRows } = await pool.query("SELECT COUNT(*) AS total FROM collections");

  const { rows: completedRows } = await pool.query(
    `SELECT COUNT(*) AS completed FROM (
      SELECT col.id
      FROM collections col
      WHERE NOT EXISTS (
        SELECT 1 FROM cards c
        WHERE c.collection_id = col.id
        AND NOT EXISTS (
          SELECT 1 FROM user_cards uc
          WHERE uc.card_id = c.id AND uc.user_id = $1
        )
      )
    ) AS completed_collections`,
    [userId]
  );

  return {
    username: user.username,
    email: user.email,
    totalCards: parseInt(totalRows[0].total),
    uniqueCards: parseInt(uniqueRows[0].unique_count),
    totalCardsInGame: parseInt(gameRows[0].total),
    completedCollections: parseInt(completedRows[0].completed),
    totalCollections: parseInt(colRows[0].total),
    createdAt: user.created_at,
  };
}

module.exports = { getProfileStats };
