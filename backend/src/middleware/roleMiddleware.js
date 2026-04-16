/**
 * PaySphereX - Role-Based Access Control Middleware
 */
const { error } = require('../utils/helpers');

/**
 * Allow only specified roles.
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return error(res, 'Not authenticated', 401);
  if (!roles.includes(req.user.role))
    return error(res, `Role '${req.user.role}' is not authorized`, 403);
  next();
};

module.exports = { authorize };
