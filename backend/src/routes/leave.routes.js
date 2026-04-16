// ============================================================
// src/routes/leave.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/leave.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post  ("/apply",                       protect, ctrl.applyLeave);
router.patch ("/:id/review",                  protect, authorize("admin","hr","manager"), ctrl.reviewLeave);
router.patch ("/:id/cancel",                  protect, ctrl.cancelLeave);
router.get   ("/",                            protect, ctrl.getLeaveRequests);
router.get   ("/types",                       protect, ctrl.getLeaveTypes);
router.get   ("/summary",                     protect, ctrl.getLeaveSummary);
router.get   ("/balance",                     protect, ctrl.getLeaveBalance);
router.get   ("/balance/:employeeId",         protect, ctrl.getLeaveBalance);

module.exports = router;

// ============================================================
// src/routes/attendance.routes.js  — written inline below
// ============================================================
