/**
 * PaySphereX - Utility Helpers
 */

/** Calculate business days between two dates */
const calcBusinessDays = (start, end) => {
  let count = 0;
  const cur = new Date(start);
  const fin = new Date(end);
  while (cur <= fin) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/** Compute payroll components */
const computePayroll = (employee) => {
  const { base_salary, hra, ta, da } = employee;
  const gross = base_salary + hra + ta + da;
  const pf    = Math.round(base_salary * 0.12);
  const esi   = gross > 21000 ? 0 : Math.round(gross * 0.0175);
  const tax   = gross > 600000 / 12 ? Math.round(gross * 0.10) : 0;
  const pt    = 200; // Professional tax flat
  const total_deductions = pf + esi + tax + pt;
  const net   = gross - total_deductions;
  return { gross, pf, esi, tax, pt, total_deductions, net };
};

/** Generate payroll reference number */
const genPayrollRef = (empCode, month, year) =>
  `PAY-${empCode}-${year}${String(month).padStart(2,'0')}`;

/** Paginate helper */
const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { offset: (p - 1) * l, limit: l, page: p };
};

/** Format API response */
const success = (res, data, message = 'Success', code = 200) =>
  res.status(code).json({ success: true, message, data });

const error = (res, message = 'Error', code = 500, details = null) =>
  res.status(code).json({ success: false, message, ...(details && { details }) });

module.exports = { calcBusinessDays, computePayroll, genPayrollRef, paginate, success, error };
