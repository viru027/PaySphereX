"""
PaySphereX ETL Pipeline - Load Phase
Saves processed data to CSV (warehouse-ready) and optionally to PostgreSQL
"""
import pandas as pd
import logging
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_DIR

logger = logging.getLogger(__name__)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)


def load_to_csv(dataframes: dict) -> None:
    """Save all transformed DataFrames to processed CSVs."""
    for name, df in dataframes.items():
        path = os.path.join(PROCESSED_DATA_DIR, f"{name}_processed.csv")
        df.to_csv(path, index=False)
        logger.info(f"Saved {name} → {path} ({len(df)} rows)")


def load_dim_time(start_year: int = 2020, end_year: int = 2026) -> pd.DataFrame:
    """Generate dim_time table rows."""
    import calendar
    rows = []
    dt = pd.Timestamp(f"{start_year}-01-01")
    end = pd.Timestamp(f"{end_year}-12-31")
    key = 1
    while dt <= end:
        rows.append({
            "time_key": key,
            "full_date": dt.date().isoformat(),
            "day": dt.day,
            "month": dt.month,
            "month_name": dt.strftime("%B"),
            "quarter": dt.quarter,
            "year": dt.year,
            "week_of_year": dt.isocalendar()[1],
            "day_of_week": dt.dayofweek,
            "day_name": dt.strftime("%A"),
            "is_weekend": dt.dayofweek >= 5,
            "is_holiday": False
        })
        dt += pd.Timedelta(days=1)
        key += 1
    df = pd.DataFrame(rows)
    path = os.path.join(PROCESSED_DATA_DIR, "dim_time.csv")
    df.to_csv(path, index=False)
    logger.info(f"Generated dim_time: {len(df)} rows → {path}")
    return df


def build_fact_payroll(payroll_df: pd.DataFrame, emp_df: pd.DataFrame,
                       time_df: pd.DataFrame) -> pd.DataFrame:
    """Build fact_payroll from transformed data."""
    # Create date column for joining with dim_time
    payroll_df = payroll_df.copy()
    payroll_df['full_date'] = pd.to_datetime(
        payroll_df['payroll_year'].astype(str) + '-' +
        payroll_df['payroll_month'].astype(str).str.zfill(2) + '-01'
    ).dt.date.astype(str)

    # Join with time dimension
    merged = payroll_df.merge(time_df[['time_key','full_date']], on='full_date', how='left')

    # Employee key mapping
    emp_key = emp_df[['id','department']].reset_index().rename(
        columns={'index': 'employee_key', 'id': 'employee_id'})
    emp_key['employee_key'] += 1
    merged = merged.merge(emp_key[['employee_key','employee_id']], on='employee_id', how='left')

    fact = merged[[
        'time_key','employee_key','payroll_month','payroll_year',
        'base_salary','gross_salary','pf_deduction','esi_deduction',
        'income_tax','net_salary','performance_bonus','deduction_pct'
    ]].copy()
    fact['attendance_pct'] = None  # Would be filled from attendance data

    path = os.path.join(PROCESSED_DATA_DIR, "fact_payroll.csv")
    fact.to_csv(path, index=False)
    logger.info(f"fact_payroll: {len(fact)} rows → {path}")
    return fact


def build_fact_attendance(att_df: pd.DataFrame, emp_df: pd.DataFrame,
                          time_df: pd.DataFrame) -> pd.DataFrame:
    """Build fact_attendance from transformed data."""
    att_df = att_df.copy()
    att_df['full_date'] = att_df['attendance_date'].dt.date.astype(str)

    merged = att_df.merge(time_df[['time_key','full_date']], on='full_date', how='left')

    emp_key = emp_df[['id']].reset_index().rename(
        columns={'index': 'employee_key', 'id': 'employee_id'})
    emp_key['employee_key'] += 1
    merged = merged.merge(emp_key, on='employee_id', how='left')

    fact = merged[[
        'time_key','employee_key','check_in_hour','work_hours',
        'is_late','is_early_exit','status','location'
    ]].copy()

    path = os.path.join(PROCESSED_DATA_DIR, "fact_attendance.csv")
    fact.to_csv(path, index=False)
    logger.info(f"fact_attendance: {len(fact)} rows → {path}")
    return fact


def build_fact_leave(leave_df: pd.DataFrame, emp_df: pd.DataFrame,
                     time_df: pd.DataFrame) -> pd.DataFrame:
    """Build fact_leave from transformed data."""
    leave_df = leave_df.copy()
    leave_df['full_date'] = leave_df['start_date'].dt.date.astype(str)

    merged = leave_df.merge(time_df[['time_key','full_date']], on='full_date', how='left')

    emp_key = emp_df[['id']].reset_index().rename(
        columns={'index': 'employee_key', 'id': 'employee_id'})
    emp_key['employee_key'] += 1
    merged = merged.merge(emp_key, on='employee_id', how='left')

    fact = merged[[
        'time_key','employee_key','total_days','is_approved',
        'is_sick','month','year','leave_type'
    ]].rename(columns={'leave_type':'leave_code'})

    path = os.path.join(PROCESSED_DATA_DIR, "fact_leave.csv")
    fact.to_csv(path, index=False)
    logger.info(f"fact_leave: {len(fact)} rows → {path}")
    return fact


if __name__ == "__main__":
    from extract import extract_all
    from transform import transform_all
    logging.basicConfig(level=logging.INFO)
    raw = extract_all()
    transformed = transform_all(raw)
    load_to_csv(transformed)
    time_df = load_dim_time()
    build_fact_payroll(transformed['payroll'], transformed['employees'], time_df)
    build_fact_attendance(transformed['attendance'], transformed['employees'], time_df)
    build_fact_leave(transformed['leaves'], transformed['employees'], time_df)
    print("ETL Load phase complete.")
