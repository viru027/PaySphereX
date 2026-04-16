-- PaySphereX Complete Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES (must be first)
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO roles (name, description) VALUES
  ('admin',    'Full system access'),
  ('hr',       'HR management access'),
  ('manager',  'Team management access'),
  ('employee', 'Self-service access')
ON CONFLICT DO NOTHING;

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    manager_id  UUID,
    budget      NUMERIC(15,2) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code   VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE,
    gender          VARCHAR(20),
    address         TEXT,
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    role_id         INTEGER REFERENCES roles(id) DEFAULT 4,
    job_title       VARCHAR(150),
    employment_type VARCHAR(50)  DEFAULT 'Full-time',
    date_joined     DATE         NOT NULL DEFAULT CURRENT_DATE,
    date_left       DATE,
    is_active       BOOLEAN      DEFAULT TRUE,
    profile_photo   TEXT,
    bank_account    VARCHAR(100),
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
);

-- Add manager FK to departments
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_dept_manager;
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- SALARY STRUCTURES
CREATE TABLE IF NOT EXISTS salary_structures (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    base_salary         NUMERIC(12,2) NOT NULL,
    hra                 NUMERIC(12,2) DEFAULT 0,
    transport_allowance NUMERIC(12,2) DEFAULT 0,
    medical_allowance   NUMERIC(12,2) DEFAULT 0,
    special_allowance   NUMERIC(12,2) DEFAULT 0,
    pf_employee         NUMERIC(12,2) DEFAULT 0,
    pf_employer         NUMERIC(12,2) DEFAULT 0,
    esi_employee        NUMERIC(12,2) DEFAULT 0,
    esi_employer        NUMERIC(12,2) DEFAULT 0,
    professional_tax    NUMERIC(12,2) DEFAULT 0,
    income_tax_tds      NUMERIC(12,2) DEFAULT 0,
    is_current          BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- PAYROLL RUNS
CREATE TABLE IF NOT EXISTS payroll_runs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pay_period       VARCHAR(7) NOT NULL,
    run_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(20) DEFAULT 'draft',
    processed_by     UUID REFERENCES employees(id),
    total_gross      NUMERIC(15,2) DEFAULT 0,
    total_net        NUMERIC(15,2) DEFAULT 0,
    total_deductions NUMERIC(15,2) DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

-- PAYSLIPS
CREATE TABLE IF NOT EXISTS payslips (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id      UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_period          VARCHAR(7) NOT NULL,
    working_days        INTEGER DEFAULT 0,
    days_present        INTEGER DEFAULT 0,
    days_absent         INTEGER DEFAULT 0,
    days_paid_leave     INTEGER DEFAULT 0,
    base_salary         NUMERIC(12,2) DEFAULT 0,
    hra                 NUMERIC(12,2) DEFAULT 0,
    transport_allowance NUMERIC(12,2) DEFAULT 0,
    medical_allowance   NUMERIC(12,2) DEFAULT 0,
    special_allowance   NUMERIC(12,2) DEFAULT 0,
    performance_bonus   NUMERIC(12,2) DEFAULT 0,
    overtime_pay        NUMERIC(12,2) DEFAULT 0,
    other_earnings      NUMERIC(12,2) DEFAULT 0,
    gross_salary        NUMERIC(12,2) DEFAULT 0,
    pf_deduction        NUMERIC(12,2) DEFAULT 0,
    esi_deduction       NUMERIC(12,2) DEFAULT 0,
    professional_tax    NUMERIC(12,2) DEFAULT 0,
    income_tax_tds      NUMERIC(12,2) DEFAULT 0,
    loan_deduction      NUMERIC(12,2) DEFAULT 0,
    other_deductions    NUMERIC(12,2) DEFAULT 0,
    total_deductions    NUMERIC(12,2) DEFAULT 0,
    net_salary          NUMERIC(12,2) DEFAULT 0,
    payment_status      VARCHAR(20) DEFAULT 'pending',
    payment_date        DATE,
    payment_method      VARCHAR(50) DEFAULT 'bank_transfer',
    bank_account        VARCHAR(100),
    remarks             TEXT,
    pdf_url             TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (payroll_run_id, employee_id)
);

-- LEAVE TYPES
CREATE TABLE IF NOT EXISTS leave_types (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,
    code           VARCHAR(20)  NOT NULL UNIQUE,
    annual_quota   NUMERIC(5,1) DEFAULT 0,
    is_paid        BOOLEAN DEFAULT TRUE,
    carry_forward  BOOLEAN DEFAULT FALSE,
    max_carry_days NUMERIC(5,1) DEFAULT 0,
    description    TEXT,
    color_code     VARCHAR(10) DEFAULT '#3B82F6'
);

INSERT INTO leave_types (name, code, annual_quota, is_paid, carry_forward, max_carry_days, color_code) VALUES
  ('Casual Leave',      'CL',  12, TRUE,  FALSE, 0,  '#3B82F6'),
  ('Sick Leave',        'SL',  12, TRUE,  FALSE, 0,  '#EF4444'),
  ('Earned Leave',      'EL',  15, TRUE,  TRUE,  30, '#10B981'),
  ('Maternity Leave',   'ML',  90, TRUE,  FALSE, 0,  '#F59E0B'),
  ('Paternity Leave',   'PL',  15, TRUE,  FALSE, 0,  '#8B5CF6'),
  ('Compensatory Off',  'CO',  0,  TRUE,  TRUE,  10, '#6366F1'),
  ('Leave Without Pay', 'LWP', 0,  FALSE, FALSE, 0,  '#6B7280')
ON CONFLICT DO NOTHING;

-- LEAVE BALANCES
CREATE TABLE IF NOT EXISTS leave_balances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INTEGER NOT NULL REFERENCES leave_types(id),
    year            INTEGER NOT NULL,
    allotted        NUMERIC(5,1) DEFAULT 0,
    used            NUMERIC(5,1) DEFAULT 0,
    carried_forward NUMERIC(5,1) DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, leave_type_id, year)
);

