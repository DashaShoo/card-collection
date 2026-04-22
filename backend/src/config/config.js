function getEnv(key, defaultValue) {
  const value = process.env[key];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value;
}

const config = {
  port: getEnv("PORT", 3000),

  db: {
    host: getEnv("DB_HOST", "localhost"),
    port: getEnv("DB_PORT", 5432),
    name: getEnv("DB_NAME", "cards"),
    user: getEnv("DB_USER", "postgres"),
    password: getEnv("DB_PASSWORD", "postgres"),
  },

  jwtSecret: getEnv("JWT_SECRET", "supersecret"),
};

module.exports = config;
