/**
 * PaySphereX — Attendance Controller
 */
const db  = require("../db/pool");
const { AppError } = require("../utils/AppError");

// ── CHECK IN ───────────────────────────────────────────
exports.checkIn = async (req, res, next) => {
  try {
    const { location = "office", notes } = req.body;
    const today = new Date().toISOString().split("T")[0];

    // Check if already checked in today
    const { rows: [existing] } = await db.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2",
      [req.user.id, today]
    );
    if (existing?.check_in) throw new AppError("Already checked in today", 400);

    const { rows: [att] } = await db.query(
      `INSERT INTO attendance (employee_id, date, check_in, status, location, notes)
       VALUES ($1, $2, NOW(), 'present', $3, $4)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET check_in = NOW(), status = 'present', location = $3, updated_at = NOW()
       RETURNING *`,
      [req.user.id, today, location, notes]
    );

    return res.status(201).json({
      success: true,
      message: "Checked in successfully",
      data: att,
    });
  } catch (err) {
    next(err);
  }
};

// ── CHECK OUT ──────────────────────────────────────────
exports.checkOut = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { notes } = req.body;

    const { rows: [existing] } = await db.query(
      "SELECT * FROM attendance WHERE employee_id = $1 AND date = $2",
      [req.user.id, today]
    );
    if (!existing?.check_in) throw new AppError("No check-in found for today", 400);
    if (existing?.check_out)  throw new AppError("Already checked out today", 400);

    // Calculate overtime (standard hours = 9)
    const workSecs     = (new Date() - new Date(existing.check_in)) / 1000;
    const workHours    = workSecs / 3600;
    const overtimeHrs  = Math.max(0, workHours - 9).toFixed(2);

    const { rows: [att] } = await db.query(
      `UPDATE attendance
       SET check_out = NOW(), overtime_hours = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE employee_id = $3 AND date = $4
       RETURNING *`,
      [overtimeHrs, notes, req.user.id, today]
    );

    return res.json({
      success: true,
      message: "Checked out successfully",
      data: { ...att, work_hours: workHours.toFixed(2) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET ATTENDANCE ─────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
  try {
    const { employee_id, start_date, end_date, status, page = 1, limit = 31 } = req.query;
    const offset = (page - 1) * limit;
    const empId  = req.user.role === "employee" ? req.user.id : (employee_id || req.user.id);

    let where  = ["a.employee_id = $1"];
    let params = [empId];
    let pIdx   = 2;

    if (start_date) { where.push(`a.date >= $${pIdx++}`); params.push(start_date); }
    if (end_date)   { where.push(`a.date <= $${pIdx++}`); params.push(end_date); }
    if (status)     { where.push(`a.status = $${pIdx++}`); params.push(status); }

    const { rows } = await db.query(
      `SELECT a.*, e.first_name || ' ' || e.last_name AS employee_name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE ${where.join(" AND ")}
       ORDER BY a.date DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── ATTENDANCE SUMMARY (monthly) ───────────────────────
exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { employee_id, month, year } = req.query;
    const empId = req.user.role === "employee" ? req.user.id : (employee_id || req.user.id);
    const m     = month || new Date().getMonth() + 1;
    const y     = year  || new Date().getFullYear();

    const { rows: [summary] } = await db.query(
      `SELECT
          COUNT(*) FILTER (WHERE status = 'present')          AS days_present,
          COUNT(*) FILTER (WHERE status = 'absent')           AS days_absent,
          COUNT(*) FILTER (WHERE status = 'on_leave')         AS days_on_leave,
          COUNT(*) FILTER (WHERE status = 'half_day')         AS days_half_day,
          COUNT(*) FILTER (WHERE status = 'work_from_home')   AS days_wfh,
          ROUND(AVG(work_hours) FILTER (WHERE status = 'present'), 2) AS avg_work_hours,
          COALESCE(SUM(overtime_hours), 0)                    AS total_overtime,
          COUNT(*) FILTER (WHERE is_late = TRUE)              AS late_arrivals
       FROM (
         SELECT *, check_in IS NOT NULL AND EXTRACT(HOUR FROM check_in) >= 10 AS is_late
         FROM attendance
         WHERE employee_id = $1
           AND EXTRACT(YEAR  FROM date) = $2
           AND EXTRACT(MONTH FROM date) = $3
       ) sub`,
      [empId, y, m]
    );

    return res.json({ success: true, data: { ...summary, employee_id: empId, month: m, year: y } });
  } catch (err) {
    next(err);
  }
};

// ── BULK ATTENDANCE (admin) ─────────────────────────────
exports.bulkAttendance = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { date, records } = req.body; // records: [{employee_id, status, check_in, check_out}]

    for (const rec of records) {
      await client.query(
        `INSERT INTO attendance (employee_id, date, check_in, check_out, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (employee_id, date)
         DO UPDATE SET check_in = $3, check_out = $4, status = $5, is_regularized = TRUE, updated_at = NOW()`,
        [rec.employee_id, date, rec.check_in, rec.check_out, rec.status]
      );
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: `${records.length} attendance records updated` });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
