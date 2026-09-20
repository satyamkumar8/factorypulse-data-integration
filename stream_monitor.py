import os
import sys
import time
import logging
from collections import defaultdict, deque
import joblib
import pandas as pd
from sqlalchemy import create_engine, text

from ml.feature_engineering import extract_single_event_features, FEATURE_COLUMNS
from ml.xai_engine import RootCauseExplainer

# ตั้งค่า Logging Format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

DB_URI = os.getenv("DB_URI", "postgresql+psycopg2://mfg_user:mfg_password@localhost:5432/manufacturing_db")
engine = create_engine(DB_URI)

# ตัวแปรจำสถานะของเสียสะสมต่อเนื่อง: key = "LINE_ID_MACHINE_ID", value = จำนวนครั้งที่ติดกัน
consecutive_defects = defaultdict(int)

# In-memory Rolling Feature Buffer: เก็บประวัติ 10 cycles ล่าสุดของแต่ละเครื่องจักร
machine_buffers = defaultdict(lambda: deque(maxlen=10))

# โหลดโมเดล Machine Learning เข้า Memory สำหรับ Low-Latency Streaming Inference
MODELS_DIR = os.path.join(os.path.dirname(__file__), "ml", "models")
anomaly_model = None
quality_model = None
xai_explainer = None

try:
    anomaly_path = os.path.join(MODELS_DIR, "anomaly_isolation_forest.joblib")
    quality_path = os.path.join(MODELS_DIR, "quality_lightgbm.joblib")
    if os.path.exists(anomaly_path) and os.path.exists(quality_path):
        anomaly_model = joblib.load(anomaly_path)
        quality_model = joblib.load(quality_path)
        xai_explainer = RootCauseExplainer(quality_model)
        logging.info("Successfully loaded ML Models (Isolation Forest + LightGBM + TreeSHAP) for real-time scoring.")
    else:
        logging.warning("ML models not found in ml/models/. Running in standard rule-based mode.")
except Exception as e:
    logging.error(f"Failed to load ML models: {e}")

