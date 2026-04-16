# 🚀 PaySphereX — Complete Setup & Run Guide

## Prerequisites
| Tool       | Version  | Check |
|------------|----------|-------|
| Node.js    | ≥ 18     | `node -v` |
| npm        | ≥ 9      | `npm -v` |
| Python     | ≥ 3.10   | `python --version` |
| PostgreSQL | ≥ 14     | `psql --version` |
| Docker     | optional | `docker -v` |

---

## Option A — Manual Setup (Development)

### 1. Clone & Navigate
```bash
git clone https://github.com/yourname/PaySphereX.git
cd PaySphereX
```

---

### 2. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE paysphere_db;"

# Run schema
psql -U postgres -d paysphere_db -f database/schema.sql

# Seed sample data
psql -U postgres -d paysphere_db -f database/seeds.sql
```

---

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Edit .env — set your DB password and JWT secrets
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/paysphere_db
# JWT_SECRET=your_super_secret_64_char_key_here_please_change_this

# Start backend (development with hot reload)
npm run dev

# Backend runs at: http://localhost:5000
# Health check:    http://localhost:5000/health
```

---

### 4. Python ML API Setup
```bash
cd data_science

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train ML models (generates synthetic data + trains all 3 models)
python models/ml_models.py

# Start ML API
uvicorn ml_api:app --host 0.0.0.0 --port 8000 --reload

# ML API runs at: http://localhost:8000
# Docs:           http://localhost:8000/docs
```

---

### 5. Run ETL Pipeline (optional — for data warehouse)
```bash
cd data_science

# Extract & Transform (reads from DB → saves to etl/processed/)
python etl/extract_transform.py

# Load into data warehouse schema
python etl/load_warehouse.py
```

---

### 6. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create env file
echo "REACT_APP_API_URL=http://localhost:5000/api/v1" > .env

# Start React dev server
npm start

# Frontend runs at: http://localhost:3000
```

---

## Option B — Docker Compose (One-command)

```bash
# Build and start all services
docker-compose up --build

