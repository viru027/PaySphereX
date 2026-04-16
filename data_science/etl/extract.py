"""
PaySphereX ETL Pipeline - Extract Phase
Extracts raw data from CSV files and source databases
"""
import pandas as pd
import logging
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import RAW_DATA_DIR

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def extract_employees() -> pd.DataFrame:
    """Extract employee raw data from CSV."""
    path = os.path.join(RAW_DATA_DIR, "employees.csv")
    logger.info(f"Extracting employees from {path}")
    df = pd.read_csv(path, dtype=str)
    logger.info(f"Extracted {len(df)} employee records")
    return df


def extract_attendance() -> pd.DataFrame:
    """Extract attendance raw data from CSV."""
    path = os.path.join(RAW_DATA_DIR, "attendance.csv")
    logger.info(f"Extracting attendance from {path}")
    df = pd.read_csv(path, dtype=str)
    logger.info(f"Extracted {len(df)} attendance records")
    return df


def extract_payroll() -> pd.DataFrame:
    """Extract payroll raw data from CSV."""
    path = os.path.join(RAW_DATA_DIR, "payroll.csv")
    logger.info(f"Extracting payroll from {path}")
    df = pd.read_csv(path, dtype=str)
    logger.info(f"Extracted {len(df)} payroll records")
    return df


def extract_leaves() -> pd.DataFrame:
    """Extract leave applications raw data from CSV."""
    path = os.path.join(RAW_DATA_DIR, "leaves.csv")
    logger.info(f"Extracting leaves from {path}")
    df = pd.read_csv(path, dtype=str)
    logger.info(f"Extracted {len(df)} leave records")
    return df


def extract_all() -> dict:
    """Extract all data sources and return as dictionary of DataFrames."""
    return {
        "employees": extract_employees(),
        "attendance": extract_attendance(),
        "payroll": extract_payroll(),
        "leaves": extract_leaves(),
    }


if __name__ == "__main__":
    data = extract_all()
    for name, df in data.items():
        print(f"{name}: {df.shape}")
