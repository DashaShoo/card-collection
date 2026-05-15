INSERT INTO user_cards (user_id, card_id) 
SELECT 3, id FROM cards WHERE rarity = 'common' LIMIT 2;
SELECT * FROM user_cards WHERE user_id = 3;
