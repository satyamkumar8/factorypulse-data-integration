"""
ml/feature_engineering.py

Industrial Time-Series Feature Extraction & Mathematical Formulations
Designed for Discrete Manufacturing, Stamping & Precision Assembly (NHK Spring)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any

# ฟีเจอร์เซนเซอร์หลักทางกายภาพ
RAW_SENSOR_COLS = [
    "cycle_time_sec",
    "vibration_rms",
    "vibration_kurtosis",
    "bearing_temp_c",
    "press_force_kn",
    "motor_current_amp",
    "hydraulic_pressure_bar"
]

# รายชื่อฟีเจอร์สุดท้ายที่จะถูกส่งเข้าโมเดล ML ทั้งหมด
FEATURE_COLUMNS = [
    "cycle_time_sec",
    "vibration_rms",
    "vibration_kurtosis",
    "bearing_temp_c",
    "press_force_kn",
    "motor_current_amp",
    "hydraulic_pressure_bar",
    # Rolling Statistics (Window = 5)
    "vibration_rms_roll_mean_5",
    "vibration_rms_roll_std_5",
    "bearing_temp_c_roll_mean_5",
    "motor_current_amp_roll_mean_5",
    # Lagged Deltas (ความแตกต่างจาก 1 cycle ก่อนหน้า)
    "vibration_delta_1",
    "temp_delta_1",
    "motor_current_delta_1",
    # Mechanical Health Indicators
    "crest_factor_est",     # Vibration Peak / Rolling Mean
    "energy_proxy"          # Current * Pressure (กำลังงานรวมโดยประมาณ)
]

def extract_batch_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    สกัดฟีเจอร์สำหรับข้อมูลประวัติศาสตร์จำนวนมาก (Batch Training)
    ใช้การจัดกลุ่มตามเครื่องจักร (machine_id) และเรียงลำดับเวลา เพื่อป้องกันข้อมูลข้ามเครื่อง
    """
    df = df.copy()
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by=["machine_id", "timestamp"]).reset_index(drop=True)

    # คำนวณ Rolling Statistics และ Lag ต่อเครื่องจักร
    grouped = df.groupby("machine_id")

    # 1. Rolling Mean & Std (Window = 5 cycles)
    df["vibration_rms_roll_mean_5"] = grouped["vibration_rms"].transform(
        lambda x: x.rolling(window=5, min_periods=1).mean()
    )
    df["vibration_rms_roll_std_5"] = grouped["vibration_rms"].transform(
        lambda x: x.rolling(window=5, min_periods=1).std().fillna(0.0)
    )
    df["bearing_temp_c_roll_mean_5"] = grouped["bearing_temp_c"].transform(
        lambda x: x.rolling(window=5, min_periods=1).mean()
    )
    df["motor_current_amp_roll_mean_5"] = grouped["motor_current_amp"].transform(
        lambda x: x.rolling(window=5, min_periods=1).mean()
    )

    # 2. Lagged Deltas (อัตราการเปลี่ยนแปลงเมื่อเทียบกับ cycle ก่อนหน้า: x_t - x_{t-1})
    df["vibration_delta_1"] = grouped["vibration_rms"].diff().fillna(0.0)
    df["temp_delta_1"] = grouped["bearing_temp_c"].diff().fillna(0.0)
    df["motor_current_delta_1"] = grouped["motor_current_amp"].diff().fillna(0.0)

    # 3. Mechanical Health Indicators (Crest Factor & Mechanical Load Proxy)
    # Crest Factor ประมาณการจากความสั่นสะเทือนปัจจุบันเทียบกับค่าเฉลี่ย
    df["crest_factor_est"] = df["vibration_rms"] / (df["vibration_rms_roll_mean_5"] + 1e-5)
    # ดัชนีพลังงานรวมของมอเตอร์และไฮดรอลิก
    df["energy_proxy"] = (df["motor_current_amp"] * df["hydraulic_pressure_bar"]) / 1000.0

    return df

def extract_single_event_features(current_event: Dict[str, Any], history_window: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    สกัดฟีเจอร์สำหรับ Online Streaming Scoring ทีละ Event
    โดยรับ Event ปัจจุบันและ Buffer บันทึกล่าสุด 5-10 Events ของเครื่องจักรนั้นๆ
    เพื่อให้มั่นใจว่า Features ที่ได้ตรงกับที่โมเดลเทรนมา 100% (No Train-Serving Skew)
    """
    # รวบรวม window ปัจจุบัน
    all_events = history_window + [current_event]
    window_df = pd.DataFrame(all_events)
    
    # คำนวณสถิติ
    vib_series = window_df["vibration_rms"].astype(float)
    temp_series = window_df["bearing_temp_c"].astype(float)
    curr_series = window_df["motor_current_amp"].astype(float)
    press_series = window_df["hydraulic_pressure_bar"].astype(float)

    curr_vib = float(current_event["vibration_rms"])
    curr_temp = float(current_event["bearing_temp_c"])
    curr_motor = float(current_event["motor_current_amp"])
    curr_press = float(current_event["hydraulic_pressure_bar"])

    # Rolling
    vib_roll_mean = vib_series.tail(5).mean()
    vib_roll_std = vib_series.tail(5).std()
    if pd.isna(vib_roll_std):
        vib_roll_std = 0.0

    temp_roll_mean = temp_series.tail(5).mean()
    curr_roll_mean = curr_series.tail(5).mean()

    # Deltas
    if len(all_events) > 1:
        prev_vib = float(all_events[-2]["vibration_rms"])
        prev_temp = float(all_events[-2]["bearing_temp_c"])
        prev_curr = float(all_events[-2]["motor_current_amp"])
        vib_delta = curr_vib - prev_vib
        temp_delta = curr_temp - prev_temp
        curr_delta = curr_motor - prev_curr
    else:
        vib_delta = 0.0
        temp_delta = 0.0
        curr_delta = 0.0

    crest_est = curr_vib / (vib_roll_mean + 1e-5)
    energy_proxy = (curr_motor * curr_press) / 1000.0

    row = {
        "cycle_time_sec": float(current_event["cycle_time_sec"]),
        "vibration_rms": curr_vib,
        "vibration_kurtosis": float(current_event.get("vibration_kurtosis", 3.0)),
        "bearing_temp_c": curr_temp,
        "press_force_kn": float(current_event["press_force_kn"]),
        "motor_current_amp": curr_motor,
        "hydraulic_pressure_bar": curr_press,
        "vibration_rms_roll_mean_5": vib_roll_mean,
        "vibration_rms_roll_std_5": vib_roll_std,
        "bearing_temp_c_roll_mean_5": temp_roll_mean,
        "motor_current_amp_roll_mean_5": curr_roll_mean,
        "vibration_delta_1": vib_delta,
        "temp_delta_1": temp_delta,
        "motor_current_delta_1": curr_delta,
        "crest_factor_est": crest_est,
        "energy_proxy": energy_proxy
    }

    return pd.DataFrame([row])[FEATURE_COLUMNS]
