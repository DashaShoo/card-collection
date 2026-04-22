const express = require("express");
const cors = require("cors");
const config = require("./config/config");
const initDb = require("./initDb");
const { sessionMiddleware } = require("./config/session");

initDb();

const cardRoutes = require("./routes/cardRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для логирования
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Session middleware - важен для хранения сессий в Redis
app.use(sessionMiddleware);

// Middleware для добавления информации о сервере в response
app.use((req, res, next) => {
  res.set("X-Server-Instance", process.env.SERVER_INSTANCE || "unknown");
  res.set("X-App-Version", process.env.APP_VERSION || "dev");
  next();
});

// Endpoint для демонстрации сессий
app.post("/auth/login", (req, res) => {
  // Сохраняем пользователя в сессию (в Redis)
  req.session.userId = req.body.userId || "demo-user-" + Date.now();
  req.session.loginTime = new Date();

  res.json({
    message: "Logged in successfully",
    sessionId: req.sessionID,
    userId: req.session.userId,
  });
});

// Endpoint для проверки сессии
app.get("/auth/profile", (req, res) => {
  if (req.session.userId) {
    res.json({
      userId: req.session.userId,
      loginTime: req.session.loginTime,
      sessionId: req.sessionID,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Endpoint для выхода
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
    } else {
      res.json({ message: "Logged out successfully" });
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.environment,
    instanceId: process.env.SERVER_INSTANCE || "unknown",
  });
});

// Status endpoint (для load testing)
app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    instanceId: process.env.SERVER_INSTANCE || "unknown",
    pid: process.pid,
  });
});

app.use("/cards", cardRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Card Collector API работает",
    version: process.env.APP_VERSION || "dev",
    instance: process.env.SERVER_INSTANCE || "unknown",
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

const PORT = config.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Environment: ${config.environment}`);
  console.log(`Instance: ${process.env.SERVER_INSTANCE || "unknown"}`);
  console.log(`Available routes:`);
  console.log(`  GET    /cards`);
  console.log(`  POST   /cards`);
  console.log(`  POST   /auth/login`);
  console.log(`  GET    /auth/profile`);
  console.log(`  POST   /auth/logout`);
  console.log(`  GET    /health`);
  console.log(`  GET    /status`);
  console.log(`  GET    /`);
});

console.log("App version:", process.env.APP_VERSION || "dev");
