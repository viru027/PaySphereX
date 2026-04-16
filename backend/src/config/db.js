/**
 * PaySphereX - PostgreSQL Database Connection Pool
 */
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'paysphere',
  user:     process.env.DB_USER     || 'paysphere_user',
  password: process.env.DB_PASSWORD || 'paysphere_pass',
  max:      20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  logger.error('Unexpected DB client error', err);
});

/**
 * Execute a parameterized query with automatic client release.
 * @param {string} text - SQL query
 * @param {Array}  params - Query parameters
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text.slice(0, 80)}`);
    return result;
  } catch (err) {
    logger.error(`DB query error: ${err.message}`);
    throw err;
  }
};

/**
 * Acquire a client for transactions.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
