/**
 * PaySphereX — Auth Middleware (JWT verification + RBAC)
 * ======================================================
 * File: src/middleware/auth.middleware.js
 */

const jwt    = require("jsonwebtoken");
const { AppError } = require("../utils/AppError");

/**
 * Verify JWT access token from Authorization: Bearer <token> header.
 */
exports.protect = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new AppError("No token provided", 401);

    const token   = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user      = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return next(new AppError("Token expired", 401));
    if (err.name === "JsonWebTokenError") return next(new AppError("Invalid token", 401));
    next(err);
  }
};

/**
 * Role-based access control.
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Role '${req.user.role}' is not authorized for this action`, 403));
  }
  next();
};
