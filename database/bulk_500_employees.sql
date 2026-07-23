-- ================================================================
-- PaySphereX — 500 BULK EMPLOYEES SEED  (VARIED DATA VERSION)
-- Keeps existing EMP001-EMP011 intact
-- Adds EMP012-EMP511 with TRUE per-employee variation:
--   • Different salaries, allowances, deduction rates
--   • Unique attendance patterns (star, average, poor, WFH-heavy)
--   • Non-overlapping leave requests with varied reasons
--   • Different bonus months per employee
--   • Varied employment types & joining years
--   • Realistic work-hour distributions by persona
-- Run: psql -U postgres -d paysphere_db -f bulk_500_employees.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── STEP 0: Temp lookup tables ───────────────────────────────────
DROP TABLE IF EXISTS _tmp_fn;
DROP TABLE IF EXISTS _tmp_ln;
DROP TABLE IF EXISTS _tmp_jobs;
DROP TABLE IF EXISTS _tmp_reasons;

CREATE TEMP TABLE _tmp_fn (id SERIAL, name TEXT, is_female BOOLEAN DEFAULT FALSE);
CREATE TEMP TABLE _tmp_ln (id SERIAL, name TEXT);
CREATE TEMP TABLE _tmp_jobs (id SERIAL, title TEXT, dept_code TEXT, base_min INT, base_max INT, seniority INT);
CREATE TEMP TABLE _tmp_reasons (id SERIAL, reason TEXT, leave_type INT);

-- ── Male first names (130) ───────────────────────────────────────
INSERT INTO _tmp_fn(name) VALUES
('Aarav'),('Aditya'),('Akash'),('Amit'),('Anand'),('Aniket'),('Anil'),('Anish'),
('Ankit'),('Ankur'),('Anshul'),('Arpit'),('Ashish'),('Ashwin'),('Atul'),('Ayush'),
('Bharat'),('Chinmay'),('Deepak'),('Dev'),('Devesh'),('Dhruv'),('Dinesh'),('Dipak'),
('Gaurav'),('Girish'),('Harsh'),('Harshad'),('Hemant'),('Hitesh'),('Jayesh'),('Jigar'),
('Jitendra'),('Kalpesh'),('Kamal'),('Kapil'),('Karan'),('Kartik'),('Kunal'),('Lalit'),
('Mahesh'),('Manish'),('Manoj'),('Milan'),('Milind'),('Mohit'),('Mukesh'),('Nagesh'),
('Neeraj'),('Nikhil'),('Nilesh'),('Nitin'),('Pankaj'),('Paresh'),('Parth'),('Piyush'),
('Pradip'),('Prakash'),('Pranav'),('Prasad'),('Prashant'),('Praveen'),('Punit'),
('Rahul'),('Raj'),('Rajesh'),('Raju'),('Rakesh'),('Ramesh'),('Ravi'),('Ritesh'),
('Rohan'),('Rohit'),('Sachin'),('Sagar'),('Sahil'),('Sanchit'),('Sandeep'),('Sandesh'),
('Sanjay'),('Santosh'),('Sarang'),('Saurabh'),('Shailesh'),('Shantanu'),('Shivam'),
('Shreyas'),('Siddharth'),('Sumit'),('Sunil'),('Suresh'),('Swapnil'),('Tejas'),
('Tushar'),('Ujwal'),('Uday'),('Umesh'),('Vijay'),('Vikas'),('Vinay'),('Vinod'),
('Vishal'),('Vivek'),('Yash'),('Yogesh'),('Abhishek'),('Alok'),('Amol'),('Amrut'),
('Arun'),('Balaji'),('Basavraj'),('Chetan'),('Datta'),('Eknath'),('Ganesh'),('Govind'),
('Harish'),('Ishaan'),('Jagdish'),('Lalit'),('Laxman'),('Madhukar'),('Narayan'),
('Omkar'),('Pramod'),('Rajiv'),('Tarun'),('Udayan'),('Varun'),('Wasim'),('Zubair');

-- ── Female first names (90) ──────────────────────────────────────
INSERT INTO _tmp_fn(name, is_female) VALUES
('Aditi',TRUE),('Anjali',TRUE),('Anuja',TRUE),('Anushka',TRUE),('Aparna',TRUE),
('Archana',TRUE),('Arti',TRUE),('Avantika',TRUE),('Bhavna',TRUE),('Deepa',TRUE),
('Deepika',TRUE),('Divya',TRUE),('Gauri',TRUE),('Geeta',TRUE),('Heena',TRUE),
('Hema',TRUE),('Isha',TRUE),('Jyoti',TRUE),('Kavita',TRUE),('Ketaki',TRUE),
('Komal',TRUE),('Lata',TRUE),('Madhuri',TRUE),('Manasi',TRUE),('Meena',TRUE),
('Megha',TRUE),('Minal',TRUE),('Mira',TRUE),('Namrata',TRUE),('Neha',TRUE),
('Nidhi',TRUE),('Nikita',TRUE),('Nilima',TRUE),('Nisha',TRUE),('Pallavi',TRUE),
('Poonam',TRUE),('Pooja',TRUE),('Prachi',TRUE),('Pradnya',TRUE),('Priyanka',TRUE),
('Radha',TRUE),('Rashmi',TRUE),('Rekha',TRUE),('Riddhi',TRUE),('Ritu',TRUE),
('Rohini',TRUE),('Rucha',TRUE),('Rujuta',TRUE),('Rupali',TRUE),('Sadhana',TRUE),
('Sanjana',TRUE),('Sayali',TRUE),('Seema',TRUE),('Shital',TRUE),('Shraddha',TRUE),
('Shruti',TRUE),('Sneha',TRUE),('Sonali',TRUE),('Sunita',TRUE),('Swati',TRUE),
('Tanvi',TRUE),('Tejal',TRUE),('Trupti',TRUE),('Usha',TRUE),('Vaishali',TRUE),
('Varsha',TRUE),('Vidya',TRUE),('Vrunda',TRUE),('Yamini',TRUE),('Yogita',TRUE),
('Priya',TRUE),('Smita',TRUE),('Aarohi',TRUE),('Bhumi',TRUE),('Chaitrali',TRUE),
('Disha',TRUE),('Ekta',TRUE),('Falak',TRUE),('Gunjan',TRUE),('Harshada',TRUE),
('Isha',TRUE),('Juhi',TRUE),('Kamakshi',TRUE),('Latika',TRUE),('Mandira',TRUE),
('Nandini',TRUE),('Parvati',TRUE),('Radhika',TRUE),('Shalini',TRUE),('Tara',TRUE);

