// ============================================================
// src/routes/analytics.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/analytics.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.get("/dashboard",    protect, ctrl.getDashboardKPIs);
router.get("/payroll",      protect, authorize("admin","hr","manager"), ctrl.getPayrollAnalytics);
router.get("/leave",        protect, ctrl.getLeaveAnalytics);
router.get("/attendance",   protect, ctrl.getAttendanceAnalytics);
router.get("/attrition",    protect, authorize("admin","hr"), ctrl.getAttritionPredictions);
router.get("/anomalies",    protect, authorize("admin","hr"), ctrl.getSalaryAnomalies);

module.exports = router;

// ============================================================
// src/routes/department.routes.js
// ============================================================
