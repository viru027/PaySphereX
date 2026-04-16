-- ============================================================
-- PaySphereX: Data Warehouse STAR SCHEMA
-- ============================================================

-- DIMENSION: Time
CREATE TABLE dim_time (
    time_key    SERIAL PRIMARY KEY,
    full_date   DATE NOT NULL UNIQUE,
    day         INT,
    month       INT,
    month_name  VARCHAR(20),
    quarter     INT,
    year        INT,
    week_of_year INT,
    day_of_week  INT,
    day_name     VARCHAR(20),
    is_weekend   BOOLEAN,
    is_holiday   BOOLEAN DEFAULT FALSE
);

-- DIMENSION: Employee
CREATE TABLE dim_employee (
    employee_key    SERIAL PRIMARY KEY,
    employee_id     UUID NOT NULL,
    employee_code   VARCHAR(20),
    full_name       VARCHAR(200),
    gender          VARCHAR(10),
    age             INT,
    department_name VARCHAR(100),
    job_title       VARCHAR(150),
    employment_type VARCHAR(30),
    hire_date       DATE,
    tenure_years    NUMERIC(5,2),
    salary_band     VARCHAR(20),   -- Low/Mid/High/Executive
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    is_current      BOOLEAN DEFAULT TRUE
);

-- DIMENSION: Department
CREATE TABLE dim_department (
    department_key  SERIAL PRIMARY KEY,
    department_id   UUID NOT NULL,
    department_name VARCHAR(100),
    budget          NUMERIC(15,2),
    headcount       INT
);

-- DIMENSION: Leave Type
CREATE TABLE dim_leave_type (
    leave_type_key SERIAL PRIMARY KEY,
    leave_type_id  UUID NOT NULL,
    name           VARCHAR(100),
    code           VARCHAR(10),
    is_paid        BOOLEAN,
    carry_forward  BOOLEAN
);

-- FACT: Payroll
CREATE TABLE fact_payroll (
    payroll_key       SERIAL PRIMARY KEY,
    time_key          INT REFERENCES dim_time(time_key),
    employee_key      INT REFERENCES dim_employee(employee_key),
    department_key    INT REFERENCES dim_department(department_key),
    payroll_month     INT,
    payroll_year      INT,
    -- Measures
    base_salary       NUMERIC(15,2),
    gross_salary      NUMERIC(15,2),
    total_deductions  NUMERIC(15,2),
    net_salary        NUMERIC(15,2),
    performance_bonus NUMERIC(15,2),
    pf_deduction      NUMERIC(15,2),
    income_tax        NUMERIC(15,2),
    working_days      INT,
    present_days      INT,
    absent_days       INT,
    leave_days        INT,
    attendance_pct    NUMERIC(5,2)
);

-- FACT: Attendance
CREATE TABLE fact_attendance (
    attendance_key  SERIAL PRIMARY KEY,
    time_key        INT REFERENCES dim_time(time_key),
    employee_key    INT REFERENCES dim_employee(employee_key),
    department_key  INT REFERENCES dim_department(department_key),
    -- Measures
    check_in_hour   INT,
    work_hours      NUMERIC(5,2),
    is_late         BOOLEAN,
    is_early_exit   BOOLEAN,
    status          VARCHAR(20),
    location        VARCHAR(50)
);

-- FACT: Leave
CREATE TABLE fact_leave (
    leave_key      SERIAL PRIMARY KEY,
    time_key       INT REFERENCES dim_time(time_key),
    employee_key   INT REFERENCES dim_employee(employee_key),
    department_key INT REFERENCES dim_department(department_key),
    leave_type_key INT REFERENCES dim_leave_type(leave_type_key),
    -- Measures
    total_days     INT,
    is_approved    BOOLEAN,
    is_sick_leave  BOOLEAN,
    days_to_approval INT,  -- SLA tracking
    month          INT,
    year           INT
);

-- Indexes for warehouse queries
CREATE INDEX idx_fact_payroll_time ON fact_payroll(time_key, payroll_year, payroll_month);
CREATE INDEX idx_fact_payroll_emp  ON fact_payroll(employee_key);
CREATE INDEX idx_fact_att_time     ON fact_attendance(time_key);
CREATE INDEX idx_fact_att_emp      ON fact_attendance(employee_key);
CREATE INDEX idx_fact_leave_time   ON fact_leave(time_key);
CREATE INDEX idx_fact_leave_type   ON fact_leave(leave_type_key);
