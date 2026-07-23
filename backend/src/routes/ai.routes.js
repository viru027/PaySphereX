/**
 * ============================================================
 * AI ROUTES — /api/v1/ai
 * ============================================================
 */

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/ai.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

// All AI routes require authentication
router.use(authenticate);

// ── Public (any authenticated user) ──────────────────────

// Free-form query — can be scoped to a department
// POST /api/v1/ai/query
// Body: { question: string, department?: string }
router.post("/query", controller.handleQuery);

// Employee insight — employees can query own profile, admins any
// POST /api/v1/ai/employee-insight
// Body: { employee_id?: uuid, employee_code?: string, question?: string }
router.post("/employee-insight", controller.employeeInsight);

// ── Admin / HR / Manager only ────────────────────────────

// Department summary with AI narrative
// GET /api/v1/ai/department-summary?department=Engineering&question=...
router.get("/department-summary", authorize("admin", "hr", "manager"), controller.departmentSummary);

// ── Admin only ────────────────────────────────────────────

// Service health + cache stats
// GET /api/v1/ai/health
router.get("/health", authorize("admin"), controller.healthCheck);

// Invalidate AI cache
// POST /api/v1/ai/cache/invalidate
// Body: { scope?: "all" | "dept:Engineering" }
router.post("/cache/invalidate", authorize("admin"), controller.invalidateCache);

module.exports = router;
