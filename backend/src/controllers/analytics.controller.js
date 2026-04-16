/**
 * PaySphereX — Analytics Controller
 * ====================================
 * Aggregated data for dashboards + ML prediction calls
 */

const db     = require("../db/pool");
const axios  = require("axios");
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");

const ML_API = process.env.ML_API_URL || "http://localhost:8000";

// ── EXECUTIVE DASHBOARD ────────────────────────────────
exports.getDashboardKPIs = async (req, res, next) => {
  try {
    const today     = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    const [
      headcount,
      payrollThisMonth,
      leaveStats,
      attendanceToday,
      deptBreakdown,
      recentJoiners,
    ] = await Promise.all([
      // Total active headcount
      db.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM employees"),

      // Payroll this month
      db.query(
        `SELECT COALESCE(SUM(gross_salary),0) AS total_gross,
                COALESCE(SUM(net_salary),0)   AS total_net,
                COALESCE(AVG(net_salary),0)   AS avg_net,
                COUNT(*)                       AS payslip_count
         FROM payslips WHERE pay_period = $1`,
        [thisMonth]
      ),

      // Leave today
      db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'pending')  AS pending_requests,
          COUNT(*) FILTER (WHERE status = 'approved' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) AS on_leave_today
         FROM leave_requests`
      ),

      // Attendance today
      db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'present')          AS present,
          COUNT(*) FILTER (WHERE status = 'absent')           AS absent,
          COUNT(*) FILTER (WHERE status = 'work_from_home')   AS wfh
         FROM attendance WHERE date = CURRENT_DATE`
      ),

      // Dept headcount
      db.query(
        `SELECT d.name AS department, d.code,
                COUNT(e.id) AS headcount,
                COALESCE(AVG(s.base_salary), 0) AS avg_base_salary
         FROM departments d
         LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = TRUE
         LEFT JOIN salary_structures s ON s.employee_id = e.id AND s.is_current = TRUE
         GROUP BY d.id, d.name, d.code
         ORDER BY headcount DESC`
      ),

      // Recent joiners (last 90 days)
      db.query(
        `SELECT e.first_name || ' ' || e.last_name AS full_name,
                e.job_title, e.date_joined, d.name AS department
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.date_joined >= CURRENT_DATE - INTERVAL '90 days'
           AND e.is_active = TRUE
         ORDER BY e.date_joined DESC LIMIT 5`
      ),
    ]);

    // Monthly payroll trend (last 6 months)
    const { rows: payrollTrend } = await db.query(
      `SELECT pay_period,
              SUM(gross_salary) AS gross,
              SUM(net_salary)   AS net,
              COUNT(*)          AS employee_count
       FROM payslips
       WHERE pay_period >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM')
       GROUP BY pay_period
       ORDER BY pay_period`
    );

    return res.json({
      success: true,
      data: {
        headcount:      headcount.rows[0],
        payroll:        payrollThisMonth.rows[0],
        leave:          leaveStats.rows[0],
        attendance:     attendanceToday.rows[0],
        departments:    deptBreakdown.rows,
        recentJoiners:  recentJoiners.rows,
        payrollTrend,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PAYROLL ANALYTICS ──────────────────────────────────
exports.getPayrollAnalytics = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [monthly, byDept, salaryDist, bonusDist] = await Promise.all([
      // Monthly trend
      db.query(
        `SELECT pay_period,
                SUM(base_salary)       AS total_base,
                SUM(gross_salary)      AS total_gross,
                SUM(net_salary)        AS total_net,
                SUM(total_deductions)  AS total_deductions,
                SUM(performance_bonus) AS total_bonus,
                SUM(overtime_pay)      AS total_overtime,
                AVG(net_salary)        AS avg_net,
                COUNT(*)               AS employees_paid
         FROM payslips
         WHERE pay_period LIKE $1
         GROUP BY pay_period
         ORDER BY pay_period`,
        [`${year}-%`]
      ),

      // By department
      db.query(
        `SELECT d.name AS department,
                AVG(ps.gross_salary)      AS avg_gross,
                AVG(ps.net_salary)        AS avg_net,
                SUM(ps.gross_salary)      AS total_gross,
                AVG(ps.performance_bonus) AS avg_bonus,
                COUNT(DISTINCT ps.employee_id) AS employee_count
         FROM payslips ps
         JOIN employees e ON ps.employee_id = e.id
         JOIN departments d ON e.department_id = d.id
         WHERE ps.pay_period LIKE $1
         GROUP BY d.id, d.name
         ORDER BY avg_gross DESC`,
        [`${year}-%`]
      ),

      // Salary distribution buckets
      db.query(
        `SELECT
          CASE
            WHEN net_salary < 40000  THEN 'Below 40K'
            WHEN net_salary < 70000  THEN '40K-70K'
            WHEN net_salary < 100000 THEN '70K-100K'
            WHEN net_salary < 150000 THEN '100K-150K'
            ELSE 'Above 150K'
          END AS salary_band,
          COUNT(*) AS count
         FROM payslips
         WHERE pay_period LIKE $1
         GROUP BY salary_band
         ORDER BY MIN(net_salary)`,
        [`${year}-%`]
      ),

      // Bonus analysis
      db.query(
        `SELECT b.bonus_type, SUM(b.amount) AS total_amount, COUNT(*) AS count
         FROM bonuses b WHERE b.status = 'approved'
         GROUP BY b.bonus_type ORDER BY total_amount DESC`
      ),
    ]);

    return res.json({
      success: true,
      data: { monthly: monthly.rows, byDept: byDept.rows, salaryDist: salaryDist.rows, bonusDist: bonusDist.rows },
    });
  } catch (err) {
    next(err);
  }
};

// ── LEAVE ANALYTICS ────────────────────────────────────
exports.getLeaveAnalytics = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [monthly, byType, byDept, topLeaveTakers] = await Promise.all([
      // Monthly leave trend
      db.query(
        `SELECT EXTRACT(MONTH FROM start_date) AS month,
                lt.name AS leave_type,
                COUNT(*) AS requests,
                SUM(total_days) AS total_days
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE EXTRACT(YEAR FROM start_date) = $1 AND lr.status = 'approved'
         GROUP BY month, lt.name
         ORDER BY month, lt.name`,
        [year]
      ),

      // By leave type
      db.query(
        `SELECT lt.name, lt.code, lt.color_code,
                COUNT(*) FILTER (WHERE lr.status='approved') AS approved,
                COUNT(*) FILTER (WHERE lr.status='rejected') AS rejected,
                COUNT(*) FILTER (WHERE lr.status='pending')  AS pending,
                COALESCE(SUM(total_days) FILTER (WHERE lr.status='approved'),0) AS total_days
         FROM leave_types lt
         LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id
           AND EXTRACT(YEAR FROM lr.start_date) = $1
         GROUP BY lt.id, lt.name, lt.code, lt.color_code
         ORDER BY total_days DESC`,
        [year]
      ),

      // By department
      db.query(
        `SELECT d.name AS department,
                COUNT(lr.id) AS requests,
                SUM(lr.total_days) AS total_days,
                AVG(lr.total_days) AS avg_days_per_request
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         JOIN departments d ON e.department_id = d.id
         WHERE EXTRACT(YEAR FROM lr.start_date) = $1 AND lr.status = 'approved'
         GROUP BY d.id, d.name
         ORDER BY total_days DESC`,
        [year]
      ),

      // Top leave takers
      db.query(
        `SELECT e.first_name || ' ' || e.last_name AS employee_name,
                e.employee_code, d.name AS department,
                SUM(lr.total_days) AS total_days_taken,
                COUNT(lr.id) AS requests_count
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE EXTRACT(YEAR FROM lr.start_date) = $1 AND lr.status = 'approved'
         GROUP BY e.id, e.first_name, e.last_name, e.employee_code, d.name
         ORDER BY total_days_taken DESC
         LIMIT 10`,
        [year]
      ),
    ]);

    return res.json({
      success: true,
      data: { monthly: monthly.rows, byType: byType.rows, byDept: byDept.rows, topLeaveTakers: topLeaveTakers.rows },
    });
  } catch (err) {
    next(err);
  }
};

