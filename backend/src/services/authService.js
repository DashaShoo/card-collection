const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function createUser({ username, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
    [username, email, passwordHash]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, username, email, created_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = { createUser, findUserByEmail, findUserById, verifyPassword };
