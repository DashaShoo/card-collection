const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const config = require("./config/config");
const logger = require("./config/logger");
const initDb = require("./initDb");
const { sessionMiddleware } = require("./config/session");

initDb();

const cardRoutes = require("./routes/cardRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware для добавления X-Request-ID и логирования запросов
app.use((req, res, next) => {
  // Генерируем или берём существующий Request ID
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.id = requestId;

  // Добавляем Request ID в заголовок ответа
  res.setHeader("X-Request-ID", requestId);

  // Логируем входящий запрос
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    type: "request_received",
    query: req.query,
  });

  // Логируем окончание запроса
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
  const userId = req.body.userId || "demo-user-" + Date.now();

  // Сохраняем пользователя в сессию (в Redis)
  req.session.userId = userId;
  req.session.loginTime = new Date();

  logger.info({
    requestId: req.id,
    event: "user_login",
    userId,
    sessionId: req.sessionID,
  });

  res.json({
    message: "Logged in successfully",
    sessionId: req.sessionID,
    userId: req.session.userId,
  });
});

// Endpoint для проверки сессии
app.get("/auth/profile", (req, res) => {
  if (req.session.userId) {
    logger.info({
      requestId: req.id,
      event: "profile_access",
      userId: req.session.userId,
      sessionId: req.sessionID,
    });

    res.json({
      userId: req.session.userId,
      loginTime: req.session.loginTime,
      sessionId: req.sessionID,
    });
  } else {
    logger.warn({
      requestId: req.id,
      event: "unauthorized_profile_access",
      message: "No authenticated session",
    });

    res.status(401).json({ error: "Not authenticated" });
  }
});

// Endpoint для выхода
app.post("/auth/logout", (req, res) => {
  const userId = req.session.userId;

  req.session.destroy((err) => {
    if (err) {
      logger.error({
        requestId: req.id,
        event: "logout_failed",
        error: err.message,
      });
      res.status(500).json({ error: "Failed to logout" });
    } else {
      logger.info({
        requestId: req.id,
        event: "user_logout",
        userId,
      });
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
  logger.info({
    requestId: req.id,
    event: "root_endpoint_accessed",
  });

  res.json({
    message: "Card Collector API работает",
    version: process.env.APP_VERSION || "dev",
    instance: process.env.SERVER_INSTANCE || "unknown",
  });
});

// Middleware для проверки shutdown state
let isShuttingDown = false;

app.use((req, res, next) => {
  if (isShuttingDown) {
    logger.warn({
      requestId: req.id,
      event: "request_rejected_shutting_down",
      message: "Server is shutting down, rejecting new requests",
    });
    res.status(503).json({
      error: "Service Unavailable",
      message: "Server is shutting down",
    });
    return;
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Запуск сервера
const PORT = config.port;
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({
    event: "server_started",
    port: PORT,
    environment: config.environment,
    instanceId: process.env.SERVER_INSTANCE || "unknown",
    routes: [
      "GET    /cards",
      "POST   /cards",
      "POST   /auth/login",
      "GET    /auth/profile",
      "POST   /auth/logout",
      "GET    /health",
      "GET    /status",
      "GET    /",
    ],
    pid: process.pid,
  });
});

// Graceful shutdown: обработка SIGTERM и SIGINT
const gracefulShutdown = (signal) => {
  logger.info({
    event: "shutdown_signal_received",
    signal,
    pid: process.pid,
    uptime: process.uptime(),
  });

  isShuttingDown = true;

  // Закрываем сервер и даём время завершиться текущим запросам
  const shutdownTimeout = 30000; // 30 секунд
  const shutdownTimer = setTimeout(() => {
    logger.error({
      event: "shutdown_timeout_exceeded",
      message: "Forcing shutdown after timeout",
      timeout_ms: shutdownTimeout,
    });
    process.exit(1);
  }, shutdownTimeout);

  server.close(() => {
    logger.info({
      event: "server_closed",
      message: "HTTP server closed, all requests completed",
    });

    clearTimeout(shutdownTimer);

    // Закрываем соединения с БД и Redis
    const pool = require("./config/db");
    const { redisClient } = require("./config/session");

    Promise.all([
      pool.end().catch((err) => {
        logger.error({
          event: "database_connection_close_error",
          error: err.message,
        });
      }),
      redisClient.quit().catch((err) => {
        logger.error({
          event: "redis_connection_close_error",
          error: err.message,
        });
      }),
    ])
      .then(() => {
        logger.info({
          event: "graceful_shutdown_completed",
          message: "All connections closed successfully",
        });
        process.exit(0);
      })
      .catch((err) => {
        logger.error({
          event: "graceful_shutdown_error",
          error: err.message,
        });
        process.exit(1);
      });
  });

  // Если сервер не закрывается с новыми соединениями, форсируем закрытие
  server.on("error", (err) => {
    logger.error({
      event: "server_error_during_shutdown",
      error: err.message,
    });
    process.exit(1);
  });
};

// Слушаем сигналы завершения
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Логируем необработанные ошибки и promise rejections
process.on("uncaughtException", (err) => {
  logger.fatal({
    event: "uncaught_exception",
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({
    event: "unhandled_rejection",
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

module.exports = app;
