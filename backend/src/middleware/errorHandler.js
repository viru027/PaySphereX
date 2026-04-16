// ============================================================
// src/middleware/errorHandler.js
// ============================================================
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");

exports.notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

exports.errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Log error
  if (err.statusCode >= 500) {
    logger.error(`${err.statusCode} ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`${err.statusCode} ${err.message}`);
  }

  // Postgres unique violation
  if (err.code === "23505") {
    const field = err.detail?.match(/\((.+?)\)/)?.[1] || "field";
    err = new AppError(`Duplicate value for: ${field}`, 409);
  }

  // Postgres FK violation
  if (err.code === "23503") {
    err = new AppError("Referenced record does not exist", 400);
  }

  const response = {
    success:    false,
    status:     err.status || "error",
    message:    err.message || "Internal Server Error",
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return res.status(err.statusCode).json(response);
};
