"""
PaySphereX ML Model 1: Leave Prediction
Predicts probability of an employee taking sick/unplanned leave next month.
Algorithm: Random Forest Classifier + Gradient Boosting ensemble
"""
import pandas as pd
import numpy as np
import os, sys, joblib, json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_DIR, MODELS_DIR

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (classification_report, roc_auc_score,
                              confusion_matrix, precision_recall_curve)
from sklearn.pipeline import Pipeline

os.makedirs(MODELS_DIR, exist_ok=True)


FEATURES = [
    'tenure_years', 'age', 'base_salary', 'attendance_rate',
    'total_absent_days', 'late_arrivals', 'avg_work_hours',
    'total_leaves', 'sick_leave_days', 'avg_leave_duration',
    'avg_net_salary', 'avg_bonus', 'dept_enc', 'type_enc',
    'gender_enc', 'band_enc', 'high_absenteeism', 'bonus_rate'
]


def prepare_data(features_df: pd.DataFrame):
    """Build target variable: will employee take sick leave next period?"""
    df = features_df.copy()
    # Target: high_sick_leave is the binary label
    df['target'] = df['high_sick_leave']

    X = df[FEATURES].fillna(0)
    y = df['target']
    return X, y, df


def train_leave_model(features_df: pd.DataFrame = None) -> dict:
    """Train and evaluate leave prediction model."""
    if features_df is None:
        path = os.path.join(PROCESSED_DATA_DIR, "ml_features.csv")
        features_df = pd.read_csv(path)

    print(f"Training leave prediction model on {len(features_df)} samples...")
    X, y, df = prepare_data(features_df)

    # Handle class imbalance
    pos_ratio = y.mean()
    print(f"Positive class ratio: {pos_ratio:.2%}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None
    )

    # Random Forest
    rf_pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestClassifier(
            n_estimators=200, max_depth=8, min_samples_leaf=2,
            class_weight='balanced', random_state=42, n_jobs=-1
        ))
    ])

    # Gradient Boosting
    gb_pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('model', GradientBoostingClassifier(
            n_estimators=150, learning_rate=0.05, max_depth=4,
            subsample=0.8, random_state=42
        ))
    ])

    rf_pipe.fit(X_train, y_train)
    gb_pipe.fit(X_train, y_train)

    # Ensemble: average probabilities
    rf_proba = rf_pipe.predict_proba(X_test)[:, 1]
    gb_proba = gb_pipe.predict_proba(X_test)[:, 1]
    ensemble_proba = (rf_proba + gb_proba) / 2
    ensemble_pred  = (ensemble_proba >= 0.5).astype(int)

    # Metrics
    auc  = roc_auc_score(y_test, ensemble_proba) if y_test.nunique() > 1 else 0.5
    report = classification_report(y_test, ensemble_pred, output_dict=True, zero_division=0)

    # Feature importance
    rf_model = rf_pipe.named_steps['model']
    importance = dict(zip(FEATURES, rf_model.feature_importances_.round(4)))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    # CV score
    cv = cross_val_score(rf_pipe, X, y, cv=StratifiedKFold(n_splits=3),
                         scoring='roc_auc', error_score=0.5)

    # Save models
    joblib.dump(rf_pipe, os.path.join(MODELS_DIR, "leave_rf.pkl"))
    joblib.dump(gb_pipe, os.path.join(MODELS_DIR, "leave_gb.pkl"))

    # Generate predictions for all employees
    all_rf_proba = rf_pipe.predict_proba(X)[:, 1]
    all_gb_proba = gb_pipe.predict_proba(X)[:, 1]
    all_proba    = (all_rf_proba + all_gb_proba) / 2
    df_out = df[['employee_id']].copy()
    df_out['leave_probability'] = all_proba.round(4)
    df_out['risk_level'] = pd.cut(all_proba, bins=[0,0.3,0.6,1.0],
                                   labels=['Low','Medium','High'])
    out_path = os.path.join(PROCESSED_DATA_DIR, "leave_predictions.csv")
    df_out.to_csv(out_path, index=False)

    result = {
        "model": "LeavePredictor_Ensemble",
        "version": "v1.0",
        "auc_roc": round(auc, 4),
        "cv_auc_mean": round(cv.mean(), 4),
        "accuracy": round(report.get('accuracy', 0), 4),
        "top_features": top_features,
        "trained_at": datetime.utcnow().isoformat(),
        "samples": len(X),
    }
    print(f"AUC-ROC: {auc:.4f} | CV AUC: {cv.mean():.4f}")
    print(f"Top features: {top_features}")
    return result


if __name__ == "__main__":
    from feature_engineering import build_employee_features
    feat = build_employee_features()
    result = train_leave_model(feat)
    print(json.dumps(result, indent=2))
