const { Pool } = require("pg");
const logger   = require("../utils/logger");

// Parse from DATABASE_URL if individual vars aren't set
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      }
    : {
        host:     process.env.DB_HOST     || "localhost",
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || "paysphere_db",
        user:     process.env.DB_USER     || "postgres",
        password: String(process.env.DB_PASSWORD || "1234"),
        ssl:      false,
      }
);

pool.on("connect", () => logger.info("✅ DB connected"));
pool.on("error",   (err) => logger.error("PG error:", err.message));

const query    = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };