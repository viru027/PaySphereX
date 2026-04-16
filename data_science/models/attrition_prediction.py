"""
PaySphereX ML Model 3: Employee Attrition Prediction
Predicts probability that an employee will leave within 6 months.
Uses XGBoost-like Gradient Boosting + Logistic Regression ensemble.
"""
import pandas as pd
import numpy as np
import os, sys, joblib, json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_DIR, MODELS_DIR

from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.pipeline import Pipeline

os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = [
    'tenure_years', 'age', 'base_salary', 'attendance_rate',
    'total_absent_days', 'late_arrivals', 'avg_work_hours',
    'total_leaves', 'sick_leave_days', 'leave_applications',
    'avg_net_salary', 'avg_bonus', 'salary_cv',
    'dept_enc', 'type_enc', 'gender_enc', 'band_enc',
    'high_absenteeism', 'high_sick_leave', 'bonus_rate',
]


def create_synthetic_target(df: pd.DataFrame) -> pd.Series:
    """
    Create synthetic attrition target based on known risk factors:
    - High absenteeism
    - Low salary relative to peers
    - Low tenure
    - High sick leave
    - Frequent late arrivals
    """
    score = (
        df['high_absenteeism'].fillna(0) * 2 +
        df['high_sick_leave'].fillna(0) * 1.5 +
        (df['tenure_years'].fillna(5) < 1).astype(int) * 2 +
        (df['salary_cv'].fillna(0) > 0.2).astype(int) * 1 +
        (df['late_arrivals'].fillna(0) > 10).astype(int) * 1 +
        (df['avg_bonus'].fillna(0) == 0).astype(int) * 1
    )
    # Threshold: score >= 4 → attrition risk
    target = (score >= 4).astype(int)
    # Add noise for realism
    noise = np.random.RandomState(42).binomial(1, 0.05, len(target))
    target = np.clip(target + noise, 0, 1)
    return pd.Series(target, index=df.index)


def train_attrition_model(features_df: pd.DataFrame = None) -> dict:
    """Train and evaluate attrition prediction model."""
    if features_df is None:
        path = os.path.join(PROCESSED_DATA_DIR, "ml_features.csv")
        features_df = pd.read_csv(path)

    df = features_df.copy()
    print(f"Training attrition model on {len(df)} employees...")

    X = df[FEATURES].fillna(0)
    y = create_synthetic_target(df)

    print(f"Attrition rate in data: {y.mean():.2%}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Model 1: Gradient Boosting
    gb = Pipeline([
        ('scaler', StandardScaler()),
        ('model', GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.05,
            max_depth=4, subsample=0.8, random_state=42
        ))
    ])

    # Model 2: Random Forest
    rf = Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestClassifier(
            n_estimators=200, max_depth=8, class_weight='balanced',
            random_state=42, n_jobs=-1
        ))
    ])

    # Model 3: Logistic Regression (interpretable)
    lr = Pipeline([
        ('scaler', StandardScaler()),
        ('model', LogisticRegression(C=1.0, class_weight='balanced',
                                      max_iter=500, random_state=42))
    ])

    gb.fit(X_train, y_train); rf.fit(X_train, y_train); lr.fit(X_train, y_train)

    # Weighted ensemble: GB 40%, RF 40%, LR 20%
    proba = (
        0.40 * gb.predict_proba(X_test)[:, 1] +
        0.40 * rf.predict_proba(X_test)[:, 1] +
        0.20 * lr.predict_proba(X_test)[:, 1]
    )
    preds = (proba >= 0.5).astype(int)

    auc    = roc_auc_score(y_test, proba) if y_test.nunique() > 1 else 0.5
    report = classification_report(y_test, preds, output_dict=True, zero_division=0)

    # Feature importance from RF
    rf_model = rf.named_steps['model']
    importance = dict(zip(FEATURES, rf_model.feature_importances_.round(4)))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    # Predict on all employees
    all_proba = (
        0.40 * gb.predict_proba(X)[:, 1] +
        0.40 * rf.predict_proba(X)[:, 1] +
        0.20 * lr.predict_proba(X)[:, 1]
    )
    df_out = df[['employee_id']].copy()
    df_out['attrition_probability'] = all_proba.round(4)
    df_out['risk_level'] = pd.cut(all_proba, bins=[0,0.3,0.6,1.0],
                                   labels=['Low','Medium','High'])
    df_out.to_csv(os.path.join(PROCESSED_DATA_DIR, "attrition_predictions.csv"), index=False)

    # Save models
    joblib.dump(gb, os.path.join(MODELS_DIR, "attrition_gb.pkl"))
    joblib.dump(rf, os.path.join(MODELS_DIR, "attrition_rf.pkl"))
    joblib.dump(lr, os.path.join(MODELS_DIR, "attrition_lr.pkl"))

    result = {
        "model": "AttritionPredictor_Ensemble",
        "version": "v1.0",
        "auc_roc": round(auc, 4),
        "accuracy": round(report.get('accuracy', 0), 4),
        "top_features": top_features,
        "trained_at": datetime.utcnow().isoformat(),
        "samples": len(X),
        "high_risk_count": int((all_proba > 0.6).sum()),
    }
    print(f"AUC-ROC: {auc:.4f} | High-risk employees: {(all_proba > 0.6).sum()}")
    return result


if __name__ == "__main__":
    from feature_engineering import build_employee_features
    feat = build_employee_features()
    result = train_attrition_model(feat)
    print(json.dumps(result, indent=2))
