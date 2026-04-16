/**
 * PaySphereX — Express Application Entry Point
 * =============================================
 * Configures middleware, routes, error handling.
 */

require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path      = require("path");

const logger    = require("./utils/logger");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Route imports
const authRoutes        = require("./routes/auth.routes");
const employeeRoutes    = require("./routes/employee.routes");
const payrollRoutes     = require("./routes/payroll.routes");
const leaveRoutes       = require("./routes/leave.routes");
const attendanceRoutes  = require("./routes/attendance.routes");
const analyticsRoutes   = require("./routes/analytics.routes");
const departmentRoutes  = require("./routes/department.routes");

const app  = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// ── Security & Compression ──────────────────────────────
app.use(helmet());
app.use(compression());

// ── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: true,          // ← allows any localhost in dev
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ── Rate Limiting ───────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many auth attempts." },
});

// ── Body Parsers ────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Logging ─────────────────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Static Files (payslip PDFs, uploads) ────────────────
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ── Health Check ────────────────────────────────────────
app.get("/health", (req, res) => res.json({
  status:    "OK",
  service:   "PaySphereX API",
  version:   "1.0.0",
  timestamp: new Date().toISOString(),
}));

// ── API Routes ──────────────────────────────────────────
app.use("/api/v1/auth",       authLimiter,  authRoutes);
app.use("/api/v1/employees",  apiLimiter,   employeeRoutes);
app.use("/api/v1/payroll",    apiLimiter,   payrollRoutes);
app.use("/api/v1/leaves",     apiLimiter,   leaveRoutes);
app.use("/api/v1/attendance", apiLimiter,   attendanceRoutes);
app.use("/api/v1/analytics",  apiLimiter,   analyticsRoutes);
app.use("/api/v1/departments",apiLimiter,   departmentRoutes);

// ── 404 & Error Handlers ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`✅ PaySphereX API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
