// ============================================================
// src/routes/payroll.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/payroll.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.post("/process",                     protect, authorize("admin","hr"), ctrl.processPayroll);
router.get ("/runs",                        protect, authorize("admin","hr"), ctrl.getPayrollRuns);
router.get ("/payslips",                    protect, ctrl.getPayslips);
router.get ("/payslips/:id/pdf",            protect, ctrl.generatePayslipPDF);
router.get ("/salary/:employeeId",          protect, ctrl.getSalaryStructure);
router.put ("/salary/:employee_id",         protect, authorize("admin","hr"), ctrl.updateSalaryStructure);

module.exports = router;
