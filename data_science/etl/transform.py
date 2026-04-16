"""
PaySphereX ETL Pipeline - Transform Phase
Cleans, normalizes, and feature-engineers raw data
"""
import pandas as pd
import numpy as np
import logging
from datetime import date

logger = logging.getLogger(__name__)


def transform_employees(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and enrich employee data."""
    logger.info("Transforming employees...")
    df = df.copy()

    # Type coercions
    df['base_salary'] = pd.to_numeric(df['base_salary'], errors='coerce').fillna(0)
    df['hra']         = pd.to_numeric(df['hra'],         errors='coerce').fillna(0)
    df['ta']          = pd.to_numeric(df['ta'],          errors='coerce').fillna(0)
    df['da']          = pd.to_numeric(df['da'],          errors='coerce').fillna(0)
    df['hire_date']   = pd.to_datetime(df['hire_date'], errors='coerce')
    df['date_of_birth'] = pd.to_datetime(df['date_of_birth'], errors='coerce')

    today = pd.Timestamp(date.today())

    # Feature engineering
    df['tenure_days']  = (today - df['hire_date']).dt.days
    df['tenure_years'] = (df['tenure_days'] / 365).round(2)
    df['age']          = ((today - df['date_of_birth']).dt.days / 365).astype(int)
    df['gross_salary'] = df['base_salary'] + df['hra'] + df['ta'] + df['da']
    df['salary_band']  = pd.cut(
        df['base_salary'],
        bins=[0, 50000, 100000, 150000, float('inf')],
        labels=['Entry', 'Mid', 'Senior', 'Executive']
    )

    # Normalize text
    df['status']     = df['status'].str.strip().str.title()
    df['gender']     = df['gender'].str.strip().str.title()
    df['department'] = df['department'].str.strip()

    # Drop rows with no employee_id
    df.dropna(subset=['id'], inplace=True)

    logger.info(f"Employees transformed: {len(df)} rows")
    return df


def transform_attendance(df: pd.DataFrame, emp_df: pd.DataFrame) -> pd.DataFrame:
    """Clean attendance data and engineer time features."""
    logger.info("Transforming attendance...")
    df = df.copy()

    df['attendance_date'] = pd.to_datetime(df['attendance_date'], errors='coerce')
    df['check_in']        = pd.to_datetime(df['check_in'],  errors='coerce')
    df['check_out']       = pd.to_datetime(df['check_out'], errors='coerce')
    df['work_hours']      = pd.to_numeric(df['work_hours'], errors='coerce').fillna(0)

    # Time features
    df['day_of_week']  = df['attendance_date'].dt.dayofweek
    df['week_of_year'] = df['attendance_date'].dt.isocalendar().week.astype(int)
    df['month']        = df['attendance_date'].dt.month
    df['year']         = df['attendance_date'].dt.year
    df['check_in_hour'] = df['check_in'].dt.hour.fillna(-1).astype(int)

    # Derived flags
    df['is_late']       = df['check_in_hour'].apply(lambda h: h > 9 if h != -1 else False)
    df['is_early_exit'] = df['work_hours'] < 6

    # Attendance score (0-100)
    df['att_score'] = df['work_hours'].clip(0, 9) / 9 * 100

    # Merge department from employees
    emp_dept = emp_df[['id', 'department']].rename(columns={'id': 'employee_id'})
    df = df.merge(emp_dept, on='employee_id', how='left')

    df.dropna(subset=['employee_id', 'attendance_date'], inplace=True)
    logger.info(f"Attendance transformed: {len(df)} rows")
    return df


def transform_payroll(df: pd.DataFrame, emp_df: pd.DataFrame) -> pd.DataFrame:
    """Clean and enrich payroll data."""
    logger.info("Transforming payroll...")
    df = df.copy()

    numeric_cols = ['base_salary','hra','ta','da','performance_bonus',
                    'gross_salary','pf_deduction','esi_deduction','income_tax','net_salary']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df['payroll_month'] = pd.to_numeric(df['payroll_month'], errors='coerce').astype(int)
    df['payroll_year']  = pd.to_numeric(df['payroll_year'],  errors='coerce').astype(int)

    # Feature engineering
    df['effective_tax_rate'] = np.where(
        df['gross_salary'] > 0,
        (df['income_tax'] / df['gross_salary'] * 100).round(2), 0
    )
    df['bonus_pct']     = np.where(df['base_salary'] > 0, df['performance_bonus'] / df['base_salary'] * 100, 0)
    df['deduction_pct'] = np.where(df['gross_salary'] > 0,
                                   (df['pf_deduction'] + df['esi_deduction'] + df['income_tax']) / df['gross_salary'] * 100, 0)

    # Merge department
    emp_dept = emp_df[['id', 'department', 'tenure_years', 'salary_band']].rename(columns={'id': 'employee_id'})
    df = df.merge(emp_dept, on='employee_id', how='left')

    df.dropna(subset=['employee_id'], inplace=True)
    logger.info(f"Payroll transformed: {len(df)} rows")
    return df


def transform_leaves(df: pd.DataFrame, emp_df: pd.DataFrame) -> pd.DataFrame:
    """Clean and enrich leave data."""
    logger.info("Transforming leaves...")
    df = df.copy()

    df['start_date'] = pd.to_datetime(df['start_date'], errors='coerce')
    df['end_date']   = pd.to_datetime(df['end_date'],   errors='coerce')
    df['total_days'] = pd.to_numeric(df['total_days'],  errors='coerce').fillna(0).astype(int)

    df['month']       = df['start_date'].dt.month
    df['year']        = df['start_date'].dt.year
    df['quarter']     = df['start_date'].dt.quarter
    df['is_approved'] = df['status'].str.strip() == 'Approved'
    df['is_sick']     = df['leave_type'].str.strip() == 'SL'
    df['is_weekend_start'] = df['start_date'].dt.dayofweek >= 5

    # Merge department & tenure
    emp_info = emp_df[['id','department','tenure_years','age','salary_band']].rename(columns={'id':'employee_id'})
    df = df.merge(emp_info, on='employee_id', how='left')

    df.dropna(subset=['employee_id', 'start_date'], inplace=True)
    logger.info(f"Leaves transformed: {len(df)} rows")
    return df


def transform_all(raw: dict) -> dict:
    """Run all transformation steps."""
    emp_t  = transform_employees(raw['employees'])
    att_t  = transform_attendance(raw['attendance'], emp_t)
    pay_t  = transform_payroll(raw['payroll'], emp_t)
    lea_t  = transform_leaves(raw['leaves'], emp_t)
    return {
        "employees": emp_t,
        "attendance": att_t,
        "payroll": pay_t,
        "leaves": lea_t,
    }


if __name__ == "__main__":
    from extract import extract_all
    raw = extract_all()
    transformed = transform_all(raw)
    for name, df in transformed.items():
        print(f"{name}: {df.shape}, columns: {list(df.columns)[:8]}")
