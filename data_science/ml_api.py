"""
PaySphereX — Python ML API (FastAPI)
=====================================
Serves ML model predictions as REST endpoints.
Run: uvicorn ml_api:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import pickle
import logging
from pathlib import Path
from typing import Optional, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("PaySphereX.MLAPI")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(
    title="PaySphereX ML API",
    description="Machine Learning endpoints for attrition, leave, and anomaly detection",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = Path(__file__).parent / "models" / "saved_models"

# ── Load models at startup ────────────────────────────────
models = {}

@app.on_event("startup")
def load_models():
    global models
    for name, fname in [
        ("attrition",  "attrition_model.pkl"),
        ("sick_leave", "sick_leave_model.pkl"),
        ("anomaly",    "anomaly_model.pkl"),
    ]:
        path = MODELS_DIR / fname
        if path.exists():
            try:
                with open(path, "rb") as f:
                    models[name] = pickle.load(f)
                logger.info(f"✅ Loaded {name} model")
            except Exception as e:
                logger.warning(f"⚠️ Could not load {name} model: {e}")
        else:
            logger.warning(f"⚠️ Model not found: {path}")


# ── Schemas ───────────────────────────────────────────────
class AttritionInput(BaseModel):
    employee_id: str
    age: float = 30
    years_of_service: float = 2.0
    gender_encoded: int = 0
    dept_encoded: int = 0
    avg_net_salary: float = 75000
    avg_gross_salary: float = 95000
    avg_bonus: float = 5000
    salary_volatility: float = 0.05
    avg_deduction_ratio: float = 0.25
    avg_work_hours: float = 8.5
    total_overtime: float = 20
    absenteeism_rate: float = 0.05
    punctuality_score: float = 0.9
    late_days: float = 2
    total_leave_requests: float = 6
    sick_leave_ratio: float = 0.3
    approval_rate: float = 0.85
    long_weekend_leaves: float = 1
    festival_month_leaves: float = 1

class SickLeaveInput(BaseModel):
    employee_id: str
    month: int = 6
    quarter: int = 2
    avg_work_hours_last_3m: float = 8.5
    total_overtime_last_3m: float = 15
    sick_leave_count_last_6m: float = 1
    sick_leave_days_last_6m: float = 2
    absenteeism_rate_last_3m: float = 0.04
    late_days_last_3m: float = 2
    avg_net_salary: float = 75000
    salary_volatility: float = 0.04
    total_leave_requests_ytd: float = 5
    festival_month_leaves_ytd: float = 1
    years_of_service: float = 3
    age: float = 30
    gender_encoded: int = 0
    dept_encoded: int = 0

class AnomalyInput(BaseModel):
    employee_id: str
    pay_period: str
    base_salary: float
    gross_salary: float
    net_salary: float
    total_deductions: float
    performance_bonus: float = 0
    overtime_pay: float = 0
    pf_deduction: float = 0
    income_tax_tds: float = 0
    deduction_ratio: float = 0
    bonus_to_salary_ratio: float = 0
    effective_tax_rate: float = 0
    attendance_rate: float = 1.0
    month: int = 1


# ── Health ─────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "OK",
        "models_loaded": list(models.keys()),
        "version": "1.0.0",
    }


# ── Attrition Prediction ───────────────────────────────────
@app.get("/predict/attrition")
def predict_attrition_all():
    """
    Return attrition predictions for all employees
    (reads from processed ML features CSV).
    """
    features_path = Path(__file__).parent / "etl" / "processed" / "ml_features_processed.csv"
    if not features_path.exists():
        raise HTTPException(503, "ML features not available. Run ETL pipeline first.")
    if "attrition" not in models:
        raise HTTPException(503, "Attrition model not loaded.")

    df = pd.read_csv(features_path)
    result = models["attrition"].predict(df)
    return {"predictions": result.to_dict(orient="records")}


@app.post("/predict/attrition/single")
def predict_attrition_single(data: AttritionInput):
    if "attrition" not in models:
        raise HTTPException(503, "Attrition model not loaded.")
    features = data.dict()
    result   = models["attrition"].predict_single(features)
    return {"employee_id": data.employee_id, **result}


@app.post("/predict/sick-leave")
def predict_sick_leave(data: SickLeaveInput):
    if "sick_leave" not in models:
        raise HTTPException(503, "Sick leave model not loaded.")
    df = pd.DataFrame([data.dict()])
    result = models["sick_leave"].predict_next_month(df)
    return {
        "employee_id":           data.employee_id,
        "sick_leave_probability":float(result["sick_leave_probability"].iloc[0]),
        "sick_leave_predicted":  int(result["sick_leave_predicted"].iloc[0]),
    }


@app.post("/predict/anomaly")
def detect_anomaly(data: AnomalyInput):
    if "anomaly" not in models:
        raise HTTPException(503, "Anomaly model not loaded.")
    df = pd.DataFrame([data.dict()])
    result = models["anomaly"].predict(df)
    row = result.iloc[0]
    return {
        "employee_id":        data.employee_id,
        "pay_period":         data.pay_period,
        "is_anomaly":         bool(row.get("is_anomaly", 0)),
        "anomaly_score":      float(row.get("anomaly_score", 0)),
        "anomaly_confidence": float(row.get("anomaly_confidence", 0)),
        "anomaly_type":       str(row.get("anomaly_type", "NORMAL")),
    }


@app.post("/predict/anomaly/batch")
def detect_anomaly_batch(records: List[AnomalyInput]):
    if "anomaly" not in models:
        raise HTTPException(503, "Anomaly model not loaded.")
    df = pd.DataFrame([r.dict() for r in records])
    result = models["anomaly"].predict(df)
    return {"anomalies": result.to_dict(orient="records")}


# ── Retrain trigger ────────────────────────────────────────
@app.post("/admin/retrain")
def retrain_models(background_tasks: BackgroundTasks):
    """Trigger model retraining in background."""
    def _retrain():
        try:
            from models.ml_models import train_all_models
            ap, slm, ad = train_all_models()
            models["attrition"]  = ap
            models["sick_leave"] = slm
            models["anomaly"]    = ad
            logger.info("✅ Models retrained successfully")
        except Exception as e:
            logger.error(f"Retraining failed: {e}")

    background_tasks.add_task(_retrain)
    return {"message": "Model retraining started in background"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_api:app", host="0.0.0.0", port=8000, reload=True)
