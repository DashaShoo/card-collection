const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const config = require("./config/config");
const logger = require("./config/logger");
const initDb = require("./initDb");
const { sessionMiddleware } = require("./config/session");

initDb();

const authRoutes = require("./routes/authRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const dailyCardRoutes = require("./routes/dailyCardRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    type: "request_received",
  });
  res.on("finish", () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      type: "request_completed",
    });
  });
  next();
});

app.use(sessionMiddleware);

// Serve static files (card images, etc)
app.use(express.static("public"));

app.use((req, res, next) => {
  res.set("X-Server-Instance", process.env.SERVER_INSTANCE || "unknown");
  res.set("X-App-Version", process.env.APP_VERSION || "dev");
  next();
});

app.use("/auth", authRoutes);
app.use("/collections", collectionRoutes);
app.use("/daily", dailyCardRoutes);
app.use("/profile", profileRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.environment,
    instanceId: process.env.SERVER_INSTANCE || "unknown",
  });
});

app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    instanceId: process.env.SERVER_INSTANCE || "unknown",
    pid: process.pid,
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Card Collector API",
    version: process.env.APP_VERSION || "dev",
  });
});

let isShuttingDown = false;

app.use((req, res, next) => {
  if (isShuttingDown) {
    return res
      .status(503)
      .json({
        error: "Service Unavailable",
        message: "Server is shutting down",
      });
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

const PORT = config.port;
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({
    event: "server_started",
    port: PORT,
    environment: config.environment,
    instanceId: process.env.SERVER_INSTANCE || "unknown",
    pid: process.pid,
  });
});

const gracefulShutdown = (signal) => {
  logger.info({ event: "shutdown_signal_received", signal });
  isShuttingDown = true;

  const shutdownTimer = setTimeout(() => {
    logger.error({ event: "shutdown_timeout_exceeded" });
    process.exit(1);
  }, 30000);

  server.close(() => {
    clearTimeout(shutdownTimer);
    const pool = require("./config/db");
    const { redisClient } = require("./config/session");
    Promise.all([
      pool.end().catch(() => {}),
      redisClient.quit().catch(() => {}),
    ])
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({
    event: "uncaught_exception",
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({
    event: "unhandled_rejection",
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

module.exports = app;