-- Add computed balance column safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='leave_balances' AND column_name='balance'
  ) THEN
    ALTER TABLE leave_balances
      ADD COLUMN balance NUMERIC(5,1)
      GENERATED ALWAYS AS (allotted + carried_forward - used) STORED;
  END IF;
END $$;

-- LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   INTEGER NOT NULL REFERENCES leave_types(id),
    start_date      DATE    NOT NULL,
    end_date        DATE    NOT NULL,
    total_days      NUMERIC(5,1) NOT NULL,
    half_day        BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(10),
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending',
    reviewed_by     UUID REFERENCES employees(id),
    reviewed_at     TIMESTAMP,
    review_comment  TEXT,
    applied_on      TIMESTAMP DEFAULT NOW(),
    document_url    TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id    UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date           DATE    NOT NULL,
    check_in       TIMESTAMP,
    check_out      TIMESTAMP,
    work_hours     NUMERIC(5,2) DEFAULT 0,
    overtime_hours NUMERIC(5,2) DEFAULT 0,
    status         VARCHAR(20) DEFAULT 'present',
    location       VARCHAR(50) DEFAULT 'office',
    notes          TEXT,
    is_regularized BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

-- Auto-compute work_hours on insert/update
CREATE OR REPLACE FUNCTION compute_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    NEW.work_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0, 2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_hours ON attendance;
CREATE TRIGGER trg_work_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION compute_work_hours();

-- HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    date        DATE NOT NULL UNIQUE,
    type        VARCHAR(50) DEFAULT 'public',
    description TEXT
);

-- PERFORMANCE REVIEWS
CREATE TABLE IF NOT EXISTS performance_reviews (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id      UUID NOT NULL REFERENCES employees(id),
    reviewer_id      UUID REFERENCES employees(id),
    review_period    VARCHAR(7) NOT NULL,
    rating           NUMERIC(3,1),
    comments         TEXT,
    kra_score        NUMERIC(5,2),
    leadership_score NUMERIC(5,2),
    teamwork_score   NUMERIC(5,2),
    innovation_score NUMERIC(5,2),
    punctuality_score NUMERIC(5,2),
    created_at       TIMESTAMP DEFAULT NOW()
);

-- BONUSES
CREATE TABLE IF NOT EXISTS bonuses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id      UUID         NOT NULL REFERENCES employees(id),
    bonus_type       VARCHAR(100) NOT NULL,
    amount           NUMERIC(12,2) NOT NULL,
    applicable_month VARCHAR(7)   NOT NULL,
    reason           TEXT,
    approved_by      UUID REFERENCES employees(id),
    status           VARCHAR(20) DEFAULT 'pending',
    created_at       TIMESTAMP DEFAULT NOW()
);

