// ============================================================
// src/routes/department.routes.js
// ============================================================
const express = require("express");
const router  = express.Router();
const db      = require("../db/pool");
const { protect, authorize } = require("../middleware/auth.middleware");

// GET all departments with headcount
router.get("/", protect, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT d.*,
              COUNT(e.id) AS headcount,
              mgr.first_name || ' ' || mgr.last_name AS manager_name
       FROM departments d
       LEFT JOIN employees e   ON e.department_id = d.id AND e.is_active = TRUE
       LEFT JOIN employees mgr ON d.manager_id = mgr.id
       GROUP BY d.id, mgr.first_name, mgr.last_name
       ORDER BY d.name`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// CREATE department
router.post("/", protect, authorize("admin"), async (req, res, next) => {
  try {
    const { name, code, budget } = req.body;
    const { rows: [dept] } = await db.query(
      "INSERT INTO departments (name, code, budget) VALUES ($1,$2,$3) RETURNING *",
      [name, code, budget]
    );
    res.status(201).json({ success: true, data: dept });
  } catch (err) { next(err); }
});

// UPDATE department
router.put("/:id", protect, authorize("admin","hr"), async (req, res, next) => {
  try {
    const { name, code, budget, manager_id } = req.body;
    const { rows: [dept] } = await db.query(
      `UPDATE departments SET name=$1, code=$2, budget=$3, manager_id=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, code, budget, manager_id, req.params.id]
    );
    res.json({ success: true, data: dept });
  } catch (err) { next(err); }
});

module.exports = router;
