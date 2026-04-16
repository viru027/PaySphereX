/**
 * PaySphereX - JWT Authentication Middleware
 */
const jwt = require('jsonwebtoken');
const { error } = require('../utils/helpers');
const logger = require('../utils/logger');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, 'No authorization header', 401);

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7) : authHeader;

  if (!token) return error(res, 'No token provided', 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return error(res, 'Token expired', 401);
    logger.warn(`JWT verification failed: ${err.message}`);
    return error(res, 'Invalid token', 401);
  }
};

module.exports = { authenticate };
