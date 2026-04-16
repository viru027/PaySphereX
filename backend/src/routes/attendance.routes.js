// ============================================================
// src/routes/attendance.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/attendance.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post  ("/check-in",       protect, ctrl.checkIn);
router.post  ("/check-out",      protect, ctrl.checkOut);
router.get   ("/",               protect, ctrl.getAttendance);
router.get   ("/summary",        protect, ctrl.getAttendanceSummary);
router.post  ("/bulk",           protect, authorize("admin","hr"), ctrl.bulkAttendance);

module.exports = router;