-- ── Last names (100) ─────────────────────────────────────────────
INSERT INTO _tmp_ln(name) VALUES
('Patil'),('Sharma'),('Verma'),('Gupta'),('Singh'),('Kumar'),('Joshi'),('Desai'),
('Mehta'),('Shah'),('Patel'),('Nair'),('Reddy'),('Rao'),('Iyer'),('Menon'),
('Pillai'),('Krishnan'),('Chaudhari'),('Jagtap'),('Bhakare'),('Kale'),('Yeole'),
('Dhumal'),('Baviskar'),('Devraj'),('Sawant'),('More'),('Jadhav'),('Pawar'),
('Shinde'),('Mane'),('Kamble'),('Dalvi'),('Gaikwad'),('Kadam'),('Chavan'),
('Wagh'),('Yadav'),('Tiwari'),('Mishra'),('Pandey'),('Dubey'),('Srivastava'),
('Agarwal'),('Jain'),('Saxena'),('Mathur'),('Khanna'),('Malhotra'),('Kapoor'),
('Chopra'),('Bhatia'),('Arora'),('Anand'),('Nanda'),('Sethi'),('Bajaj'),
('Oberoi'),('Mehra'),('Tandon'),('Kohli'),('Bose'),('Mukherjee'),('Banerjee'),
('Das'),('Ghosh'),('Chatterjee'),('Sengupta'),('Dey'),('Chakraborty'),('Biswas'),
('Thomas'),('George'),('Varghese'),('Mathew'),('Philip'),('Naidu'),('Shetty'),
('Hegde'),('Kamath'),('Bhat'),('Pai'),('Kulkarni'),('Deshpande'),('Godse'),
('Apte'),('Gokhale'),('Thakur'),('Rathod'),('Solanki'),('Garg'),('Tomar'),
('Pandkar'),('Bhosale'),('Ghorpade'),('Rajput'),('Khatri'),('Tripathi'),('Dubey');

-- ── Job titles with seniority level (1=junior, 2=mid, 3=senior) ──
INSERT INTO _tmp_jobs(title, dept_code, base_min, base_max, seniority) VALUES
-- Engineering
('Junior Software Engineer',     'ENG', 45000,  65000, 1),
('Software Engineer',            'ENG', 65000,  90000, 2),
('Senior Software Engineer',     'ENG', 95000, 125000, 3),
('Lead Engineer',                'ENG',130000, 160000, 3),
('Full Stack Developer',         'ENG', 75000, 100000, 2),
('Backend Developer',            'ENG', 70000,  95000, 2),
('Frontend Developer',           'ENG', 68000,  92000, 2),
('DevOps Engineer',              'ENG', 88000, 115000, 2),
('QA Engineer',                  'ENG', 48000,  72000, 1),
('Senior QA Engineer',           'ENG', 72000,  95000, 2),
('Mobile Developer',             'ENG', 78000, 105000, 2),
('Security Engineer',            'ENG', 90000, 120000, 3),
('Cloud Architect',              'ENG',140000, 180000, 3),
('Embedded Systems Engineer',    'ENG', 70000,  98000, 2),
-- Data Science
('Junior Data Analyst',          'DS',  45000,  65000, 1),
('Data Analyst',                 'DS',  65000,  88000, 2),
('Senior Data Analyst',          'DS',  88000, 115000, 3),
('Data Scientist',               'DS', 110000, 145000, 3),
('ML Engineer',                  'DS', 105000, 140000, 3),
('Junior ML Engineer',           'DS',  60000,  85000, 1),
('AI Research Engineer',         'DS', 120000, 155000, 3),
('Business Intelligence Analyst','DS',  75000, 100000, 2),
('Data Engineer',                'DS',  88000, 118000, 2),
('NLP Engineer',                 'DS', 100000, 135000, 3),
-- Sales
('Sales Trainee',                'SAL', 35000,  50000, 1),
('Sales Executive',              'SAL', 52000,  72000, 2),
('Senior Sales Executive',       'SAL', 72000,  92000, 2),
('Sales Manager',                'SAL', 88000, 110000, 3),
('Business Development Exec',    'SAL', 65000,  88000, 2),
('Account Manager',              'SAL', 78000, 100000, 2),
('Pre-Sales Consultant',         'SAL', 68000,  90000, 2),
('Regional Sales Lead',          'SAL', 95000, 120000, 3),
('Key Account Manager',          'SAL', 90000, 115000, 3),
-- HR
('HR Intern',                    'HR',  25000,  38000, 1),
('HR Executive',                 'HR',  45000,  65000, 1),
('HR Business Partner',          'HR',  78000, 100000, 3),
('Talent Acquisition Specialist','HR',  62000,  82000, 2),
('L&D Specialist',               'HR',  68000,  88000, 2),
('HR Generalist',                'HR',  52000,  70000, 2),
('Compensation Analyst',         'HR',  72000,  95000, 2),
('HRIS Analyst',                 'HR',  65000,  85000, 2),
-- Finance
('Finance Intern',               'FIN', 28000,  40000, 1),
('Finance Analyst',              'FIN', 58000,  80000, 1),
('Senior Finance Analyst',       'FIN', 80000, 105000, 2),
('Senior Accountant',            'FIN', 78000, 100000, 2),
('Finance Executive',            'FIN', 52000,  70000, 2),
('Payroll Specialist',           'FIN', 65000,  85000, 2),
('Financial Controller',         'FIN', 95000, 125000, 3),
('Treasury Analyst',             'FIN', 70000,  95000, 2),
('Audit Executive',              'FIN', 68000,  90000, 2),
-- Product
('Associate Product Manager',    'PM',  68000,  90000, 2),
('Product Manager',              'PM',  95000, 125000, 3),
('Senior Product Manager',       'PM', 120000, 155000, 3),
('UX Designer',                  'PM',  72000,  96000, 2),
('Senior UX Designer',           'PM',  95000, 125000, 3),
('UI Designer',                  'PM',  60000,  82000, 1),
('Product Analyst',              'PM',  65000,  85000, 2),
('Scrum Master',                 'PM',  80000, 105000, 2),
('Business Analyst',             'PM',  70000,  95000, 2);

