"""PaySphereX Data Science Configuration"""
import os

# Database connections
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", 5432),
    "database": os.getenv("DB_NAME", "paysphere"),
    "user": os.getenv("DB_USER", "paysphere_user"),
    "password": os.getenv("DB_PASSWORD", "paysphere_pass"),
}

WAREHOUSE_CONFIG = {
    "host": os.getenv("DWH_HOST", "localhost"),
    "port": os.getenv("DWH_PORT", 5433),
    "database": os.getenv("DWH_NAME", "paysphere_dw"),
    "user": os.getenv("DWH_USER", "paysphere_user"),
    "password": os.getenv("DWH_PASSWORD", "paysphere_pass"),
}

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models", "saved")

# ETL settings
BATCH_SIZE = 1000
LOG_LEVEL = "INFO"

# Model versions
MODEL_VERSIONS = {
    "leave_prediction": "v1.0",
    "attrition_prediction": "v1.0",
    "salary_anomaly": "v1.0",
}
