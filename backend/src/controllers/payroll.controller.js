/**
 * PaySphereX — Payroll Controller
 * ================================
 * processPayroll, getPayslips, generatePayslipPDF,
 * getPayrollRuns, getSalaryStructure, updateSalaryStructure
 */

const db     = require("../db/pool");
const PDFDoc = require("pdfkit");
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");
const path   = require("path");
const fs     = require("fs");

// ── Helper: Calculate payslip figures ─────────────────
const calculatePayslip = (salary, attendance, leaveBalance) => {
  const { base_salary, hra, transport_allowance, medical_allowance,
          special_allowance, pf_employee, pf_employer, esi_employee,
          professional_tax, income_tax_tds } = salary;

  const workingDays  = 26; // standard working days / month
  const daysPresent  = attendance.days_present  || 0;
  const daysPaidLeave= attendance.days_paid_leave || 0;
  const daysAbsent   = attendance.days_absent   || 0;
  const overtimePay  = attendance.overtime_pay  || 0;
  const bonus        = attendance.performance_bonus || 0;

  // Per-day salary for LOP calculation
  const perDaySalary = base_salary / workingDays;
  const lopDays      = Math.max(0, daysAbsent - daysPaidLeave);
  const lopAmount    = lopDays * perDaySalary;

  // Earnings
  const grossSalary = (
    parseFloat(base_salary) +
    parseFloat(hra) +
    parseFloat(transport_allowance) +
    parseFloat(medical_allowance) +
    parseFloat(special_allowance) +
    overtimePay +
    bonus
  ) - lopAmount;

  // Deductions
  const totalDeductions = (
    parseFloat(pf_employee) +
    parseFloat(esi_employee) +
    parseFloat(professional_tax) +
    parseFloat(income_tax_tds)
  );

  const netSalary = grossSalary - totalDeductions;

  return {
    working_days:       workingDays,
    days_present:       daysPresent,
    days_absent:        daysAbsent,
    days_paid_leave:    daysPaidLeave,
    base_salary:        parseFloat(base_salary),
    hra:                parseFloat(hra),
    transport_allowance:parseFloat(transport_allowance),
    medical_allowance:  parseFloat(medical_allowance),
    special_allowance:  parseFloat(special_allowance),
    performance_bonus:  bonus,
    overtime_pay:       overtimePay,
    gross_salary:       Math.max(0, grossSalary).toFixed(2),
    pf_deduction:       parseFloat(pf_employee),
    esi_deduction:      parseFloat(esi_employee),
    professional_tax:   parseFloat(professional_tax),
    income_tax_tds:     parseFloat(income_tax_tds),
    loan_deduction:     0,
    other_deductions:   0,
    total_deductions:   totalDeductions.toFixed(2),
    net_salary:         Math.max(0, netSalary).toFixed(2),
  };
};

