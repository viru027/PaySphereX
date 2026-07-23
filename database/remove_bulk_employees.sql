-- ================================================================
-- PaySphereX — Remove bulk employees, keep original 12
-- Run: psql -U postgres -d paysphere_db -f remove_bulk_employees.sql
-- ================================================================

-- Delete everything linked to employees with code > EMP012
DELETE FROM audit_logs        WHERE actor_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM bonuses           WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM payslips          WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM leave_requests    WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM leave_balances    WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM attendance        WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM salary_structures WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM refresh_tokens    WHERE employee_id IN (SELECT id FROM employees WHERE employee_code > 'EMP012');
DELETE FROM employees         WHERE employee_code > 'EMP012';

-- Update payroll run totals back to original 12 employees
UPDATE payroll_runs pr
SET
  total_gross      = (SELECT COALESCE(SUM(gross_salary),0)      FROM payslips WHERE payroll_run_id = pr.id),
  total_net        = (SELECT COALESCE(SUM(net_salary),0)        FROM payslips WHERE payroll_run_id = pr.id),
  total_deductions = (SELECT COALESCE(SUM(total_deductions),0)  FROM payslips WHERE payroll_run_id = pr.id);

-- Verify: should show 12 (or 11 if you have 11)
SELECT 'employees'       AS tbl, COUNT(*) FROM employees
UNION ALL SELECT 'payslips',          COUNT(*) FROM payslips
UNION ALL SELECT 'attendance',        COUNT(*) FROM attendance
UNION ALL SELECT 'leave_requests',    COUNT(*) FROM leave_requests
UNION ALL SELECT 'leave_balances',    COUNT(*) FROM leave_balances
ORDER BY 1;
