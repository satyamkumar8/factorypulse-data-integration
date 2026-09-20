"""
ml/train_models.py

Offline Model Training Pipeline & Temporal Cross-Validation
Fetches Manufacturing Telemetry, Extracts Features, Trains Anomaly + Quality Models,
and Serializes Pipeline Artifacts for Production Inference.
"""

import os
import json
import logging
from datetime import datetime
import joblib
import pandas as pd
from sqlalchemy import create_engine, text

from ml.feature_engineering import extract_batch_features, FEATURE_COLUMNS
from ml.model_anomaly import MachineHealthAnomalyModel
from ml.model_quality import PredictiveQualityModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

DB_URI = os.getenv("DB_URI", "postgresql+psycopg2://mfg_user:mfg_password@localhost:5432/manufacturing_db")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

def run_training_pipeline():
    os.makedirs(MODELS_DIR, exist_ok=True)
    engine = create_engine(DB_URI)

    logging.info("Step 1: Fetching sensor telemetry data from PostgreSQL...")
    query = """
    SELECT 
        event_id, line_id, machine_id, timestamp, cycle_time_sec,
        good_units, defect_units, status_code,
        vibration_rms, vibration_kurtosis, bearing_temp_c,
        press_force_kn, motor_current_amp, hydraulic_pressure_bar
    FROM machine_telemetry
    ORDER BY timestamp ASC;
    """
    df_raw = pd.read_sql(query, engine)
    logging.info(f"Loaded {len(df_raw)} raw telemetry records.")

    if len(df_raw) < 100:
        logging.warning("Insufficient telemetry records for training. Please run simulator to generate data first.")
        return False

    logging.info("Step 2: Executing Time-Series Feature Engineering...")
    df_features = extract_batch_features(df_raw)

    # กรองเฉพาะแถวที่ไม่มีค่า NaN ในฟีเจอร์
    df_clean = df_features.dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)
    X = df_clean[FEATURE_COLUMNS]
    y_quality = (df_clean["defect_units"] > 0).astype(int)

    logging.info(f"Features dataset ready: {X.shape[0]} samples, {X.shape[1]} features.")
    logging.info(f"Class distribution: {int((y_quality == 0).sum())} Good vs {int((y_quality == 1).sum())} Defect")

    # -------------------------------------------------------------
    # Step 3: Train Unsupervised Machine Health Model (Isolation Forest)
    # -------------------------------------------------------------
    logging.info("Step 3: Training Unsupervised Machine Health Anomaly Model...")
    # กรองเฉพาะสภาวะเดินเครื่องปกติ (status_code = 1) เพื่อสร้าง Normal Baseline
    X_normal = df_clean[df_clean["status_code"] == 1][FEATURE_COLUMNS]
    anomaly_model = MachineHealthAnomalyModel(contamination=0.03)
    anomaly_model.fit(X_normal)
    
    anomaly_path = os.path.join(MODELS_DIR, "anomaly_isolation_forest.joblib")
    joblib.dump(anomaly_model, anomaly_path)
    logging.info(f"Anomaly model saved to: {anomaly_path}")

    # -------------------------------------------------------------
    # Step 4: Train Supervised Predictive Quality Model (LightGBM)
    # -------------------------------------------------------------
    logging.info("Step 4: Training Predictive Quality Classifier (Virtual Metrology)...")
    # ใช้ Temporal Split (80% อดีตเทรน, 20% อนาคตทดสอบ) ป้องกัน Data Leakage
    split_idx = int(len(df_clean) * 0.8)
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_val = y_quality.iloc[:split_idx], y_quality.iloc[split_idx:]

    quality_model = PredictiveQualityModel()
    train_metrics = quality_model.fit(X_train, y_train)

    quality_path = os.path.join(MODELS_DIR, "quality_lightgbm.joblib")
    joblib.dump(quality_model, quality_path)
    logging.info(f"Quality model saved to: {quality_path}")
    logging.info(f"Training Quality Metrics: {train_metrics}")

    # -------------------------------------------------------------
    # Step 5: Save Model Metadata
    # -------------------------------------------------------------
    metadata = {
        "trained_at": datetime.now().isoformat(),
        "total_samples": len(df_clean),
        "feature_columns": FEATURE_COLUMNS,
        "quality_metrics": train_metrics,
        "feature_importance": quality_model.get_feature_importances()
    }
    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    logging.info(f"Model metadata saved to: {meta_path}")

    # -------------------------------------------------------------
    # Step 6: Batch Score Recent Events to Populate Health Scores
    # -------------------------------------------------------------
    logging.info("Step 6: Batch scoring latest records into machine_health_scores...")
    from ml.xai_engine import RootCauseExplainer
    explainer = RootCauseExplainer(quality_model)
    
    # ดึง 20 รายการล่าสุดของแต่ละเครื่องจักรมาคำนวณและบันทึก
    recent_indices = df_clean.groupby(["line_id", "machine_id"]).tail(20).index
    records_to_insert = []
    
    for idx in recent_indices:
        row = df_clean.iloc[idx]
        row_feat = pd.DataFrame([row[FEATURE_COLUMNS]])
        health, anom_score, risk = anomaly_model.score_event(row_feat)
        def_prob = quality_model.predict_defect_probability(row_feat)
        
        top_cause = "None"
        cause_imp = 0.0
        if risk in ["WARNING", "CRITICAL"] or def_prob >= 0.30:
            exp = explainer.explain_event(row_feat, top_k=1)
            top_cause = exp["top_root_cause"]
            cause_imp = exp["top_impact"]

        records_to_insert.append({
            "timestamp": row["timestamp"],
            "line_id": row["line_id"],
            "machine_id": row["machine_id"],
            "event_id": int(row["event_id"]),
            "health_index": health,
            "anomaly_score": anom_score,
            "defect_probability": def_prob,
            "risk_level": risk,
            "top_root_cause": top_cause,
            "root_cause_impact": cause_imp
        })

    if records_to_insert:
        insert_query = text("""
            INSERT INTO machine_health_scores (
                timestamp, line_id, machine_id, event_id, health_index,
                anomaly_score, defect_probability, risk_level, top_root_cause, root_cause_impact
            ) VALUES (
                :timestamp, :line_id, :machine_id, :event_id, :health_index,
                :anomaly_score, :defect_probability, :risk_level, :top_root_cause, :root_cause_impact
            );
        """)
        with engine.begin() as conn:
            conn.execute(insert_query, records_to_insert)
        logging.info(f"Populated {len(records_to_insert)} initial machine health scores!")

    logging.info("Model training pipeline completed successfully!")
    return True

if __name__ == "__main__":
    run_training_pipeline()