# Services:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:5000
# ML API:    http://localhost:8000
# Database:  localhost:5432
```

To stop:
```bash
docker-compose down
# To remove volumes (fresh start):
docker-compose down -v
```

---

## 🔑 Demo Login Credentials

| Role     | Email                           | Password      |
|----------|---------------------------------|---------------|
| Admin    | arjun.sharma@paysphere.com      | Password@123  |
| HR       | priya.patel@paysphere.com       | Password@123  |
| Manager  | rohit.verma@paysphere.com       | Password@123  |
| Employee | sneha.iyer@paysphere.com        | Password@123  |
| Employee | meena.krishnan@paysphere.com    | Password@123  |

---

## 🗂️ Complete Folder Structure

```
PaySphereX/
│
├── database/
│   ├── schema.sql          ← Full PostgreSQL schema + star schema DW
│   └── seeds.sql           ← Sample data (10 employees, balances, etc.)
│
├── backend/
│   ├── src/
│   │   ├── index.js        ← Express app entry point
│   │   ├── db/
│   │   │   └── pool.js     ← PostgreSQL connection pool
│   │   ├── controllers/
│   │   │   ├── auth.controller.js       ← JWT login/refresh/logout
│   │   │   ├── payroll.controller.js    ← Salary calc + PDF
│   │   │   ├── leave.controller.js      ← Full leave management
│   │   │   ├── attendance.controller.js ← Check-in/out
│   │   │   └── analytics.controller.js  ← Dashboard + ML calls
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── employee.routes.js
│   │   │   ├── payroll.routes.js
│   │   │   ├── leave.routes.js
│   │   │   ├── attendance.routes.js
│   │   │   ├── analytics.routes.js
│   │   │   └── department.routes.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js       ← JWT protect + RBAC authorize
│   │   │   ├── errorHandler.js
│   │   │   └── validate.middleware.js
│   │   └── utils/
│   │       ├── AppError.js
│   │       └── logger.js
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── index.css           ← Complete design system
│   │   ├── context/
│   │   │   └── AuthContext.js  ← Auth state + token management
│   │   ├── services/
│   │   │   └── api.js          ← Axios + all API helpers
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.js
│   │   │   │   ├── Sidebar.js
│   │   │   │   └── Header.js
│   │   │   └── ui/
│   │   │       └── LoadingScreen.js
│   │   └── pages/
│   │       ├── Login.js        ← Animated dual-panel login
│   │       ├── Dashboard.js    ← KPIs + charts
│   │       ├── Employees.js    ← Searchable table + pagination
│   │       ├── EmployeeDetail.js
│   │       ├── Payroll.js      ← Process + payslips + charts
│   │       ├── PayslipDetail.js
│   │       ├── Leaves.js       ← Apply + approve + balance cards
│   │       ├── Attendance.js   ← Check-in/out + calendar
│   │       ├── Analytics.js    ← ML predictions + anomalies
│   │       ├── Profile.js
│   │       └── NotFound.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── data_science/
│   ├── etl/
│   │   ├── extract_transform.py  ← Full ETL: extract + feature engineering
│   │   └── load_warehouse.py     ← Star schema DW loader
│   ├── models/
│   │   ├── ml_models.py          ← AttritionPredictor, SickLeaveModel, AnomalyDetector
│   │   └── saved_models/         ← Pickled model files (after training)
│   ├── ml_api.py                 ← FastAPI ML prediction server
│   ├── requirements.txt
│   └── Dockerfile.ml
│
├── docker-compose.yml
├── README.md
└── SETUP.md
```

---

## 📡 API Endpoints Reference

### Auth
| Method | Endpoint                          | Access     |
|--------|-----------------------------------|------------|
| POST   | `/api/v1/auth/login`              | Public     |
| POST   | `/api/v1/auth/refresh`            | Public     |
| POST   | `/api/v1/auth/logout`             | Protected  |
| GET    | `/api/v1/auth/me`                 | Protected  |
| PATCH  | `/api/v1/auth/change-password`    | Protected  |

### Employees
| Method | Endpoint                          | Access       |
|--------|-----------------------------------|--------------|
| GET    | `/api/v1/employees`               | Admin/HR/Mgr |
| GET    | `/api/v1/employees/:id`           | All          |
| POST   | `/api/v1/employees`               | Admin/HR     |
| PUT    | `/api/v1/employees/:id`           | Admin/HR     |
| PATCH  | `/api/v1/employees/:id/deactivate`| Admin/HR     |

### Payroll
| Method | Endpoint                          | Access       |
|--------|-----------------------------------|--------------|
| POST   | `/api/v1/payroll/process`         | Admin/HR     |
| GET    | `/api/v1/payroll/runs`            | Admin/HR     |
| GET    | `/api/v1/payroll/payslips`        | All (filtered)|
| GET    | `/api/v1/payroll/payslips/:id/pdf`| All (own)    |
| GET    | `/api/v1/payroll/salary/:empId`   | All (own)    |
| PUT    | `/api/v1/payroll/salary/:empId`   | Admin/HR     |

### Leave
| Method | Endpoint                     | Access       |
|--------|------------------------------|--------------|
| POST   | `/api/v1/leaves/apply`       | All          |
| PATCH  | `/api/v1/leaves/:id/review`  | HR/Manager   |
| PATCH  | `/api/v1/leaves/:id/cancel`  | Owner/HR     |
| GET    | `/api/v1/leaves`             | All (filtered)|
| GET    | `/api/v1/leaves/types`       | All          |
| GET    | `/api/v1/leaves/balance`     | All (own)    |
| GET    | `/api/v1/leaves/summary`     | All          |

### Attendance
| Method | Endpoint                        | Access   |
|--------|---------------------------------|----------|
| POST   | `/api/v1/attendance/check-in`   | All      |
| POST   | `/api/v1/attendance/check-out`  | All      |
| GET    | `/api/v1/attendance`            | All      |
| GET    | `/api/v1/attendance/summary`    | All      |
| POST   | `/api/v1/attendance/bulk`       | Admin/HR |

### Analytics
| Method | Endpoint                      | Access       |
|--------|-------------------------------|--------------|
| GET    | `/api/v1/analytics/dashboard` | All          |
| GET    | `/api/v1/analytics/payroll`   | Admin/HR/Mgr |
| GET    | `/api/v1/analytics/leave`     | All          |
| GET    | `/api/v1/analytics/attendance`| All          |
| GET    | `/api/v1/analytics/attrition` | Admin/HR     |
| GET    | `/api/v1/analytics/anomalies` | Admin/HR     |

### ML API (port 8000)
| Method | Endpoint                        |
|--------|---------------------------------|
| GET    | `/health`                       |
| GET    | `/predict/attrition`            |
| POST   | `/predict/attrition/single`     |
| POST   | `/predict/sick-leave`           |
| POST   | `/predict/anomaly`              |
| POST   | `/predict/anomaly/batch`        |
| POST   | `/admin/retrain`                |

---

## 🤖 ML Models Summary

| Model | Algorithm | Target | Key Features |
|-------|-----------|--------|--------------|
| Attrition Predictor | RandomForest (200 trees) | Will employee leave? | Salary, absenteeism, overtime, tenure |
| Sick Leave Predictor | GradientBoosting | Sick leave next 30d? | Rolling 3/6-month leave history |
| Salary Anomaly Detector | Isolation Forest | Anomalous payslip? | Net>Gross, deduction ratio, tax rate |

---

## 🗄️ Star Schema (Data Warehouse)

```
                    ┌──────────────┐
                    │ dim_employee │
                    └──────┬───────┘
                           │
┌───────────┐   ┌──────────▼──────────┐   ┌──────────────┐
│ dim_time  ├───┤    fact_payroll      ├───┤dim_department│
└───────────┘   └─────────────────────┘   └──────────────┘

┌───────────┐   ┌──────────▼──────────┐   ┌──────────────┐
│ dim_time  ├───┤   fact_attendance   ├───┤dim_department│
└───────────┘   └─────────────────────┘   └──────────────┘

┌───────────┐   ┌──────────▼──────────┐   ┌──────────────────┐
│ dim_time  ├───┤     fact_leave      ├───┤  dim_leave_type  │
└───────────┘   └─────────────────────┘   └──────────────────┘
```

---

## 🔐 Security Features

- ✅ JWT access tokens (15 min expiry) + refresh tokens (7 days)
- ✅ Refresh token rotation (old token revoked on each refresh)
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Role-based access control (Admin / HR / Manager / Employee)
- ✅ Rate limiting (300 req/15min API, 10 req/15min auth)
- ✅ Helmet.js security headers
- ✅ CORS whitelist
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Audit log trail

---

## 📊 Power BI / Dashboard Instructions

To connect Power BI to PaySphereX data warehouse:

1. Open Power BI Desktop
2. Get Data → PostgreSQL
3. Server: `localhost:5432` | Database: `paysphere_db`
4. Connect to `dw` schema tables
5. Suggested reports:
   - **Payroll Overview**: fact_payroll + dim_employee + dim_time
   - **Leave Analysis**: fact_leave + dim_leave_type + dim_department
   - **Attendance Heatmap**: fact_attendance + dim_time + dim_employee
   - **Salary Distribution**: fact_payroll grouped by salary bands
   - **Attrition Risk**: Connect to ML API `/predict/attrition`

---

*Built with ❤️ — PaySphereX v1.0.0*