-- EMPLOYEE LOANS
CREATE TABLE IF NOT EXISTS employee_loans (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id   UUID          NOT NULL REFERENCES employees(id),
    loan_type     VARCHAR(50)   DEFAULT 'salary_advance',
    amount        NUMERIC(12,2) NOT NULL,
    emi           NUMERIC(12,2) NOT NULL,
    tenure_months INTEGER       NOT NULL,
    disbursed_on  DATE,
    status        VARCHAR(20)   DEFAULT 'pending',
    outstanding   NUMERIC(12,2),
    approved_by   UUID REFERENCES employees(id),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id   UUID REFERENCES employees(id),
    action     VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id  TEXT,
    old_data   JSONB,
    new_data   JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_employees_dept    ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_email   ON employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_dt ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_req_emp     ON leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payslips_period   ON payslips(pay_period, employee_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_upd  ON employees;
DROP TRIGGER IF EXISTS trg_attendance_upd ON attendance;
DROP TRIGGER IF EXISTS trg_leave_req_upd  ON leave_requests;
DROP TRIGGER IF EXISTS trg_payroll_upd    ON payroll_runs;

CREATE TRIGGER trg_employees_upd  BEFORE UPDATE ON employees      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_upd BEFORE UPDATE ON attendance      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_req_upd  BEFORE UPDATE ON leave_requests  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payroll_upd    BEFORE UPDATE ON payroll_runs    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- DATA WAREHOUSE SCHEMA
CREATE SCHEMA IF NOT EXISTS dw;

CREATE TABLE IF NOT EXISTS dw.dim_employee (
    sk_employee      SERIAL PRIMARY KEY,
    nk_employee_id   UUID NOT NULL,
    employee_code    VARCHAR(20),
    full_name        VARCHAR(200),
    gender           VARCHAR(20),
    age              INTEGER,
    age_band         VARCHAR(20),
    job_title        VARCHAR(150),
    employment_type  VARCHAR(50),
    years_of_service NUMERIC(5,2),
    date_joined      DATE,
    date_left        DATE,
    is_active        BOOLEAN,
    valid_from       DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to         DATE,
    is_current       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dw.dim_time (
    sk_date       INTEGER PRIMARY KEY,
    full_date     DATE NOT NULL,
    day_of_week   INTEGER,
    day_name      VARCHAR(20),
    day_of_month  INTEGER,
    day_of_year   INTEGER,
    week_of_year  INTEGER,
    month_num     INTEGER,
    month_name    VARCHAR(20),
    quarter       INTEGER,
    year          INTEGER,
    is_weekend    BOOLEAN,
    is_holiday    BOOLEAN DEFAULT FALSE,
    fiscal_year   INTEGER,
    fiscal_quarter INTEGER
);

CREATE TABLE IF NOT EXISTS dw.dim_department (
    sk_department SERIAL PRIMARY KEY,
    nk_dept_id    UUID NOT NULL,
    dept_name     VARCHAR(100),
    dept_code     VARCHAR(20),
    budget        NUMERIC(15,2),
    valid_from    DATE DEFAULT CURRENT_DATE,
    valid_to      DATE,
    is_current    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS dw.dim_leave_type (
    sk_leave_type    SERIAL PRIMARY KEY,
    nk_leave_type_id INTEGER,
    leave_name       VARCHAR(100),
    leave_code       VARCHAR(20),
    is_paid          BOOLEAN,
    annual_quota     NUMERIC(5,1)
);

CREATE TABLE IF NOT EXISTS dw.fact_payroll (
    sk_payroll       SERIAL PRIMARY KEY,
    sk_employee      INTEGER REFERENCES dw.dim_employee(sk_employee),
    sk_date          INTEGER REFERENCES dw.dim_time(sk_date),
    sk_department    INTEGER REFERENCES dw.dim_department(sk_department),
    nk_payslip_id    UUID,
    pay_period       VARCHAR(7),
    days_present     INTEGER,
    days_absent      INTEGER,
    days_paid_leave  INTEGER,
    base_salary      NUMERIC(12,2),
    gross_salary     NUMERIC(12,2),
    total_deductions NUMERIC(12,2),
    net_salary       NUMERIC(12,2),
    performance_bonus NUMERIC(12,2),
    overtime_pay     NUMERIC(12,2),
    pf_deduction     NUMERIC(12,2),
    income_tax_tds   NUMERIC(12,2),
    payment_status   VARCHAR(20),
    loaded_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dw.fact_attendance (
    sk_attendance  SERIAL PRIMARY KEY,
    sk_employee    INTEGER REFERENCES dw.dim_employee(sk_employee),
    sk_date        INTEGER REFERENCES dw.dim_time(sk_date),
    sk_department  INTEGER REFERENCES dw.dim_department(sk_department),
    nk_attendance_id UUID,
    check_in       TIMESTAMP,
    check_out      TIMESTAMP,
    work_hours     NUMERIC(5,2),
    overtime_hours NUMERIC(5,2),
    status         VARCHAR(20),
    location       VARCHAR(50),
    loaded_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dw.fact_leave (
    sk_leave       SERIAL PRIMARY KEY,
    sk_employee    INTEGER REFERENCES dw.dim_employee(sk_employee),
    sk_leave_type  INTEGER REFERENCES dw.dim_leave_type(sk_leave_type),
    sk_start_date  INTEGER REFERENCES dw.dim_time(sk_date),
    sk_end_date    INTEGER REFERENCES dw.dim_time(sk_date),
    sk_department  INTEGER REFERENCES dw.dim_department(sk_department),
    nk_leave_id    UUID,
    total_days     NUMERIC(5,1),
    status         VARCHAR(20),
    applied_on     DATE,
    reviewed_at    DATE,
    is_paid        BOOLEAN,
    loaded_at      TIMESTAMP DEFAULT NOW()
);