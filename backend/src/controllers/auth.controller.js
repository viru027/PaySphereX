/**
 * PaySphereX — Authentication Controller
 * ========================================
 * login, refreshToken, logout, getMe, changePassword
 */

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db     = require("../db/pool");
const logger = require("../utils/logger");
const { AppError } = require("../utils/AppError");

// ── Token Helpers ──────────────────────────────────────
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── LOGIN ──────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch employee with role
    const { rows } = await db.query(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email,
              e.password_hash, e.is_active, e.department_id,
              r.name AS role_name,
              d.name AS dept_name
       FROM employees e
       JOIN roles       r ON e.role_id       = r.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.email = $1`,
      [email.toLowerCase()]
    );

    if (!rows.length) throw new AppError("Invalid email or password", 401);

    const emp = rows[0];
    if (!emp.is_active) throw new AppError("Account is inactive. Contact HR.", 403);

    const valid = await bcrypt.compare(password, emp.password_hash);
    if (!valid) throw new AppError("Invalid email or password", 401);

    // Issue tokens
    const tokenPayload = { id: emp.id, role: emp.role_name, email: emp.email };
    const accessToken  = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ id: emp.id });

    // Persist refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO refresh_tokens (employee_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [emp.id, refreshToken, expiresAt]
    );

    // Audit
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, ip_address) VALUES ($1, $2, $3)`,
      [emp.id, "LOGIN", req.ip]
    );

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        employee: {
          id:           emp.id,
          employeeCode: emp.employee_code,
          firstName:    emp.first_name,
          lastName:     emp.last_name,
          email:        emp.email,
          role:         emp.role_name,
          department:   emp.dept_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── REFRESH TOKEN ──────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new AppError("Refresh token not provided", 401);

    // Verify signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Check DB
    const { rows } = await db.query(
      `SELECT rt.*, e.email, r.name AS role_name
       FROM refresh_tokens rt
       JOIN employees e ON rt.employee_id = e.id
       JOIN roles     r ON e.role_id      = r.id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) throw new AppError("Refresh token revoked or expired", 401);

    const rt = rows[0];
    const newAccess  = signAccessToken({ id: rt.employee_id, role: rt.role_name, email: rt.email });
    const newRefresh = signRefreshToken({ id: rt.employee_id });

    // Rotate refresh token
    await db.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      "INSERT INTO refresh_tokens (employee_id, token, expires_at) VALUES ($1, $2, $3)",
      [rt.employee_id, newRefresh, expiresAt]
    );

    res.cookie("refreshToken", newRefresh, cookieOptions);
    return res.json({ success: true, data: { accessToken: newAccess } });
  } catch (err) {
    next(err);
  }
};

// ── LOGOUT ─────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) await db.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
    res.clearCookie("refreshToken");
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// ── GET ME ─────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email,
              e.phone, e.gender, e.date_of_birth, e.date_joined, e.job_title,
              e.employment_type, e.profile_photo, e.is_active,
              d.name AS department, r.name AS role
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN roles r ON e.role_id = r.id
       WHERE e.id = $1`,
      [req.user.id]
    );
    if (!rows.length) throw new AppError("Employee not found", 404);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── CHANGE PASSWORD ────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { rows } = await db.query(
      "SELECT password_hash FROM employees WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) throw new AppError("Employee not found", 404);

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw new AppError("Current password is incorrect", 400);

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(
      "UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hash, req.user.id]
    );

    // Revoke all refresh tokens (force re-login on all devices)
    await db.query("DELETE FROM refresh_tokens WHERE employee_id = $1", [req.user.id]);

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};
