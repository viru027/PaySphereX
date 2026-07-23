/**
 * ============================================================
 * AI CONTROLLER — PaySphereX
 * ============================================================
 * Handles HTTP layer: validation, rate limiting state,
 * response shaping, and error normalization.
 * Business logic lives entirely in aiOrchestrator.js.
 * ============================================================
 */

const orchestrator = require("../services/aiOrchestrator");
const logger       = require("../utils/logger");
const { query }    = require("../db/pool");

// ── Per-user rate limiting (in-memory, production: Redis) ─
const rateLimitMap   = new Map();
const RATE_LIMIT_MAX = 20;           // requests per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId) {
  const now    = Date.now();
  const entry  = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const resetIn = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 60000);
    return { allowed: false, remaining: 0, resetInMinutes: resetIn };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// ── Response envelope ─────────────────────────────────────
function successResponse(res, data, meta = {}) {
  return res.json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  });
}

function errorResponse(res, statusCode, message, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
  });
}

// ── Resolve employee UUID from code or UUID ───────────────
async function resolveEmployeeId(identifier) {
  if (!identifier) return null;
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    return identifier;
  }
  // Employee code (e.g. EMP001)
  const result = await query(
    "SELECT id FROM employees WHERE employee_code = $1 AND is_active = TRUE",
    [identifier.toUpperCase()]
  );
  return result.rows[0]?.id || null;
}

// ════════════════════════════════════════════════════════════
// POST /ai/query
// General free-form question against org or department data
// ════════════════════════════════════════════════════════════
async function handleQuery(req, res) {
  const userId  = req.user?.id;
  const { question, department } = req.body;

  // Validation
  if (!question || typeof question !== "string" || question.trim().length < 5) {
    return errorResponse(res, 400, "Question must be at least 5 characters.");
  }
  if (question.length > 500) {
    return errorResponse(res, 400, "Question must be under 500 characters.");
  }

  // Rate limit
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429,
      `AI query limit reached. Resets in ${rateCheck.resetInMinutes} minute(s).`
    );
  }

  const start = Date.now();
  logger.info(`[AI] query from user=${userId} dept=${department || "all"} q="${question.slice(0, 60)}"`);

  try {
    const result = await orchestrator.handleQuery(question.trim(), { department });
    if (result.error) return errorResponse(res, 404, result.error);

    return successResponse(res, result, {
      latency_ms:      Date.now() - start,
      rate_remaining:  rateCheck.remaining,
      cached:          !!result.cached,
    });
  } catch (err) {
    logger.error(`[AI] query error: ${err.message}`);
    return errorResponse(res, 500, "AI analysis failed. Please try again shortly.", err.message);
  }
}

// ════════════════════════════════════════════════════════════
// POST /ai/employee-insight
// Deep analysis for a specific employee
// ════════════════════════════════════════════════════════════
async function employeeInsight(req, res) {
  const userId     = req.user?.id;
  const { employee_id, employee_code, question } = req.body;

  const identifier = employee_id || employee_code;
  if (!identifier) {
    return errorResponse(res, 400, "employee_id or employee_code is required.");
  }

  // Non-admins can only query their own profile
  const isAdmin = ["admin", "hr", "manager"].includes(req.user?.role);
  if (!isAdmin && identifier !== req.user?.employee_code && identifier !== userId) {
    return errorResponse(res, 403, "You can only request AI insights for your own profile.");
  }

  // Rate limit
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, `AI query limit reached. Resets in ${rateCheck.resetInMinutes} minute(s).`);
  }

  const empId = await resolveEmployeeId(identifier);
  if (!empId) return errorResponse(res, 404, "Employee not found.");

  const start = Date.now();
  logger.info(`[AI] employee-insight: emp=${empId} user=${userId}`);

  try {
    const result = await orchestrator.analyzeEmployee(empId, question || null);
    if (result.error) return errorResponse(res, 404, result.error);

    return successResponse(res, result, {
      latency_ms:     Date.now() - start,
      rate_remaining: rateCheck.remaining,
      cached:         !!result.cached,
    });
  } catch (err) {
    logger.error(`[AI] employee-insight error: ${err.message}`);
    return errorResponse(res, 500, "AI analysis failed. Please try again shortly.");
  }
}

// ════════════════════════════════════════════════════════════
// GET /ai/department-summary?department=Engineering
// Department-level risk analysis (admin/hr/manager only)
// ════════════════════════════════════════════════════════════
async function departmentSummary(req, res) {
  const userId     = req.user?.id;
  const { department, question } = req.query;

  // Rate limit
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return errorResponse(res, 429, `AI query limit reached. Resets in ${rateCheck.resetInMinutes} minute(s).`);
  }

  const start = Date.now();
  logger.info(`[AI] dept-summary: dept=${department || "all"} user=${userId}`);

  try {
    const result = await orchestrator.analyzeDepartment(department || null, question || null);
    if (result.error) return errorResponse(res, 404, result.error);

    return successResponse(res, result, {
      latency_ms:     Date.now() - start,
      rate_remaining: rateCheck.remaining,
      cached:         !!result.cached,
    });
  } catch (err) {
    logger.error(`[AI] dept-summary error: ${err.message}`);
    return errorResponse(res, 500, "AI analysis failed. Please try again shortly.");
  }
}

// ════════════════════════════════════════════════════════════
// GET /ai/health
// Service health check + cache stats
// ════════════════════════════════════════════════════════════
async function healthCheck(req, res) {
  const stats = orchestrator.getCacheStats();
  return res.json({
    status:     "operational",
    model:      "claude-sonnet-4-20250514",
    cache:      stats,
    timestamp:  new Date().toISOString(),
  });
}

// ════════════════════════════════════════════════════════════
// POST /ai/cache/invalidate  (admin only)
// ════════════════════════════════════════════════════════════
async function invalidateCache(req, res) {
  const { scope } = req.body;
  orchestrator.invalidateCache(scope || "all");
  logger.info(`[AI] cache invalidated scope=${scope || "all"} by user=${req.user?.id}`);
  return res.json({ success: true, message: `Cache invalidated (scope: ${scope || "all"})` });
}

module.exports = {
  handleQuery,
  employeeInsight,
  departmentSummary,
  healthCheck,
  invalidateCache,
};
