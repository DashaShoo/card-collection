const pool = require("../config/db");

async function getAllCollections(userId) {
  const { rows } = await pool.query(
    `SELECT
      col.name AS collection_name,
      c.id,
      c.name,
      c.rarity,
      c.image_url,
      CASE WHEN uc.user_id IS NOT NULL THEN true ELSE false END AS is_owner,
      COALESCE(uc.count, 0) AS count,
      uc.first_obtained_at
    FROM collections col
    JOIN cards c ON c.collection_id = col.id
    LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = $1
    ORDER BY col.id, c.id`,
    [userId]
  );

  const collections = {};
  for (const row of rows) {
    if (!collections[row.collection_name]) {
      collections[row.collection_name] = [];
    }
    collections[row.collection_name].push({
      id: row.id,
      name: row.name,
      rarity: row.rarity,
      imageUrl: row.image_url,
      isOwner: row.is_owner,
      count: parseInt(row.count),
      firstObtainedAt: row.first_obtained_at,
    });
  }
  return collections;
}

module.exports = { getAllCollections };