-- ── Leave reasons pool (varied, realistic) ───────────────────────
INSERT INTO _tmp_reasons(reason, leave_type) VALUES
-- Casual leave (type 1) reasons
('Personal work at home',           1),
('Bank and government paperwork',   1),
('Family function at home',         1),
('Attending court proceedings',     1),
('Vehicle repair and service',      1),
('Travelling for family visit',     1),
('House maintenance work',          1),
('Moving to new house',             1),
('Personal errands',                1),
('Birthday leave',                  1),
('Wedding anniversary',             1),
('Sibling's graduation ceremony',   1),
('Diwali extended break',           1),
('Holi celebration',                1),
('New Year break',                  1),
('Eid holiday extension',           1),
('Christmas and New Year',          1),
-- Sick leave (type 2) reasons
('Fever and cold',                  2),
('Viral infection',                 2),
('Food poisoning',                  2),
('Severe migraine',                 2),
('Back pain, doctor's advice',      2),
('Throat infection',                2),
('Eye infection',                   2),
('Stomach infection',               2),
('Dental surgery follow-up',        2),
('Doctor consultation and rest',    2),
('Flu symptoms',                    2),
('COVID-like symptoms, self-isolating',2),
('Blood pressure issue',            2),
('Knee injury from sports',         2),
('Allergy flare-up',                2),
('Post-vaccination rest',           2),
('Medical test and reports',        2),
-- Earned leave (type 3) reasons
('Annual family vacation',          3),
('Honeymoon trip',                  3),
('International trip with family',  3),
('Pilgrimage to Vaishno Devi',      3),
('Goa trip with college friends',   3),
('Attending cousin's wedding',      3),
('Exploring North East India',      3),
('Road trip to Himachal',           3),
('Thailand family holiday',         3),
('Summer vacation with kids',       3),
('Attending family reunion abroad', 3),
('Annual leave utilization',        3);

-- ================================================================
-- STEP 2: Main employee generation PL/pgSQL block
-- ================================================================
DO $$
DECLARE
  i           INT;
  v_counter   INT := 11;   -- will be incremented to 12 at loop start

  -- Employee fields
  v_fn        TEXT;
  v_ln        TEXT;
  v_is_female BOOLEAN;
  v_gender    TEXT;
  v_emp_code  TEXT;
  v_email     TEXT;
  v_dob       DATE;
  v_joined    DATE;
  v_emp_id    UUID;
  v_dept_code TEXT;
  v_dept_id   UUID;
  v_job_title TEXT;
  v_base_min  INT;
  v_base_max  INT;
  v_seniority INT;
  v_base_sal  NUMERIC;

  -- Salary components (vary per employee)
  v_hra_pct   NUMERIC;  -- 35-50% of base
  v_hra       NUMERIC;
  v_ta        NUMERIC;  -- 1500–5000
  v_ma        NUMERIC;  -- 500–2000
  v_sa        NUMERIC;
  v_pf        NUMERIC;
  v_pt        NUMERIC;
  v_tds       NUMERIC;

  -- Work persona (drives attendance shape)
  -- 1=star performer, 2=wfh-heavy, 3=average, 4=poor attender, 5=overworker
  v_persona   INT;
  v_risk      TEXT;   -- 'high','medium','low'

  -- Leave usage
  v_cl_used   NUMERIC;
  v_sl_used   NUMERIC;
  v_el_used   NUMERIC;
  v_cl_2026   NUMERIC;
  v_sl_2026   NUMERIC;
  v_el_2026   NUMERIC;

  -- Employment type
  v_emp_type  TEXT;

  -- Dept arrays
  dept_codes   TEXT[] := ARRAY['ENG','HR','FIN','SAL','PM','DS'];
  dept_ids     UUID[] := ARRAY[
    '11111111-0000-0000-0000-000000000001'::UUID,
    '11111111-0000-0000-0000-000000000002'::UUID,
    '11111111-0000-0000-0000-000000000003'::UUID,
    '11111111-0000-0000-0000-000000000004'::UUID,
    '11111111-0000-0000-0000-000000000005'::UUID,
    '11111111-0000-0000-0000-000000000006'::UUID
  ];
  dept_idx     INT;
  dept_weights FLOAT[] := ARRAY[0.35, 0.10, 0.10, 0.20, 0.10, 0.15];
  rnd          FLOAT;
  cum          FLOAT;
  j            INT;

BEGIN
  FOR i IN 1..500 LOOP
    v_counter := v_counter + 1;

    -- ── Random name ───────────────────────────────────────────
    SELECT name, is_female INTO v_fn, v_is_female
    FROM _tmp_fn ORDER BY random() LIMIT 1;
    SELECT name INTO v_ln FROM _tmp_ln ORDER BY random() LIMIT 1;

    v_gender   := CASE WHEN v_is_female THEN 'Female' ELSE 'Male' END;
    v_emp_code := 'EMP' || LPAD(v_counter::TEXT, 3, '0');
    v_email    := LOWER(regexp_replace(v_fn, '[^a-zA-Z]', '', 'g'))
               || '.'
               || LOWER(regexp_replace(v_ln, '[^a-zA-Z]', '', 'g'))
               || v_counter
               || '@paysphere.com';

    -- ── Age (22–56), tenure (3 months – 8 years) ─────────────
    v_dob    := (CURRENT_DATE - ((22 + floor(random()*34))::INT * 365
                + floor(random()*365)::INT) * INTERVAL '1 day')::DATE;
    v_joined := (CURRENT_DATE - ((90 + floor(random()*2800))::INT)
                * INTERVAL '1 day')::DATE;

    -- ── Weighted department ───────────────────────────────────
    rnd := random(); cum := 0; dept_idx := 1;
    FOR j IN 1..6 LOOP
      cum := cum + dept_weights[j];
      IF rnd <= cum THEN dept_idx := j; EXIT; END IF;
    END LOOP;
    v_dept_code := dept_codes[dept_idx];
    v_dept_id   := dept_ids[dept_idx];

    -- ── Job by dept ───────────────────────────────────────────
    SELECT title, base_min, base_max, seniority
    INTO v_job_title, v_base_min, v_base_max, v_seniority
    FROM _tmp_jobs WHERE dept_code = v_dept_code ORDER BY random() LIMIT 1;

    -- ── Salary: unique per-employee components ────────────────
    v_base_sal := ROUND((v_base_min + random()*(v_base_max - v_base_min)) / 500) * 500;

    -- HRA varies 35–50%
    v_hra_pct  := 0.35 + random()*0.15;
    v_hra      := ROUND(v_base_sal * v_hra_pct / 500) * 500;

    -- Transport allowance: 1500/2000/3000/4000/5000 based on seniority + random
    v_ta := CASE v_seniority
      WHEN 1 THEN (ARRAY[1500,2000,2500])[floor(random()*3+1)::INT]
      WHEN 2 THEN (ARRAY[2000,2500,3000,3500])[floor(random()*4+1)::INT]
      ELSE        (ARRAY[3000,4000,5000])[floor(random()*3+1)::INT]
    END;

    -- Medical allowance: 750/1000/1250/1500/1800/2000
    v_ma := (ARRAY[750,1000,1250,1500,1800,2000])[floor(random()*6+1)::INT];

    -- Special allowance: 5-15% of base
    v_sa := ROUND(v_base_sal * (0.05 + random()*0.10) / 500) * 500;

    -- PF: always 12%
    v_pf := ROUND(v_base_sal * 0.12);

    -- Professional tax varies by slab (200 / 175 / 150 / 0 for interns)
    v_pt := CASE
      WHEN v_base_sal >= 100000 THEN 200
      WHEN v_base_sal >=  50000 THEN 175
      WHEN v_base_sal >=  25000 THEN 150
      ELSE 0
    END;

    -- TDS varies — low earners pay less
    v_tds := GREATEST(0, ROUND((v_base_sal - 42000) * CASE
      WHEN v_base_sal > 120000 THEN 0.20
      WHEN v_base_sal >  80000 THEN 0.10
      WHEN v_base_sal >  50000 THEN 0.05
      ELSE 0.01
    END));

    -- ── Work persona (drives attendance shape) ────────────────
    -- 1=star(5%), 2=wfh-heavy(20%), 3=average(45%), 4=poor(15%), 5=overworker(15%)
    rnd := random();
    v_persona := CASE
      WHEN rnd < 0.05 THEN 1
      WHEN rnd < 0.25 THEN 2
      WHEN rnd < 0.70 THEN 3
      WHEN rnd < 0.85 THEN 4
      ELSE 5
    END;

    -- ── Attrition risk ────────────────────────────────────────
    v_risk := CASE
      WHEN v_persona = 4 THEN
        CASE WHEN random() < 0.60 THEN 'high' ELSE 'medium' END
      WHEN v_persona = 5 THEN
        CASE WHEN random() < 0.40 THEN 'high' ELSE 'medium' END
      WHEN v_persona = 1 THEN 'low'
      WHEN random() < 0.15 THEN 'high'
      WHEN random() < 0.40 THEN 'medium'
      ELSE 'low'
    END;

    -- ── Leave usage (persona-aware) ───────────────────────────
    v_cl_used := CASE
      WHEN v_persona = 1 THEN floor(random()*2)                     -- star: 0-1
      WHEN v_persona = 2 THEN floor(random()*3)+1                   -- wfh: 1-3
      WHEN v_persona = 4 THEN LEAST(12, floor(random()*5)+5)        -- poor: 5-9
      WHEN v_persona = 5 THEN floor(random()*2)                     -- overworker: 0-1
      ELSE floor(random()*4)+1                                       -- avg: 1-4
    END;
    v_sl_used := CASE
      WHEN v_persona = 1 THEN floor(random()*2)
      WHEN v_persona = 4 THEN LEAST(12, floor(random()*6)+6)
      WHEN v_persona = 5 THEN floor(random()*3)
      WHEN v_risk = 'high' THEN LEAST(12, floor(random()*4)+5)
      ELSE floor(random()*4)
    END;
    v_el_used := CASE
      WHEN v_persona = 1 THEN floor(random()*4)+3                   -- takes vacations
      WHEN v_persona = 5 THEN floor(random()*2)                     -- doesn't take leave
      WHEN v_risk = 'high' THEN LEAST(15, floor(random()*4)+4)
      ELSE LEAST(15, floor(random()*6)+1)
    END;

    -- 2026 leave usage (partial year so far)
    v_cl_2026 := CASE
      WHEN v_persona = 4 THEN floor(random()*3)+2
      WHEN v_persona = 5 THEN floor(random()*2)
      ELSE floor(random()*3)
    END;
    v_sl_2026 := CASE
      WHEN v_persona = 4 THEN floor(random()*3)+2
      WHEN v_risk = 'high' THEN floor(random()*3)+2
      ELSE floor(random()*3)
    END;
    v_el_2026 := CASE
      WHEN v_persona = 5 THEN 0
      WHEN v_persona = 1 THEN floor(random()*4)+1
      ELSE floor(random()*3)
    END;

    -- ── Employment type ───────────────────────────────────────
    v_emp_type := CASE
      WHEN v_seniority = 1 AND random() < 0.15 THEN 'Intern'
      WHEN random() < 0.04 THEN 'Contract'
      WHEN random() < 0.02 THEN 'Part-time'
      ELSE 'Full-time'
    END;

    v_emp_id := gen_random_uuid();

    -- ── INSERT employee ───────────────────────────────────────
    INSERT INTO employees (
      id, employee_code, first_name, last_name, email, password_hash,
      phone, date_of_birth, gender, department_id, role_id,
      job_title, employment_type, date_joined, is_active
    ) VALUES (
      v_emp_id, v_emp_code, v_fn, v_ln, v_email,
      '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh8S',
      '9' || LPAD((floor(random()*900000000+100000000))::TEXT, 9, '0'),
      v_dob, v_gender, v_dept_id,
      CASE WHEN v_seniority = 3 THEN 3
           WHEN v_emp_type = 'Intern' THEN 5
           ELSE 4 END,
      v_job_title, v_emp_type, v_joined,
      CASE WHEN v_risk = 'high' AND random() < 0.10 THEN FALSE ELSE TRUE END
    ) ON CONFLICT DO NOTHING;

    -- ── Salary structure (per-employee components) ────────────
    INSERT INTO salary_structures (
      employee_id, effective_from,
      base_salary, hra, transport_allowance, medical_allowance, special_allowance,
      pf_employee, pf_employer, esi_employee, esi_employer,
      professional_tax, income_tax_tds, is_current
    ) VALUES (
      v_emp_id, '2024-01-01',
      v_base_sal, v_hra, v_ta, v_ma, v_sa,
      v_pf, v_pf,
      CASE WHEN v_base_sal <= 21000 THEN ROUND(v_base_sal*0.0075) ELSE 0 END,
      CASE WHEN v_base_sal <= 21000 THEN ROUND(v_base_sal*0.0325) ELSE 0 END,
      v_pt, v_tds, TRUE
    ) ON CONFLICT DO NOTHING;

    -- ── Leave balances 2025 ───────────────────────────────────
    INSERT INTO leave_balances (employee_id, leave_type_id, year, allotted, used, carried_forward)
    VALUES
      (v_emp_id, 1, 2025, 12, v_cl_used, 0),
      (v_emp_id, 2, 2025, 12, v_sl_used, 0),
      (v_emp_id, 3, 2025, 15, v_el_used, 0)
    ON CONFLICT DO NOTHING;

    -- ── Leave balances 2026 ───────────────────────────────────
    INSERT INTO leave_balances (employee_id, leave_type_id, year, allotted, used, carried_forward)
    VALUES
      (v_emp_id, 1, 2026, 12, v_cl_2026, 0),
      (v_emp_id, 2, 2026, 12, v_sl_2026, 0),
      (v_emp_id, 3, 2026, 15, v_el_2026,
        LEAST(5, GREATEST(0, 15 - v_el_used)))
    ON CONFLICT DO NOTHING;

  END LOOP;
  RAISE NOTICE 'Employee loop complete (EMP012–EMP511).';
END $$;

-- ================================================================
-- STEP 3: Attendance — last 90 days, persona-driven patterns
-- Each persona has different:
--   • Absence rate
--   • WFH rate
--   • Work hours range
--   • Overtime frequency
-- We encode persona in a CTE derived from employee number parity/modulo
-- ================================================================
INSERT INTO attendance (
  employee_id, date, check_in, check_out,
  work_hours, overtime_hours, status, location
)
WITH emp_persona AS (
  -- Derive persona from employee number so it's stable & varied
  SELECT
    e.id,
    e.employee_code,
    -- Use mod of numeric part to assign persona deterministically but spread evenly
    CASE (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20)
      WHEN 0 THEN 1                        -- star (5% = 1/20)
      WHEN 1,2,3,4 THEN 2                  -- wfh-heavy (20% = 4/20)
      WHEN 5,6,7,8,9,10,11,12,13 THEN 3   -- average (45% = 9/20)
      WHEN 14,15,16 THEN 4                 -- poor (15% = 3/20)
      ELSE 5                               -- overworker (15% = 3/20)
    END AS persona
  FROM employees e
  WHERE CAST(SUBSTRING(e.employee_code FROM 4) AS INT) >= 12
),
date_series AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '90 days',
    CURRENT_DATE,
    '1 day'
  )::DATE AS work_date
),
raw AS (
  SELECT
    ep.id AS employee_id,
    ds.work_date,
    ep.persona,
    EXTRACT(DOW FROM ds.work_date) AS dow,
    -- Deterministic-ish seed per employee+date for stable-ish variation
    (CAST(SUBSTRING(ep.employee_code FROM 4) AS INT) * 97
     + EXTRACT(DOY FROM ds.work_date)::INT * 13) % 100 AS seed
  FROM emp_persona ep CROSS JOIN date_series ds
)
SELECT
  employee_id,
  work_date,
  -- Check-in time
  CASE
    WHEN dow IN (0,6) THEN NULL
    WHEN (persona=4 AND seed%10 < 3) THEN NULL   -- poor: 30% absent on weekdays
    WHEN (persona=3 AND seed%10 < 1) THEN NULL   -- avg: 10% absent
    WHEN (persona=1 AND seed%10 < 0) THEN NULL   -- star: almost never absent
    WHEN (persona=5 AND seed%10 < 1) THEN NULL   -- overworker: rare absent
    WHEN (persona=2 AND seed%10 < 1) THEN NULL   -- wfh: 10% absent
    ELSE
      work_date::TIMESTAMP + INTERVAL '9 hours'
      + CASE persona
          WHEN 1 THEN (seed%20 * INTERVAL '1 minute')            -- star: 9:00-9:20
          WHEN 2 THEN (seed%60 * INTERVAL '1 minute')            -- wfh: 9:00-10:00 (flexible)
          WHEN 3 THEN (seed%45 * INTERVAL '1 minute')            -- avg: 9:00-9:45
          WHEN 4 THEN (seed%90 * INTERVAL '1 minute')            -- poor: 9:00-10:30
          ELSE        (seed%15 * INTERVAL '1 minute')            -- overworker: 8:30-9:15
        END
      - CASE WHEN persona=5 THEN INTERVAL '30 minutes' ELSE INTERVAL '0 minutes' END
  END AS check_in,
  -- Check-out time
  CASE
    WHEN dow IN (0,6) THEN NULL
    WHEN (persona=4 AND seed%10 < 3) THEN NULL
    WHEN (persona=3 AND seed%10 < 1) THEN NULL
    WHEN (persona=1 AND seed%10 < 0) THEN NULL
    WHEN (persona=5 AND seed%10 < 1) THEN NULL
    WHEN (persona=2 AND seed%10 < 1) THEN NULL
    ELSE
      work_date::TIMESTAMP + INTERVAL '17 hours'
      + CASE persona
          WHEN 1 THEN (seed%30 * INTERVAL '1 minute')            -- star: 17:00-17:30
          WHEN 2 THEN (seed%120 * INTERVAL '1 minute')           -- wfh: 17:00-19:00 (varies)
          WHEN 3 THEN (seed%60 * INTERVAL '1 minute')            -- avg: 17:00-18:00
          WHEN 4 THEN -(seed%60 * INTERVAL '1 minute')           -- poor: 16:00-17:00 (leaves early)
          ELSE        (seed%180 * INTERVAL '1 minute')           -- overworker: 17:00-20:00
        END
  END AS check_out,
  -- Work hours
  CASE
    WHEN dow IN (0,6) THEN 0
    WHEN (persona=4 AND seed%10 < 3) THEN 0
    WHEN (persona=3 AND seed%10 < 1) THEN 0
    WHEN (persona=2 AND seed%10 < 1) THEN 0
    WHEN (persona=5 AND seed%10 < 1) THEN 0
    ELSE ROUND((CASE persona
      WHEN 1 THEN 8.0 + (seed%20)/20.0           -- star: 8.0–9.0
      WHEN 2 THEN 7.5 + (seed%30)/20.0           -- wfh: 7.5–9.0
      WHEN 3 THEN 7.0 + (seed%35)/20.0           -- avg: 7.0–8.75
      WHEN 4 THEN 5.5 + (seed%30)/20.0           -- poor: 5.5–7.0
      ELSE        9.0 + (seed%40)/20.0           -- overworker: 9.0–11.0
    END)::NUMERIC, 1)
  END AS work_hours,
  -- Overtime hours
  CASE
    WHEN dow IN (0,6) THEN 0
    ELSE ROUND((CASE persona
      WHEN 1 THEN (seed%15)/20.0                 -- star: 0–0.7 hrs
      WHEN 2 THEN (seed%10)/20.0                 -- wfh: 0–0.5 hrs
      WHEN 3 THEN (seed%25)/20.0                 -- avg: 0–1.2 hrs
      WHEN 4 THEN 0                              -- poor: no overtime
      ELSE        (seed%60)/20.0                 -- overworker: 0–3.0 hrs
    END)::NUMERIC, 1)
  END AS overtime_hours,
  -- Status
  CASE
    WHEN dow IN (0,6) THEN 'weekend'
    WHEN persona=4 AND seed%10 < 3 THEN 'absent'
    WHEN persona=3 AND seed%10 < 1 THEN 'absent'
    WHEN persona=2 AND seed%10 < 1 THEN 'absent'
    WHEN persona=5 AND seed%10 < 1 THEN 'absent'
    WHEN persona=2 AND seed%10 < 5 THEN 'work_from_home'   -- wfh-heavy: 50% wfh
    WHEN persona=1 AND seed%10 < 2 THEN 'work_from_home'   -- star: 20% wfh
    WHEN seed%10 < 1 THEN 'work_from_home'                 -- others: 10% wfh
    ELSE 'present'
  END AS status,
  -- Location
  CASE
    WHEN persona=2 AND seed%10 < 5 THEN 'work_from_home'
    WHEN seed%10 < 2 THEN 'work_from_home'
    ELSE 'office'
  END AS location
FROM raw
ON CONFLICT (employee_id, date) DO NOTHING;

-- ================================================================
-- STEP 4: Payroll runs (ensure all months exist)
-- ================================================================
INSERT INTO payroll_runs (pay_period, run_date, status, processed_by,
  total_gross, total_net, total_deductions, notes)
VALUES
  ('2025-09', '2025-09-30', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Sep 2025'),
  ('2025-10', '2025-10-31', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Oct 2025'),
  ('2025-11', '2025-11-30', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Nov 2025'),
  ('2025-12', '2025-12-31', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Dec 2025'),
  ('2026-01', '2026-01-31', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Jan 2026'),
  ('2026-02', '2026-02-28', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Feb 2026'),
  ('2026-03', '2026-03-31', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Mar 2026'),
  ('2026-04', '2026-04-30', 'completed', '22222222-0000-0000-0000-000000000001', 0, 0, 0, 'Apr 2026')
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 5: Payslips — varied bonus months, varied attendance days
-- Bonus month varies per employee (not all get it in Dec/Mar)
-- ================================================================
INSERT INTO payslips (
  payroll_run_id, employee_id, pay_period,
  working_days, days_present, days_absent, days_paid_leave,
  base_salary, hra, transport_allowance, medical_allowance, special_allowance,
  performance_bonus, overtime_pay, other_earnings,
  gross_salary,
  pf_deduction, esi_deduction, professional_tax, income_tax_tds,
  loan_deduction, other_deductions,
  total_deductions, net_salary,
  payment_status, payment_date, payment_method
)
SELECT
  pr.id,
  e.id,
  pr.pay_period,
  26,
  -- days present: persona-based (overworker=24-26, poor=18-22, wfh=22-26, avg=22-25)
  CASE (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20)
    WHEN 0                         THEN (23 + floor(random()*3))::INT  -- star
    WHEN 1,2,3,4                   THEN (22 + floor(random()*4))::INT  -- wfh
    WHEN 5,6,7,8,9,10,11,12,13    THEN (21 + floor(random()*4))::INT  -- avg
    WHEN 14,15,16                  THEN (17 + floor(random()*5))::INT  -- poor
    ELSE                                (24 + floor(random()*3))::INT  -- overworker
  END,
  -- days absent
  CASE (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20)
    WHEN 14,15,16 THEN (floor(random()*4)+2)::INT   -- poor: 2-5 absent
    ELSE               (floor(random()*2))::INT     -- others: 0-1
  END,
  (floor(random()*2))::INT,
  s.base_salary,
  s.hra,
  s.transport_allowance,
  s.medical_allowance,
  s.special_allowance,
  -- Performance bonus: varies by month — Dec and one random month per employee
  CASE
    WHEN pr.pay_period = '2025-12' THEN
      ROUND(s.base_salary * (0.05 + random()*0.12) / 500) * 500
    -- Each employee gets one extra bonus month based on their emp number mod 8
    WHEN pr.pay_period = (ARRAY['2025-09','2025-10','2025-11','2026-01','2026-02','2026-03','2026-04','2025-09'])
         [(CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 8) + 1] THEN
      ROUND(s.base_salary * (0.03 + random()*0.08) / 500) * 500
    ELSE 0
  END,
  -- Overtime pay: overworkers earn overtime, others occasionally
  CASE (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20)
    WHEN 17,18,19 THEN ROUND((300 + random()*1500)::NUMERIC, 2)   -- overworker
    WHEN 0        THEN ROUND((100 + random()*500)::NUMERIC, 2)    -- star
    ELSE               ROUND((random()*300)::NUMERIC, 2)          -- others
  END,
  0,  -- other_earnings

  -- gross (recomputed below)
  0,

  s.pf_employee,
  s.esi_employee,
  s.professional_tax,
  s.income_tax_tds,
  -- Loan deduction: ~15% of employees have a loan
  CASE WHEN (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 7 = 0)
       THEN ROUND(s.base_salary * 0.05 / 500) * 500
       ELSE 0 END,
  0,
  0, 0,  -- total_deductions and net_salary recalculated below
  'paid',
  (pr.run_date + (1 + floor(random()*3))::INT * INTERVAL '1 day')::DATE,
  (ARRAY['bank_transfer','bank_transfer','bank_transfer','neft','rtgs'])
    [(floor(random()*5+1))::INT]
FROM payroll_runs pr
CROSS JOIN employees e
JOIN salary_structures s ON s.employee_id = e.id AND s.is_current = TRUE
WHERE CAST(SUBSTRING(e.employee_code FROM 4) AS INT) >= 12
ON CONFLICT (payroll_run_id, employee_id) DO NOTHING;

-- Fix: set gross, total_deductions, net_salary properly
UPDATE payslips p
SET
  gross_salary = p.base_salary + p.hra + p.transport_allowance
               + p.medical_allowance + p.special_allowance
               + p.performance_bonus + p.overtime_pay,
  total_deductions = p.pf_deduction + p.esi_deduction + p.professional_tax
                   + p.income_tax_tds + p.loan_deduction,
  net_salary = (p.base_salary + p.hra + p.transport_allowance
               + p.medical_allowance + p.special_allowance
               + p.performance_bonus + p.overtime_pay)
             - (p.pf_deduction + p.esi_deduction + p.professional_tax
               + p.income_tax_tds + p.loan_deduction)
FROM employees e
WHERE p.employee_id = e.id
  AND CAST(SUBSTRING(e.employee_code FROM 4) AS INT) >= 12
  AND p.gross_salary = 0;

-- ── Update payroll run totals ─────────────────────────────────────
UPDATE payroll_runs pr
SET
  total_gross      = sub.tg,
  total_net        = sub.tn,
  total_deductions = sub.td
FROM (
  SELECT payroll_run_id,
    SUM(gross_salary)     AS tg,
    SUM(net_salary)       AS tn,
    SUM(total_deductions) AS td
  FROM payslips GROUP BY payroll_run_id
) sub
WHERE pr.id = sub.payroll_run_id;

-- ================================================================
-- STEP 6: Leave requests — non-overlapping, varied reasons
-- Strategy: assign each employee a staggered "slot offset" based
-- on their employee number so dates don't cluster identically
-- ================================================================
INSERT INTO leave_requests (
  employee_id, leave_type_id,
  start_date, end_date, total_days,
  reason, status,
  reviewed_by, reviewed_at, review_comment,
  applied_on
)
SELECT
  e.id,
  req.lt_id,
  req.start_dt::DATE,
  (req.start_dt + (req.days - 1) * INTERVAL '1 day')::DATE,
  req.days,
  req.reason,
  req.status,
  CASE WHEN req.status != 'pending'
       THEN '22222222-0000-0000-0000-000000000002'::UUID
       ELSE NULL END,
  CASE WHEN req.status != 'pending'
       THEN (req.start_dt::TIMESTAMP - INTERVAL '1 day')
       ELSE NULL END,
  CASE req.status
    WHEN 'approved' THEN (ARRAY[
      'Approved as requested.',
      'Approved. Enjoy your time off.',
      'Approved. Please handover before leaving.',
      'Approved. Return refreshed!',
      'Approved. Ensure task completion.',
      'Approved per policy.',
      'Approved. Safe travels.'
    ])[floor(random()*7+1)::INT]
    WHEN 'rejected' THEN (ARRAY[
      'Sprint deadline conflict.',
      'Critical release week, cannot approve.',
      'Too many team members on leave.',
      'Client deliverable in progress.',
      'Please reschedule.',
      'Partially approved — reduce duration.'
    ])[floor(random()*6+1)::INT]
    ELSE NULL
  END,
  (req.start_dt - (2 + floor(random()*5)::INT) * INTERVAL '1 day')::DATE
FROM employees e
-- Use employee number as offset seed to stagger dates
CROSS JOIN LATERAL (
  SELECT * FROM (VALUES
    -- 2025 requests: spaced 3-5 weeks apart per employee, offset by emp num
    (
      1::INT,
      DATE '2025-01-13' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 14) || ' days')::INTERVAL
        + (floor(random()*5))::INT * INTERVAL '1 day',
      (1+floor(random()*2))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      2::INT,
      DATE '2025-02-10' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 14) || ' days')::INTERVAL
        + (floor(random()*5))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=2 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      1::INT,
      DATE '2025-03-17' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 12) || ' days')::INTERVAL
        + (floor(random()*5))::INT * INTERVAL '1 day',
      (1+floor(random()*2))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      CASE WHEN random() < 0.12 THEN 'rejected' ELSE 'approved' END
    ),
    (
      2::INT,
      DATE '2025-04-21' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 10) || ' days')::INTERVAL
        + (floor(random()*5))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=2 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      3::INT,
      DATE '2025-05-05' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20) || ' days')::INTERVAL
        + (floor(random()*3))::INT * INTERVAL '1 day',
      (3+floor(random()*5))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=3 ORDER BY random() LIMIT 1),
      CASE WHEN random() < 0.08 THEN 'rejected' ELSE 'approved' END
    ),
    (
      1::INT,
      DATE '2025-07-07' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 15) || ' days')::INTERVAL
        + (floor(random()*4))::INT * INTERVAL '1 day',
      (1+floor(random()*2))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      2::INT,
      DATE '2025-08-11' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 12) || ' days')::INTERVAL
        + (floor(random()*4))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=2 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      1::INT,
      DATE '2025-10-06' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 12) || ' days')::INTERVAL
        + (floor(random()*3))::INT * INTERVAL '1 day',
      (1+floor(random()*2))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      CASE WHEN random() < 0.10 THEN 'rejected' ELSE 'approved' END
    ),
    (
      2::INT,
      DATE '2025-11-10' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 14) || ' days')::INTERVAL
        + (floor(random()*4))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=2 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    -- 2026 requests
    (
      1::INT,
      DATE '2026-01-06' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 18) || ' days')::INTERVAL
        + (floor(random()*4))::INT * INTERVAL '1 day',
      (1+floor(random()*2))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      2::INT,
      DATE '2026-02-03' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 20) || ' days')::INTERVAL
        + (floor(random()*4))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=2 ORDER BY random() LIMIT 1),
      'approved'::TEXT
    ),
    (
      3::INT,
      DATE '2026-03-10' + ((CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 15) || ' days')::INTERVAL
        + (floor(random()*3))::INT * INTERVAL '1 day',
      (3+floor(random()*4))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=3 ORDER BY random() LIMIT 1),
      CASE WHEN random() < 0.10 THEN 'rejected' ELSE 'approved' END
    ),
    -- Future pending
    (
      1::INT,
      CURRENT_DATE + (5 + (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 25))::INT * INTERVAL '1 day',
      (1+floor(random()*3))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=1 ORDER BY random() LIMIT 1),
      'pending'::TEXT
    ),
    (
      3::INT,
      CURRENT_DATE + (20 + (CAST(SUBSTRING(e.employee_code FROM 4) AS INT) % 30))::INT * INTERVAL '1 day',
      (3+floor(random()*5))::INT,
      (SELECT reason FROM _tmp_reasons WHERE leave_type=3 ORDER BY random() LIMIT 1),
      'pending'::TEXT
    )
  ) AS t(lt_id, start_dt, days, reason, status)
) AS req
WHERE CAST(SUBSTRING(e.employee_code FROM 4) AS INT) >= 12
  AND NOT EXISTS (
    SELECT 1 FROM leave_requests x
    WHERE x.employee_id = e.id
      AND x.start_date <= (req.start_dt + (req.days - 1) * INTERVAL '1 day')::DATE
      AND x.end_date   >= req.start_dt::DATE
  )
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 7: Cleanup
-- ================================================================
DROP TABLE IF EXISTS _tmp_fn;
DROP TABLE IF EXISTS _tmp_ln;
DROP TABLE IF EXISTS _tmp_jobs;
DROP TABLE IF EXISTS _tmp_reasons;

