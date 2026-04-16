/**
 * PaySphereX - Global Error Handling Middleware
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url} → ${err.message}`, err);

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record',
      details: err.detail,
    });
  }

  // PostgreSQL FK violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found',
      details: err.detail,
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
};

module.exports = { errorHandler, notFound };
