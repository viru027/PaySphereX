/**
 * PaySphereX — Leave Controller
 * ===============================
 * applyLeave, reviewLeave, getLeaveRequests,
 * getLeaveBalance, getLeaveTypes, cancelLeave
 */

const db     = require("../db/pool");
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");

// ── APPLY LEAVE ────────────────────────────────────────
exports.applyLeave = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const {
      leave_type_id,
      start_date,
      end_date,
      half_day = false,
      half_day_period,
      reason,
    } = req.body;

    const employeeId = req.user.id;

    // Calculate working days between dates (exclude weekends + holidays)
    const { rows: [dayCount] } = await client.query(
      `SELECT COUNT(*) AS total_days
       FROM generate_series($1::date, $2::date, '1 day') AS d(dt)
       WHERE EXTRACT(DOW FROM dt) NOT IN (0, 6)
         AND dt NOT IN (SELECT date FROM holidays WHERE type = 'public')`,
      [start_date, end_date]
    );

    let totalDays = half_day ? 0.5 : parseFloat(dayCount.total_days);

    if (totalDays <= 0) throw new AppError("No working days in selected range", 400);

    // Check leave balance
    const year = new Date(start_date).getFullYear();
    const { rows: [balance] } = await client.query(
      `SELECT lb.*, lt.name AS leave_type_name, lt.is_paid
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.employee_id = $1 AND lb.leave_type_id = $2 AND lb.year = $3`,
      [employeeId, leave_type_id, year]
    );

    if (!balance) throw new AppError("Leave balance not found for this year", 400);
    if (balance.balance < totalDays) {
      throw new AppError(
        `Insufficient ${balance.leave_type_name} balance. Available: ${balance.balance} days`,
        400
      );
    }

    // Check for overlapping leaves
    const { rows: overlap } = await client.query(
      `SELECT id FROM leave_requests
       WHERE employee_id = $1
         AND status IN ('pending','approved')
         AND NOT (end_date < $2 OR start_date > $3)`,
      [employeeId, start_date, end_date]
    );
    if (overlap.length) throw new AppError("Overlapping leave request already exists", 409);

    // Create request
    const { rows: [leave] } = await client.query(
      `INSERT INTO leave_requests
         (employee_id, leave_type_id, start_date, end_date, total_days,
          half_day, half_day_period, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING *`,
      [employeeId, leave_type_id, start_date, end_date, totalDays,
       half_day, half_day_period, reason]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: { ...leave, total_days: totalDays },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// ── REVIEW LEAVE (approve / reject) ──────────────────
exports.reviewLeave = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status, review_comment } = req.body;

    if (!["approved","rejected"].includes(status)) {
      throw new AppError("Status must be 'approved' or 'rejected'", 400);
    }

    const { rows: [leave] } = await client.query(
      "SELECT * FROM leave_requests WHERE id = $1",
      [id]
    );
    if (!leave) throw new AppError("Leave request not found", 404);
    if (leave.status !== "pending") {
      throw new AppError(`Cannot review a leave that is already ${leave.status}`, 400);
    }

    // Update leave request
    const { rows: [updated] } = await client.query(
      `UPDATE leave_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_comment = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, review_comment, id]
    );

    // If approved → deduct from balance
    if (status === "approved") {
      const year = new Date(leave.start_date).getFullYear();
      const { rowCount } = await client.query(
        `UPDATE leave_balances
         SET used = used + $1, updated_at = NOW()
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leave.total_days, leave.employee_id, leave.leave_type_id, year]
      );
      if (!rowCount) throw new AppError("Failed to update leave balance", 500);

      // Mark attendance as on_leave for each approved day
      await client.query(
        `INSERT INTO attendance (employee_id, date, status)
         SELECT $1, dt, 'on_leave'
         FROM generate_series($2::date, $3::date, '1 day') AS d(dt)
         WHERE EXTRACT(DOW FROM dt) NOT IN (0,6)
         ON CONFLICT (employee_id, date) DO UPDATE SET status = 'on_leave'`,
        [leave.employee_id, leave.start_date, leave.end_date]
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Leave ${status} successfully`,
      data:    updated,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// ── GET LEAVE REQUESTS ─────────────────────────────────
exports.getLeaveRequests = async (req, res, next) => {
  try {
    const { status, employee_id, leave_type_id, start_date, end_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where  = ["1=1"];
    let params = [];
    let pIdx   = 1;

    // Role-based filtering
    if (req.user.role === "employee") {
      where.push(`lr.employee_id = $${pIdx++}`);
      params.push(req.user.id);
    } else if (employee_id) {
      where.push(`lr.employee_id = $${pIdx++}`);
      params.push(employee_id);
    }

    if (status)        { where.push(`lr.status = $${pIdx++}`);          params.push(status); }
    if (leave_type_id) { where.push(`lr.leave_type_id = $${pIdx++}`);   params.push(leave_type_id); }
    if (start_date)    { where.push(`lr.start_date >= $${pIdx++}`);     params.push(start_date); }
    if (end_date)      { where.push(`lr.end_date   <= $${pIdx++}`);     params.push(end_date); }

    const whereClause = where.join(" AND ");

    const { rows } = await db.query(
      `SELECT lr.*,
              e.first_name || ' ' || e.last_name AS employee_name,
              e.employee_code,
              d.name        AS department,
              lt.name       AS leave_type_name,
              lt.code       AS leave_code,
              lt.color_code,
              r.first_name  || ' ' || r.last_name AS reviewed_by_name
       FROM leave_requests lr
       JOIN employees    e  ON lr.employee_id   = e.id
       JOIN leave_types  lt ON lr.leave_type_id = lt.id
       LEFT JOIN departments d ON e.department_id  = d.id
       LEFT JOIN employees   r ON lr.reviewed_by   = r.id
       WHERE ${whereClause}
       ORDER BY lr.applied_on DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM leave_requests lr WHERE ${whereClause}`,
      params
    );

    return res.json({
      success: true,
      data:    rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET LEAVE BALANCE ──────────────────────────────────
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const empId = req.params.employeeId || req.user.id;
    const year  = req.query.year || new Date().getFullYear();

    if (req.user.role === "employee" && empId !== req.user.id) {
      throw new AppError("Access denied", 403);
    }

    const { rows } = await db.query(
      `SELECT lb.*, lt.name AS leave_type_name, lt.code AS leave_code,
              lt.color_code, lt.is_paid, lt.annual_quota
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.employee_id = $1 AND lb.year = $2
       ORDER BY lt.id`,
      [empId, year]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── GET LEAVE TYPES ────────────────────────────────────
exports.getLeaveTypes = async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT * FROM leave_types ORDER BY id");
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── CANCEL LEAVE ───────────────────────────────────────
exports.cancelLeave = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { id } = req.params;

    const { rows: [leave] } = await client.query(
      "SELECT * FROM leave_requests WHERE id = $1",
      [id]
    );
    if (!leave) throw new AppError("Leave request not found", 404);
    if (leave.employee_id !== req.user.id && !["admin","hr","manager"].includes(req.user.role)) {
      throw new AppError("Access denied", 403);
    }
    if (!["pending","approved"].includes(leave.status)) {
      throw new AppError("Cannot cancel this leave", 400);
    }
    if (leave.status === "approved" && new Date(leave.start_date) <= new Date()) {
      throw new AppError("Cannot cancel a leave that has already started", 400);
    }

    await client.query(
      "UPDATE leave_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Restore balance if was approved
    if (leave.status === "approved") {
      const year = new Date(leave.start_date).getFullYear();
      await client.query(
        `UPDATE leave_balances SET used = GREATEST(0, used - $1), updated_at = NOW()
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leave.total_days, leave.employee_id, leave.leave_type_id, year]
      );
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: "Leave cancelled successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// ── LEAVE SUMMARY (dashboard) ──────────────────────────
exports.getLeaveSummary = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), department_id } = req.query;
    let deptFilter = "";
    const params   = [year];
    if (department_id) { deptFilter = "AND e.department_id = $2"; params.push(department_id); }

    const { rows } = await db.query(
      `SELECT
          lt.name    AS leave_type,
          lt.code,
          lt.color_code,
          COUNT(lr.id) FILTER (WHERE lr.status = 'approved') AS approved_count,
          COUNT(lr.id) FILTER (WHERE lr.status = 'pending')  AS pending_count,
          COUNT(lr.id) FILTER (WHERE lr.status = 'rejected') AS rejected_count,
          COALESCE(SUM(lr.total_days) FILTER (WHERE lr.status = 'approved'), 0) AS total_days_taken
       FROM leave_types lt
       LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id
         AND EXTRACT(YEAR FROM lr.start_date) = $1
       LEFT JOIN employees e ON lr.employee_id = e.id ${deptFilter}
       GROUP BY lt.id, lt.name, lt.code, lt.color_code
       ORDER BY total_days_taken DESC`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