-- ================================================================
-- STEP 8: Final summary
-- ================================================================
SELECT '=== PaySphereX — Varied Bulk Load Summary ===' AS info;
SELECT
  'Total Employees'          AS metric, COUNT(*)::TEXT AS value FROM employees
UNION ALL SELECT
  'New Employees (EMP012+)', COUNT(*)::TEXT FROM employees
  WHERE CAST(SUBSTRING(employee_code FROM 4) AS INT) >= 12
UNION ALL SELECT
  'Active Employees',        COUNT(*)::TEXT FROM employees WHERE is_active = TRUE
UNION ALL SELECT
  'Full-time',               COUNT(*)::TEXT FROM employees WHERE employment_type = 'Full-time'
UNION ALL SELECT
  'Contract / Intern / PT',  COUNT(*)::TEXT FROM employees
  WHERE employment_type IN ('Contract','Intern','Part-time')
UNION ALL SELECT
  'Salary Structures',       COUNT(*)::TEXT FROM salary_structures
UNION ALL SELECT
  'Leave Balances 2025',     COUNT(*)::TEXT FROM leave_balances WHERE year = 2025
UNION ALL SELECT
  'Leave Balances 2026',     COUNT(*)::TEXT FROM leave_balances WHERE year = 2026
UNION ALL SELECT
  'Attendance Records',      COUNT(*)::TEXT FROM attendance
UNION ALL SELECT
  'Payroll Runs',            COUNT(*)::TEXT FROM payroll_runs
UNION ALL SELECT
  'Payslips Total',          COUNT(*)::TEXT FROM payslips
UNION ALL SELECT
  'Leave Requests Total',    COUNT(*)::TEXT FROM leave_requests
UNION ALL SELECT
  'Pending Leaves',          COUNT(*)::TEXT FROM leave_requests WHERE status = 'pending'
UNION ALL SELECT
  'Rejected Leaves',         COUNT(*)::TEXT FROM leave_requests WHERE status = 'rejected'
ORDER BY 1;

-- Department breakdown
SELECT
  d.name AS department,
  COUNT(e.id) AS headcount,
  ROUND(AVG(s.base_salary)) AS avg_base_salary,
  COUNT(CASE WHEN e.employment_type='Full-time' THEN 1 END) AS fulltime,
  COUNT(CASE WHEN e.employment_type != 'Full-time' THEN 1 END) AS other
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN salary_structures s ON s.employee_id = e.id AND s.is_current = TRUE
WHERE CAST(SUBSTRING(e.employee_code FROM 4) AS INT) >= 12
GROUP BY d.name ORDER BY headcount DESC;