// ============================================================
// src/routes/employee.routes.js  — FIXED
// ============================================================
const express  = require("express");
const router   = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const db       = require("../db/pool");
const bcrypt   = require("bcryptjs");
const { AppError } = require("../utils/AppError");

// GET all employees
router.get("/", protect, authorize("admin","hr","manager"), async (req, res, next) => {
  try {
    const { department_id, is_active, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ["1=1"], params = [], p = 1;

    if (department_id) { where.push(`e.department_id = $${p++}`); params.push(department_id); }
    if (is_active !== undefined) { where.push(`e.is_active = $${p++}`); params.push(is_active === "true"); }
    if (search) {
      where.push(`(e.first_name ILIKE $${p} OR e.last_name ILIKE $${p} OR e.email ILIKE $${p} OR e.employee_code ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }
    const wc = where.join(" AND ");

    const { rows } = await db.query(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email,
              e.phone, e.job_title, e.employment_type, e.date_joined,
              e.is_active, e.profile_photo,
              d.name AS department, r.name AS role
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN roles r ON e.role_id = r.id
       WHERE ${wc}
       ORDER BY e.first_name
       LIMIT $${p} OFFSET $${p+1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM employees e WHERE ${wc}`, params
    );

    res.json({ success: true, data: rows, pagination: { page: +page, limit: +limit, total: +count } });
  } catch (err) { next(err); }
});

// GET single employee — FIXED: explicit column list, no e.*
router.get("/:id", protect, async (req, res, next) => {
  try {
    const empId = req.params.id;

    // Role check: employees can only view their own record
    if (req.user.role === "employee" && empId !== req.user.id) {
      throw new AppError("Access denied", 403);
    }

    const { rows } = await db.query(
      `SELECT
          e.id,
          e.employee_code,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.date_of_birth,
          e.gender,
          e.address,
          e.department_id,
          e.role_id,
          e.job_title,
          e.employment_type,
          e.date_joined,
          e.date_left,
          e.is_active,
          e.profile_photo,
          e.bank_account,
          e.created_at,
          d.name  AS department,
          d.code  AS dept_code,
          r.name  AS role,
          s.base_salary,
          s.hra,
          s.transport_allowance,
          s.medical_allowance,
          s.special_allowance,
          s.pf_employee,
          s.professional_tax,
          s.income_tax_tds
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN  roles r            ON e.role_id       = r.id
       LEFT JOIN salary_structures s
              ON s.employee_id = e.id AND s.is_current = TRUE
       WHERE e.id = $1`,
      [empId]
    );

    if (!rows.length) throw new AppError("Employee not found", 404);

    const emp = rows[0];
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
});

// CREATE employee
router.post("/", protect, authorize("admin","hr"), async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const {
      employee_code, first_name, last_name, email, password,
      phone, date_of_birth, gender, address, department_id,
      role_id = 4, job_title, employment_type = "Full-time", date_joined,
    } = req.body;

    const hash = await bcrypt.hash(password || "Password@123", 12);

    const { rows: [emp] } = await client.query(
      `INSERT INTO employees
         (employee_code, first_name, last_name, email, password_hash,
          phone, date_of_birth, gender, address, department_id,
          role_id, job_title, employment_type, date_joined)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, employee_code, first_name, last_name, email, job_title`,
      [employee_code, first_name, last_name, email, hash,
       phone, date_of_birth || null, gender, address, department_id || null,
       role_id, job_title, employment_type, date_joined || new Date()]
    );

    // Init leave balances for current year
    const year = new Date().getFullYear();
    const { rows: leaveTypes } = await client.query(
      "SELECT id, annual_quota FROM leave_types WHERE annual_quota > 0"
    );
    for (const lt of leaveTypes) {
      await client.query(
        `INSERT INTO leave_balances (employee_id, leave_type_id, year, allotted, used)
         VALUES ($1,$2,$3,$4,0) ON CONFLICT DO NOTHING`,
        [emp.id, lt.id, year, lt.annual_quota]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, message: "Employee created", data: emp });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally { client.release(); }
});

// UPDATE employee
router.put("/:id", protect, authorize("admin","hr"), async (req, res, next) => {
  try {
    const allowed = ["first_name","last_name","phone","gender","address",
                     "department_id","job_title","employment_type","is_active","role_id"];
    const updates = [], params = [];
    let p = 1;
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${p++}`);
        params.push(req.body[field]);
      }
    }
    if (!updates.length) throw new AppError("No valid fields to update", 400);
    params.push(req.params.id);
    const { rows: [emp] } = await db.query(
      `UPDATE employees SET ${updates.join(",")} WHERE id = $${p}
       RETURNING id, employee_code, first_name, last_name, email`,
      params
    );
    if (!emp) throw new AppError("Employee not found", 404);
    res.json({ success: true, data: emp });
  } catch (err) { next(err); }
});

// DEACTIVATE
router.patch("/:id/deactivate", protect, authorize("admin","hr"), async (req, res, next) => {
  try {
    await db.query(
      "UPDATE employees SET is_active = FALSE, date_left = CURRENT_DATE WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true, message: "Employee deactivated" });
  } catch (err) { next(err); }
});

module.exports = router;