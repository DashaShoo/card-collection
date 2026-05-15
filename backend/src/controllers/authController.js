const authService = require("../services/authService");
const logger = require("../config/logger");

const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await authService.createUser({ username, email, password });
    req.session.userId = user.id;
    logger.info({ event: "user_registered", userId: user.id });
    res.status(201).json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email or username already exists" });
    }
    logger.error({ event: "register_error", error: err.message });
    res.status(500).json({ error: "Registration failed" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await authService.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.userId = user.id;
    logger.info({ event: "user_logged_in", userId: user.id });
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    logger.error({ event: "login_error", error: err.message });
    res.status(500).json({ error: "Login failed" });
  }
};

const logout = async (req, res) => {
  const userId = req.session.userId;
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    logger.info({ event: "user_logged_out", userId });
    res.clearCookie("sessionId");
    res.json({ message: "Logged out successfully" });
  });
};

const me = async (req, res) => {
  try {
    const user = await authService.findUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to get user" });
  }
};

module.exports = { register, login, logout, me };
