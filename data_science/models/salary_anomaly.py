"""
PaySphereX ML Model 2: Salary Anomaly Detection
Detects unusual salary patterns using Isolation Forest + Z-score analysis.
"""
import pandas as pd
import numpy as np
import os, sys, joblib, json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_DIR, MODELS_DIR

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = [
    'avg_net_salary', 'avg_gross_salary', 'salary_stddev', 'salary_cv',
    'avg_bonus', 'bonus_rate', 'base_salary', 'tenure_years', 'dept_enc', 'band_enc'
]


def detect_salary_anomalies(features_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Run Isolation Forest to detect salary anomalies.
    Returns DataFrame with anomaly scores and flags.
    """
    if features_df is None:
        path = os.path.join(PROCESSED_DATA_DIR, "ml_features.csv")
        features_df = pd.read_csv(path)

    df = features_df.copy()
    X = df[FEATURES].fillna(0)

    print(f"Running salary anomaly detection on {len(df)} employees...")

    # Isolation Forest (unsupervised)
    iso_pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('model', IsolationForest(
            n_estimators=200,
            contamination=0.05,   # expect ~5% anomalies
            max_samples='auto',
            random_state=42,
            n_jobs=-1
        ))
    ])

    iso_pipe.fit(X)
    scores = iso_pipe.named_steps['model'].score_samples(
        iso_pipe.named_steps['scaler'].transform(X)
    )
    preds = iso_pipe.predict(X)   # -1 = anomaly, 1 = normal

    df['iso_score']      = scores
    df['iso_anomaly']    = (preds == -1).astype(int)

    # Z-score based anomaly for net salary
    salary_mean = df['avg_net_salary'].mean()
    salary_std  = df['avg_net_salary'].std() + 1
    df['salary_zscore']      = ((df['avg_net_salary'] - salary_mean) / salary_std).abs()
    df['zscore_anomaly']     = (df['salary_zscore'] > 3).astype(int)

    # Salary vs tenure mismatch
    expected_salary = df['tenure_years'] * 5000 + 40000
    df['tenure_salary_gap']  = (df['avg_net_salary'] - expected_salary).abs()
    df['tenure_mismatch']    = (df['tenure_salary_gap'] > 40000).astype(int)

    # Combined anomaly score (0-3)
    df['anomaly_score']  = df['iso_anomaly'] + df['zscore_anomaly'] + df['tenure_mismatch']
    df['is_anomaly']     = (df['anomaly_score'] >= 2).astype(int)
    df['anomaly_severity'] = pd.cut(
        df['anomaly_score'], bins=[-1, 0, 1, 2, 3],
        labels=['Normal','Low','Medium','High']
    )

    result = df[['employee_id','avg_net_salary','salary_zscore','iso_score',
                 'iso_anomaly','zscore_anomaly','tenure_mismatch',
                 'anomaly_score','is_anomaly','anomaly_severity']].copy()

    # Save model
    joblib.dump(iso_pipe, os.path.join(MODELS_DIR, "salary_anomaly_iso.pkl"))

    # Save results
    out_path = os.path.join(PROCESSED_DATA_DIR, "salary_anomalies.csv")
    result.to_csv(out_path, index=False)

    n_anomalies = result['is_anomaly'].sum()
    print(f"Detected {n_anomalies} salary anomalies ({n_anomalies/len(df)*100:.1f}%)")
    print(f"Results saved to {out_path}")

    summary = {
        "model": "SalaryAnomalyDetector",
        "version": "v1.0",
        "total_employees": len(df),
        "anomalies_detected": int(n_anomalies),
        "anomaly_rate": round(n_anomalies / len(df), 4),
        "trained_at": datetime.utcnow().isoformat(),
    }
    return result, summary


if __name__ == "__main__":
    from feature_engineering import build_employee_features
    feat = build_employee_features()
    results, summary = detect_salary_anomalies(feat)
    print(json.dumps(summary, indent=2))
    print(results[results['is_anomaly']==1][['employee_id','avg_net_salary','anomaly_severity']].head(10))
