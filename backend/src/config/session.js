const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");
const config = require("./config");
const logger = require("./logger");

// Инициализируем Redis клиент с правильным синтаксисом для redis v4+
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: parseInt(config.redis.port) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error({
          event: "redis_reconnection_failed",
          message: "Redis reconnection failed after 10 retries",
          retries,
        });
        return new Error("Redis max retries exceeded");
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: config.redis.password || undefined,
});

// Обработчик ошибок Redis
redisClient.on("error", (err) =>
  logger.error({
    event: "redis_error",
    error: err.message,
  }),
);

redisClient.on("connect", () =>
  logger.info({
    event: "redis_connected",
    message: "Redis connected successfully",
    host: config.redis.host,
    port: config.redis.port,
  }),
);

redisClient.on("ready", () =>
  logger.info({
    event: "redis_ready",
    message: "Redis client ready",
  }),
);

redisClient.on("reconnecting", () =>
  logger.warn({
    event: "redis_reconnecting",
    message: "Redis reconnecting...",
  }),
);

// Подключаемся к Redis (асинхронно, но не ждём явно)
// redisClient
//   .connect()
//   .then(() =>
//     logger.info({
//       event: "redis_connection_established",
//       message: "Redis connection established",
//     }),
//   )
//   .catch((err) =>
//     logger.error({
//       event: "redis_connection_error",
//       error: err.message,
//       stack: err.stack,
//     }),
//   );

// Создаём Redis Store для session
const redisStore = new RedisStore({
  client: redisClient,
  prefix: "session:",
  ttl: config.sessionTTL || 24 * 60 * 60, // 24 часа по умолчанию
});

// Конфигурация session middleware
const sessionMiddleware = session({
  store: redisStore,
  secret: config.jwtSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.environment === "production", // HTTPS only в production
    httpOnly: true,
    maxAge: (config.sessionTTL || 24 * 60 * 60) * 1000, // ms
    sameSite: "lax",
  },
  name: "sessionId", // Имя cookie
});

module.exports = {
  sessionMiddleware,
  redisClient,
};