def monitor_stream():
    logging.info("Starting Stateful Real-Time Stream Monitoring & Industrial Data Science Engine...")
    logging.info("Listening for streaming events with state tracking & ML scoring... (Press Ctrl+C to stop)")
    
    last_processed_id = 0

    # ดึง event_id ล่าสุดเป็นจุดเริ่มต้น เพื่อประมวลผลเฉพาะข้อมูลที่เข้ามาใหม่สดๆ
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT COALESCE(MAX(event_id), 0) FROM machine_telemetry;")).scalar()
            last_processed_id = res or 0
    except Exception as e:
        logging.error(f"Failed to fetch initial event id: {e}")

    insert_score_query = text("""
        INSERT INTO machine_health_scores (
            line_id, machine_id, event_id, health_index, anomaly_score,
            defect_probability, risk_level, top_root_cause, root_cause_impact
        ) VALUES (
            :line_id, :machine_id, :event_id, :health_index, :anomaly_score,
            :defect_probability, :risk_level, :top_root_cause, :root_cause_impact
        );
    """)

    while True:
        try:
            query = text("""
                SELECT 
                    t.event_id,
                    t.timestamp,
                    t.line_id,
                    t.machine_id,
                    t.status_code,
                    r.category,
                    r.status_name,
                    t.good_units,
                    t.defect_units,
                    t.cycle_time_sec,
                    COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
                    COALESCE(t.vibration_kurtosis, 3.00) AS vibration_kurtosis,
                    COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
                    COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
                    COALESCE(t.motor_current_amp, 15.0) AS motor_current_amp,
                    COALESCE(t.hydraulic_pressure_bar, 150.0) AS hydraulic_pressure_bar
                FROM machine_telemetry t
                JOIN downtime_reasons r ON t.status_code = r.status_code
                WHERE t.event_id > :last_id
                ORDER BY t.event_id ASC
                LIMIT 50;
            """)

            with engine.connect() as conn:
                result = conn.execute(query, {"last_id": last_processed_id}).mappings().all()

            for row in result:
                last_processed_id = max(last_processed_id, row["event_id"])

                event_id = row["event_id"]
                cycle = float(row["cycle_time_sec"])
                line = row["line_id"]
                machine = row["machine_id"]
                cat = row["category"]
                status_desc = row["status_name"]
                status = row["status_code"]
                defect = row["defect_units"]
                good = row["good_units"]
                machine_key = f"{line}_{machine}"

                # ----------------------------------------------------
                # 1. Data Quality Gate: กรองและเตือนข้อมูลผิดปกติทางกายภาพ
                # ----------------------------------------------------
                if cycle is None or cycle <= 0:
                    logging.error(f"[DATA QUALITY ERROR] Invalid cycle time ({cycle}s) at Event ID: {event_id}")
                    continue

                # ----------------------------------------------------
                # 2. Machine Learning Online Scoring (Health & Quality)
                # ----------------------------------------------------
                health_index = 100.0
                anomaly_score = 0.0
                defect_prob = 0.01
                risk_level = "NORMAL"
                top_root_cause = "None"
                root_cause_impact = 0.0

                if anomaly_model is not None and quality_model is not None:
                    try:
                        # สกัด Real-Time Features จาก Sliding Window
                        features_df = extract_single_event_features(dict(row), list(machine_buffers[machine_key]))
                        
                        # ทำนายคะแนนสุขภาพเครื่องจักร (Health Index 0-100%)
                        health_index, anomaly_score, risk_level = anomaly_model.score_event(features_df)
                        
                        # ทำนายความน่าจะเป็นของ Defect (Virtual Metrology)
                        defect_prob = quality_model.predict_defect_probability(features_df)

                        # หากเครื่องจักรเริ่มมีความเสี่ยง หรือ Defect Prob สูง คำนวณ Explainable AI (SHAP)
                        if risk_level in ["WARNING", "CRITICAL"] or defect_prob >= 0.30:
                            if xai_explainer is not None:
                                explanation = xai_explainer.explain_event(features_df, top_k=3)
                                top_root_cause = explanation["top_root_cause"]
                                root_cause_impact = explanation["top_impact"]

                        # บันทึกผลลัพธ์ลง PostgreSQL Data Table
                        with engine.begin() as save_conn:
                            save_conn.execute(insert_score_query, {
                                "line_id": line,
                                "machine_id": machine,
                                "event_id": event_id,
                                "health_index": health_index,
                                "anomaly_score": anomaly_score,
                                "defect_probability": defect_prob,
                                "risk_level": risk_level,
                                "top_root_cause": top_root_cause,
                                "root_cause_impact": root_cause_impact
                            })
                    except Exception as err:
                        logging.warning(f"ML Scoring skipped for event {event_id}: {err}")

                # บันทึก Event ลง Buffer สำหรับการคำนวณใน Cycle ถัดไป
                machine_buffers[machine_key].append(dict(row))

                # ----------------------------------------------------
                # 3. Comprehensive Alert Dispatcher
                # ----------------------------------------------------
                if cat == "Unplanned Downtime":
                    logging.warning(
                        f"\033[91m[CRITICAL BREAKDOWN] {line} | {machine} -> {status_desc} | Loss: {cycle:.2f}s | Health: {health_index:.1f}%\033[0m"
                    )
                elif risk_level == "CRITICAL" or defect_prob >= 0.50:
                    logging.error(
                        f"\033[95m[ML EARLY WARNING ALERT] {line} | {machine} -> Health: {health_index:.1f}% | Defect Risk: {defect_prob*100:.1f}% | Root Cause: {top_root_cause} (Impact: {root_cause_impact:+.3f})\033[0m"
                    )
                elif defect > 0:
                    consecutive_defects[machine_key] += 1
                    streak = consecutive_defects[machine_key]
                    if streak >= 2:
                        logging.error(
                            f"\033[95m[QUALITY SPIKE ALERT] {line} | {machine} -> {streak} CONSECUTIVE DEFECTS! | Health: {health_index:.1f}%\033[0m"
                        )
                    else:
                        logging.warning(
                            f"\033[93m[DEFECT DETECTED] {line} | {machine} -> Defect: {defect} | Good: {good} | Health: {health_index:.1f}%\033[0m"
                        )
                else:
                    consecutive_defects[machine_key] = 0
                    if risk_level == "WARNING":
                        logging.warning(
                            f"\033[93m[HEALTH DEGRADING] {line} | {machine} -> Health: {health_index:.1f}% | Cause: {top_root_cause}\033[0m"
                        )
                    else:
                        logging.info(
                            f"[HEALTHY] {line} | {machine} -> Health: {health_index:.1f}% | Defect Prob: {defect_prob*100:.1f}% | Output: {good} units"
                        )

            time.sleep(2)

        except Exception as e:
            logging.error(f"Stream Monitor loop error: {e}")
            time.sleep(3)

if __name__ == "__main__":
    try:
        monitor_stream()
    except KeyboardInterrupt:
        logging.info("Stream Monitor stopped cleanly by user.")
        sys.exit(0)