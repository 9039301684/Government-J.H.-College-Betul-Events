
const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const requiredProductionSettings = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingProductionSettings = isProduction
  ? requiredProductionSettings.filter((key) => !process.env[key])
  : [];

if (missingProductionSettings.length) {
  throw new Error(`Missing required production database settings: ${missingProductionSettings.join(", ")}`);
}

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "jhcollege_events_test",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = pool;