// ── ATTENDANCE ANALYTICS ───────────────────────────────
exports.getAttendanceAnalytics = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year  || new Date().getFullYear();

    const [summary, byDept, dailyTrend, lateArrivals] = await Promise.all([
      db.query(
        `SELECT
          AVG(CASE WHEN status='present' THEN 1 ELSE 0 END) * 100 AS avg_attendance_rate,
          ROUND(AVG(work_hours) FILTER (WHERE status='present'), 2) AS avg_work_hours,
          SUM(overtime_hours) AS total_overtime_hours,
          COUNT(*) FILTER (WHERE status='absent') AS total_absent_instances,
          COUNT(DISTINCT employee_id) AS unique_employees
         FROM attendance
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [y, m]
      ),

      db.query(
        `SELECT d.name AS department,
                COUNT(*) FILTER (WHERE a.status='present') AS present,
                COUNT(*) FILTER (WHERE a.status='absent')  AS absent,
                ROUND(AVG(a.work_hours) FILTER (WHERE a.status='present'), 2) AS avg_hours
         FROM attendance a
         JOIN employees e ON a.employee_id = e.id
         JOIN departments d ON e.department_id = d.id
         WHERE EXTRACT(YEAR FROM a.date) = $1 AND EXTRACT(MONTH FROM a.date) = $2
         GROUP BY d.name ORDER BY present DESC`,
        [y, m]
      ),

      db.query(
        `SELECT date,
                COUNT(*) FILTER (WHERE status='present') AS present_count,
                COUNT(*) FILTER (WHERE status='absent')  AS absent_count,
                ROUND(AVG(work_hours) FILTER (WHERE status='present'), 2) AS avg_hours
         FROM attendance
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
         GROUP BY date ORDER BY date`,
        [y, m]
      ),

      db.query(
        `SELECT e.first_name || ' ' || e.last_name AS employee_name,
                e.employee_code, d.name AS department,
                COUNT(*) AS late_days
         FROM attendance a
         JOIN employees e ON a.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE EXTRACT(YEAR FROM a.date) = $1
           AND EXTRACT(MONTH FROM a.date) = $2
           AND a.check_in IS NOT NULL
           AND EXTRACT(HOUR FROM a.check_in) >= 10
         GROUP BY e.id, e.first_name, e.last_name, e.employee_code, d.name
         HAVING COUNT(*) > 3
         ORDER BY late_days DESC LIMIT 10`,
        [y, m]
      ),
    ]);

    return res.json({
      success: true,
      data: {
        summary:     summary.rows[0],
        byDept:      byDept.rows,
        dailyTrend:  dailyTrend.rows,
        lateArrivals: lateArrivals.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── ML: ATTRITION PREDICTIONS ──────────────────────────
exports.getAttritionPredictions = async (req, res, next) => {
  try {
    // Call Python ML API
    try {
      const { data } = await axios.get(`${ML_API}/predict/attrition`, { timeout: 10000 });
      return res.json({ success: true, source: "ml_model", data: data.predictions });
    } catch (mlErr) {
      logger.warn("ML API unavailable, returning mock predictions");
    }

    // Fallback: rule-based risk scoring from DB
    const { rows } = await db.query(
      `SELECT
          e.id, e.employee_code,
          e.first_name || ' ' || e.last_name AS full_name,
          d.name AS department,
          e.job_title,
          DATE_PART('year', AGE(NOW(), e.date_joined)) AS years_of_service,
          COALESCE(SUM(a.overtime_hours), 0)           AS total_overtime,
          COUNT(a.id) FILTER (WHERE a.status='absent') AS absent_days,
          COUNT(lr.id) FILTER (WHERE lr.status='approved') AS approved_leaves
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN attendance a  ON a.employee_id = e.id
         AND a.date >= CURRENT_DATE - INTERVAL '6 months'
       LEFT JOIN leave_requests lr ON lr.employee_id = e.id
         AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
       WHERE e.is_active = TRUE
       GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name, e.job_title, e.date_joined
       ORDER BY absent_days DESC, total_overtime DESC`
    );

    // Simple rule-based scoring
    const predictions = rows.map((emp) => {
      const absRate    = Math.min(emp.absent_days / 120, 1);
      const overtimeR  = Math.min(emp.total_overtime / 200, 1);
      const tenureR    = emp.years_of_service < 1 ? 0.3 : 0;
      const score      = (absRate * 0.5 + overtimeR * 0.3 + tenureR * 0.2);

      return {
        ...emp,
        attrition_probability: parseFloat(score.toFixed(3)),
        risk_level: score >= 0.6 ? "High" : score >= 0.3 ? "Medium" : "Low",
      };
    });

    return res.json({ success: true, source: "rule_based", data: predictions });
  } catch (err) {
    next(err);
  }
};

// ── ML: SALARY ANOMALIES ───────────────────────────────
exports.getSalaryAnomalies = async (req, res, next) => {
  try {
    const { pay_period } = req.query;
    const period = pay_period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

    // Rule-based anomaly detection fallback
    const { rows } = await db.query(
      `SELECT ps.*,
              e.first_name || ' ' || e.last_name AS employee_name,
              e.employee_code, d.name AS department,
              CASE
                WHEN ps.net_salary > ps.gross_salary THEN 'NET_EXCEEDS_GROSS'
                WHEN ps.net_salary <= 0              THEN 'ZERO_NET_SALARY'
                WHEN ps.total_deductions / NULLIF(ps.gross_salary,0) > 0.5 THEN 'EXCESSIVE_DEDUCTIONS'
                WHEN ps.gross_salary > 500000        THEN 'UNUSUALLY_HIGH_SALARY'
                ELSE NULL
              END AS anomaly_type
       FROM payslips ps
       JOIN employees e ON ps.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ps.pay_period = $1
         AND (
           ps.net_salary > ps.gross_salary OR
           ps.net_salary <= 0 OR
           ps.total_deductions / NULLIF(ps.gross_salary,0) > 0.5 OR
           ps.gross_salary > 500000
         )
       ORDER BY ps.gross_salary DESC`,
      [period]
    );

    return res.json({
      success: true,
      data: { period, anomalies: rows, count: rows.length },
    });
  } catch (err) {
    next(err);
  }
};
