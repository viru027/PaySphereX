-- ================================================================
-- Fix: Insert 2026 leave balances for ALL existing employees
-- Run this in psql
-- ================================================================

INSERT INTO leave_balances (employee_id, leave_type_id, year, allotted, used, carried_forward)
SELECT
  e.id,
  lt.id,
  2026,
  lt.annual_quota,
  0,
  -- Carry forward earned leave balance from 2025 if applicable
  CASE
    WHEN lt.carry_forward = TRUE THEN
      COALESCE((
        SELECT GREATEST(0, lb2025.allotted - lb2025.used)
        FROM leave_balances lb2025
        WHERE lb2025.employee_id = e.id
          AND lb2025.leave_type_id = lt.id
          AND lb2025.year = 2025
        LIMIT 1
      ), 0)
    ELSE 0
  END
FROM employees e
CROSS JOIN leave_types lt
WHERE lt.annual_quota > 0
ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

-- Verify
SELECT
  e.first_name || ' ' || e.last_name AS employee,
  lt.name AS leave_type,
  lb.year,
  lb.allotted,
  lb.used,
  lb.balance
FROM leave_balances lb
JOIN employees e ON lb.employee_id = e.id
JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.year = 2026
ORDER BY e.first_name, lt.id;
