const db = require("../config/db");

async function getDailyStatus(userId) {
  const { rows } = await db.query(
    "SELECT last_claimed_at FROM daily_claims WHERE user_id = $1",
    [userId]
  );

  if (rows.length === 0) {
    return { canClaim: true, nextClaimAt: null };
  }

  const lastClaimed = new Date(rows[0].last_claimed_at);
  const nextClaim = new Date(lastClaimed.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now >= nextClaim) {
    return { canClaim: true, nextClaimAt: null };
  }

  return { canClaim: false, nextClaimAt: nextClaim.toISOString() };
}

async function claimDailyCard(userId) {
  const status = await getDailyStatus(userId);
  if (!status.canClaim) {
    return { success: false, nextClaimAt: status.nextClaimAt };
  }

  const { rows: allCards } = await db.query("SELECT id, rarity FROM cards");

  const weights = { common: 60, rare: 25, epic: 10, legendary: 5 };
  const cardPool = [];
  for (const card of allCards) {
    const weight = weights[card.rarity] || 10;
    for (let i = 0; i < weight; i++) {
      cardPool.push(card.id);
    }
  }

  const randomCardId = cardPool[Math.floor(Math.random() * cardPool.length)];

  await db.query(
    `INSERT INTO user_cards (user_id, card_id, count, first_obtained_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (user_id, card_id) DO UPDATE SET count = user_cards.count + 1`,
    [userId, randomCardId]
  );

  await db.query(
    `INSERT INTO daily_claims (user_id, last_claimed_at)
     VALUES ($1, NOW())
     ON CONFLICT (user_id) DO UPDATE SET last_claimed_at = NOW()`,
    [userId]
  );

  const { rows } = await db.query(
    `SELECT c.id, c.name, c.rarity, c.image_url, uc.count, uc.first_obtained_at
     FROM cards c
     JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = $1
     WHERE c.id = $2`,
    [userId, randomCardId]
  );

  const card = rows[0];
  return {
    success: true,
    card: {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      imageUrl: card.image_url,
      isOwner: true,
      count: parseInt(card.count),
      firstObtainedAt: card.first_obtained_at,
    },
  };
}

module.exports = { getDailyStatus, claimDailyCard };
