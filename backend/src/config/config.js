function getEnv(key, defaultValue) {
  const value = process.env[key];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value;
}

function getEnvInt(key, defaultValue) {
  const value = getEnv(key, defaultValue);
  return parseInt(value, 10);
}

const config = {
  environment: getEnv("NODE_ENV", "development"),
  port: getEnvInt("PORT", 3000),

  db: {
    host: getEnv("DB_HOST", "localhost"),
    port: getEnvInt("DB_PORT", 5432),
    name: getEnv("DB_NAME", "cards"),
    user: getEnv("DB_USER", "postgres"),
    password: getEnv("DB_PASSWORD", "postgres"),
  },

  redis: {
    host: getEnv("REDIS_HOST", "localhost"),
    port: getEnvInt("REDIS_PORT", 6379),
    password: getEnv("REDIS_PASSWORD", ""),
  },

  jwtSecret: getEnv("JWT_SECRET", "supersecret"),
  sessionTTL: getEnvInt("SESSION_TTL", 24 * 60 * 60), // 24 hours
};

module.exports = config;