// ── PROCESS PAYROLL ───────────────────────────────────
exports.processPayroll = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { pay_period, notes } = req.body;  // e.g., "2025-01"

    // Validate format
    if (!/^\d{4}-\d{2}$/.test(pay_period)) {
      throw new AppError("pay_period must be in YYYY-MM format", 400);
    }

    // Create payroll run
    const { rows: [run] } = await client.query(
      `INSERT INTO payroll_runs (pay_period, status, processed_by, notes)
       VALUES ($1, 'processing', $2, $3)
       RETURNING *`,
      [pay_period, req.user.id, notes]
    );

    // Get all active employees with their salary structures
    const { rows: employees } = await client.query(
      `SELECT e.id AS employee_id,
              e.first_name || ' ' || e.last_name AS full_name,
              e.bank_account,
              s.*
       FROM employees e
       JOIN salary_structures s ON s.employee_id = e.id AND s.is_current = TRUE
       WHERE e.is_active = TRUE`
    );

    // For each employee: calc attendance-based figures
    const [year, month] = pay_period.split("-");
    let totalGross = 0, totalNet = 0, totalDeductions = 0;

    for (const emp of employees) {
      // Attendance summary for pay period
      const { rows: [att] } = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'present')   AS days_present,
          COUNT(*) FILTER (WHERE status = 'absent')    AS days_absent,
          COUNT(*) FILTER (WHERE status = 'on_leave')  AS days_paid_leave,
          COALESCE(SUM(overtime_hours), 0)             AS overtime_hours
         FROM attendance
         WHERE employee_id = $1
           AND EXTRACT(YEAR  FROM date) = $2
           AND EXTRACT(MONTH FROM date) = $3`,
        [emp.employee_id, parseInt(year), parseInt(month)]
      );

      // Bonuses approved for this period
      const { rows: [bon] } = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS bonus
         FROM bonuses
         WHERE employee_id = $1 AND applicable_month = $2 AND status = 'approved'`,
        [emp.employee_id, pay_period]
      );

      const overtimePay    = (att.overtime_hours || 0) * ((emp.base_salary / 26 / 8) * 1.5);
      const attData        = {
        days_present:      parseInt(att.days_present)   || 22,
        days_absent:       parseInt(att.days_absent)    || 0,
        days_paid_leave:   parseInt(att.days_paid_leave)|| 0,
        overtime_pay:      parseFloat(overtimePay.toFixed(2)),
        performance_bonus: parseFloat(bon.bonus),
      };

      const calc = calculatePayslip(emp, attData, null);

      totalGross      += parseFloat(calc.gross_salary);
      totalNet        += parseFloat(calc.net_salary);
      totalDeductions += parseFloat(calc.total_deductions);

      await client.query(
        `INSERT INTO payslips (
           payroll_run_id, employee_id, pay_period,
           working_days, days_present, days_absent, days_paid_leave,
           base_salary, hra, transport_allowance, medical_allowance, special_allowance,
           performance_bonus, overtime_pay, other_earnings,
           gross_salary, pf_deduction, esi_deduction, professional_tax,
           income_tax_tds, loan_deduction, other_deductions, total_deductions,
           net_salary, payment_status, bank_account
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
         )
         ON CONFLICT (payroll_run_id, employee_id) DO NOTHING`,
        [
          run.id, emp.employee_id, pay_period,
          calc.working_days, calc.days_present, calc.days_absent, calc.days_paid_leave,
          calc.base_salary, calc.hra, calc.transport_allowance, calc.medical_allowance, calc.special_allowance,
          calc.performance_bonus, calc.overtime_pay, 0,
          calc.gross_salary, calc.pf_deduction, calc.esi_deduction, calc.professional_tax,
          calc.income_tax_tds, calc.loan_deduction, calc.other_deductions, calc.total_deductions,
          calc.net_salary, "pending", emp.bank_account,
        ]
      );
    }

    // Mark run completed
    await client.query(
      `UPDATE payroll_runs
       SET status = 'completed', total_gross = $1, total_net = $2, total_deductions = $3, updated_at = NOW()
       WHERE id = $4`,
      [totalGross.toFixed(2), totalNet.toFixed(2), totalDeductions.toFixed(2), run.id]
    );

    await client.query("COMMIT");

    // Audit
    await db.query(
      "INSERT INTO audit_logs (actor_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)",
      [req.user.id, "PROCESS_PAYROLL", "payroll_runs", run.id]
    );

    return res.status(201).json({
      success: true,
      message: `Payroll for ${pay_period} processed successfully for ${employees.length} employees`,
      data: {
        runId:         run.id,
        payPeriod:     pay_period,
        totalEmployees:employees.length,
        totalGross:    totalGross.toFixed(2),
        totalNet:      totalNet.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// ── GET PAYSLIPS ──────────────────────────────────────
exports.getPayslips = async (req, res, next) => {
  try {
    const { pay_period, employee_id, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where    = ["1=1"];
    let params   = [];
    let pIdx     = 1;

    // Employees can only see their own payslips
    if (req.user.role === "employee") {
      where.push(`ps.employee_id = $${pIdx++}`);
      params.push(req.user.id);
    } else if (employee_id) {
      where.push(`ps.employee_id = $${pIdx++}`);
      params.push(employee_id);
    }

    if (pay_period) { where.push(`ps.pay_period = $${pIdx++}`); params.push(pay_period); }
    if (status)     { where.push(`ps.payment_status = $${pIdx++}`); params.push(status); }

    const whereClause = where.join(" AND ");

    const { rows: payslips } = await db.query(
      `SELECT ps.*,
              e.first_name || ' ' || e.last_name AS employee_name,
              e.employee_code,
              d.name AS department
       FROM payslips ps
       JOIN employees   e ON ps.employee_id   = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ${whereClause}
       ORDER BY ps.pay_period DESC, e.first_name
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM payslips ps WHERE ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      data:    payslips,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GENERATE PAYSLIP PDF ──────────────────────────────
exports.generatePayslipPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT ps.*,
              e.first_name || ' ' || e.last_name AS employee_name,
              e.employee_code, e.email, e.phone, e.job_title,
              d.name AS department,
              e.bank_account
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ps.id = $1`,
      [id]
    );

    if (!rows.length) throw new AppError("Payslip not found", 404);
    const ps = rows[0];

    // Access control
    if (req.user.role === "employee" && ps.employee_id !== req.user.id) {
      throw new AppError("Access denied", 403);
    }

    // Generate PDF
    const doc = new PDFDoc({ margin: 50, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="payslip_${ps.employee_code}_${ps.pay_period}.pdf"`);
    doc.pipe(res);

    // ── PDF Layout ──────────────────────────────────
    // Header
    doc.rect(0, 0, doc.page.width, 90).fill("#1E293B");
    doc.fillColor("#FFFFFF")
       .fontSize(22).font("Helvetica-Bold")
       .text("PaySphereX", 50, 25);
    doc.fontSize(10).font("Helvetica")
       .text("Payslip — Confidential", 50, 55);
    doc.text(`Pay Period: ${ps.pay_period}`, 400, 30, { align: "right", width: 160 });
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 400, 50, { align: "right", width: 160 });

    doc.fillColor("#1E293B");
    let y = 110;

    // Employee Info Box
    doc.rect(50, y, 500, 70).stroke("#CBD5E1");
    doc.fontSize(9).font("Helvetica-Bold").text("EMPLOYEE DETAILS", 60, y + 8);
    doc.font("Helvetica").fontSize(9);
    doc.text(`Name: ${ps.employee_name}`,       60, y + 22);
    doc.text(`Employee ID: ${ps.employee_code}`, 60, y + 36);
    doc.text(`Designation: ${ps.job_title || "N/A"}`,       60, y + 50);
    doc.text(`Department: ${ps.department}`,    300, y + 22);
    doc.text(`Pay Period: ${ps.pay_period}`,   300, y + 36);
    doc.text(`Days Present: ${ps.days_present}/${ps.working_days}`, 300, y + 50);
    y += 90;

    // Earnings table
    const drawTableHeader = (label, x, y, w) => {
      doc.rect(x, y, w, 20).fill("#F1F5F9");
      doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(9)
         .text(label, x + 5, y + 5);
    };
    const drawRow = (label, amount, x, y, w, shade) => {
      if (shade) doc.rect(x, y, w, 18).fill("#F8FAFC").stroke();
      doc.fillColor("#374151").font("Helvetica").fontSize(9)
         .text(label,  x + 5,   y + 4)
         .text(`₹ ${parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
               x + w - 100, y + 4);
    };

    // Earnings
    drawTableHeader("EARNINGS", 50, y, 230);
    y += 20;
    const earnings = [
      ["Basic Salary",         ps.base_salary],
      ["HRA",                  ps.hra],
      ["Transport Allowance",  ps.transport_allowance],
      ["Medical Allowance",    ps.medical_allowance],
      ["Special Allowance",    ps.special_allowance],
      ["Performance Bonus",    ps.performance_bonus],
      ["Overtime Pay",         ps.overtime_pay],
    ];
    earnings.forEach(([label, amt], i) => {
      drawRow(label, amt, 50, y, 230, i % 2 === 0);
      y += 18;
    });
    doc.rect(50, y, 230, 20).fill("#DBEAFE");
    doc.fillColor("#1E40AF").font("Helvetica-Bold").fontSize(9)
       .text("Gross Salary", 55, y + 5)
       .text(`₹ ${parseFloat(ps.gross_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
             180, y + 5);
    const earningsEndY = y + 20;

    // Deductions (right column)
    let dy = 110 + 90;
    drawTableHeader("DEDUCTIONS", 300, dy, 250);
    dy += 20;
    const deductions = [
      ["PF (Employee)",    ps.pf_deduction],
      ["ESI",              ps.esi_deduction],
      ["Professional Tax", ps.professional_tax],
      ["Income Tax (TDS)", ps.income_tax_tds],
      ["Loan Deduction",   ps.loan_deduction],
      ["Other Deductions", ps.other_deductions],
    ];
    deductions.forEach(([label, amt], i) => {
      drawRow(label, amt, 300, dy, 250, i % 2 === 0);
      dy += 18;
    });
    doc.rect(300, dy, 250, 20).fill("#FEE2E2");
    doc.fillColor("#DC2626").font("Helvetica-Bold").fontSize(9)
       .text("Total Deductions", 305, dy + 5)
       .text(`₹ ${parseFloat(ps.total_deductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
             430, dy + 5);

    // Net Pay Banner
    const netY = Math.max(earningsEndY, dy + 20) + 15;
    doc.rect(50, netY, 500, 40).fill("#1E293B");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(13)
       .text("NET PAY (Take Home)", 60, netY + 12)
       .text(`₹ ${parseFloat(ps.net_salary).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
             350, netY + 12);

    // Footer
    doc.fillColor("#6B7280").fontSize(8).font("Helvetica")
       .text(
         "This is a computer-generated payslip and does not require a signature.",
         50, netY + 60, { align: "center", width: 500 }
       );

    doc.end();
  } catch (err) {
    next(err);
  }
};

// ── GET PAYROLL RUNS ──────────────────────────────────
exports.getPayrollRuns = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*,
              e.first_name || ' ' || e.last_name AS processed_by_name
       FROM payroll_runs pr
       LEFT JOIN employees e ON pr.processed_by = e.id
       ORDER BY pr.pay_period DESC
       LIMIT 24`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET SALARY STRUCTURE ──────────────────────────────
exports.getSalaryStructure = async (req, res, next) => {
  try {
    const empId = req.params.employeeId || req.user.id;
    if (req.user.role === "employee" && empId !== req.user.id) {
      throw new AppError("Access denied", 403);
    }
    const { rows } = await db.query(
      "SELECT * FROM salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC",
      [empId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── UPDATE SALARY STRUCTURE ───────────────────────────
exports.updateSalaryStructure = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { employee_id } = req.params;
    const fields = req.body;

    // Close existing current structure
    await client.query(
      "UPDATE salary_structures SET is_current = FALSE, effective_to = CURRENT_DATE WHERE employee_id = $1 AND is_current = TRUE",
      [employee_id]
    );

    // Insert new
    const { rows: [ss] } = await client.query(
      `INSERT INTO salary_structures (
         employee_id, effective_from, base_salary, hra, transport_allowance,
         medical_allowance, special_allowance, pf_employee, pf_employer,
         esi_employee, esi_employer, professional_tax, income_tax_tds, is_current
       ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
       RETURNING *`,
      [
        employee_id,
        fields.base_salary, fields.hra, fields.transport_allowance,
        fields.medical_allowance, fields.special_allowance,
        fields.pf_employee, fields.pf_employer,
        fields.esi_employee || 0, fields.esi_employer || 0,
        fields.professional_tax, fields.income_tax_tds,
      ]
    );

    await client.query("COMMIT");
    return res.json({ success: true, message: "Salary structure updated", data: ss });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
