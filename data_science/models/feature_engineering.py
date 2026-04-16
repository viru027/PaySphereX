"""
PaySphereX - Feature Engineering for ML Models
Builds consolidated ML-ready feature set from processed data
"""
import pandas as pd
import numpy as np
import os, sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_DIR


def build_employee_features() -> pd.DataFrame:
    """
    Create one row per employee with rich features for all ML models.
    Aggregates attendance, leave, and payroll data per employee.
    """
    emp  = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, "employees_processed.csv"))
    att  = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, "attendance_processed.csv"))
    pay  = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, "payroll_processed.csv"))
    lea  = pd.read_csv(os.path.join(PROCESSED_DATA_DIR, "leaves_processed.csv"))

    # --- Attendance features ---
    att['work_hours'] = pd.to_numeric(att['work_hours'], errors='coerce').fillna(0)
    att['is_late']    = att['is_late'].astype(str).str.lower() == 'true'

    att_feat = att.groupby('employee_id').agg(
        total_att_records   = ('attendance_date', 'count'),
        avg_work_hours      = ('work_hours', 'mean'),
        total_absent_days   = ('status', lambda x: (x == 'Absent').sum()),
        total_present_days  = ('status', lambda x: (x == 'Present').sum()),
        total_wfh_days      = ('status', lambda x: (x == 'WFH').sum()),
        late_arrivals       = ('is_late', 'sum'),
        attendance_rate     = ('status', lambda x: (x.isin(['Present','WFH','Half-Day'])).mean() * 100),
    ).reset_index()

    # --- Leave features ---
    lea['total_days'] = pd.to_numeric(lea['total_days'], errors='coerce').fillna(0)
    lea['is_sick']    = lea['is_sick'].astype(str).str.lower() == 'true'

    lea_feat = lea.groupby('employee_id').agg(
        total_leaves       = ('total_days', 'sum'),
        leave_applications = ('employee_id', 'count'),
        sick_leave_days    = ('total_days', lambda x: x[lea.loc[x.index,'is_sick']].sum()),
        approved_leaves    = ('is_approved', lambda x: (x.astype(str).str.lower()=='true').sum()),
        avg_leave_duration = ('total_days', 'mean'),
    ).reset_index()

    # --- Payroll features ---
    pay['net_salary']        = pd.to_numeric(pay['net_salary'], errors='coerce').fillna(0)
    pay['performance_bonus'] = pd.to_numeric(pay['performance_bonus'], errors='coerce').fillna(0)
    pay['gross_salary']      = pd.to_numeric(pay['gross_salary'], errors='coerce').fillna(0)

    pay_feat = pay.groupby('employee_id').agg(
        avg_net_salary      = ('net_salary', 'mean'),
        salary_stddev       = ('net_salary', 'std'),
        avg_bonus           = ('performance_bonus', 'mean'),
        max_salary          = ('net_salary', 'max'),
        min_salary          = ('net_salary', 'min'),
        avg_gross_salary    = ('gross_salary', 'mean'),
    ).reset_index()
    pay_feat['salary_cv'] = pay_feat['salary_stddev'] / (pay_feat['avg_net_salary'] + 1)

    # --- Employee base features ---
    emp['base_salary']  = pd.to_numeric(emp['base_salary'],  errors='coerce').fillna(0)
    emp['tenure_years'] = pd.to_numeric(emp['tenure_years'], errors='coerce').fillna(0)
    emp['age']          = pd.to_numeric(emp['age'],          errors='coerce').fillna(30)

    emp_base = emp[['id','department','job_title','employment_type','gender',
                    'base_salary','tenure_years','age','salary_band']].rename(columns={'id':'employee_id'})

    # --- Merge all features ---
    features = emp_base \
        .merge(att_feat, on='employee_id', how='left') \
        .merge(lea_feat, on='employee_id', how='left') \
        .merge(pay_feat, on='employee_id', how='left')

    # Fill nulls
    numeric_cols = features.select_dtypes(include='number').columns
    features[numeric_cols] = features[numeric_cols].fillna(0)

    # --- Encode categoricals ---
    features['gender_enc'] = (features['gender'].str.lower() == 'male').astype(int)
    features['dept_enc']   = features['department'].astype('category').cat.codes
    features['type_enc']   = features['employment_type'].astype('category').cat.codes
    features['band_enc']   = features['salary_band'].astype('category').cat.codes

    # --- Derived risk indicators ---
    features['high_absenteeism']  = (features['attendance_rate'] < 75).astype(int)
    features['high_sick_leave']   = (features['sick_leave_days'] > 8).astype(int)
    features['salary_variability'] = features['salary_cv']
    features['bonus_rate']         = features['avg_bonus'] / (features['avg_gross_salary'] + 1) * 100

    out_path = os.path.join(PROCESSED_DATA_DIR, "ml_features.csv")
    features.to_csv(out_path, index=False)
    print(f"Feature matrix saved: {features.shape} → {out_path}")
    return features


if __name__ == "__main__":
    df = build_employee_features()
    print(df.describe())
