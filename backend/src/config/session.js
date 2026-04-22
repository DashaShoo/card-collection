const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");
const config = require("./config");

// Инициализируем Redis клиент с правильным синтаксисом для redis v4+
const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: parseInt(config.redis.port) || 6379,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis reconnection failed after 10 retries");
        return new Error("Redis max retries exceeded");
      }
      return Math.min(retries * 100, 3000);
    },
  },
  password: config.redis.password || undefined,
});

// Обработчик ошибок Redis
redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Redis connected successfully"));
redisClient.on("ready", () => console.log("Redis client ready"));
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));

// Подключаемся к Redis (асинхронно, но не ждём явно)
redisClient
  .connect()
  .then(() => console.log("Redis connection established"))
  .catch((err) => console.error("Failed to connect to Redis:", err));

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
