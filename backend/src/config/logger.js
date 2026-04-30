const pino = require("pino");

// Конфигурация логгера для структурного логирования в JSON
// Вывод осуществляется в stdout по умолчанию
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "card-collection-api",
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "dev",
    instanceId: process.env.SERVER_INSTANCE || "unknown",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
