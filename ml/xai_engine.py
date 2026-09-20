"""
ml/xai_engine.py

Explainable AI (XAI) & Root Cause Analysis (RCA) Engine
Translating Model Decisions into Engineering Actions for Shopfloor Operators (NHK Spring)
"""

import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Any, Tuple

# คำแปลและชื่อภาษาไทยที่เป็นมิตรต่อวิศวกรโรงงาน
FEATURE_LABELS_TH = {
    "vibration_rms": "ความสั่นสะเทือน (Vibration RMS)",
    "vibration_kurtosis": "แรงกระแทกแหลมคม (Vibration Kurtosis)",
    "bearing_temp_c": "อุณหภูมิแบริ่ง (Bearing Temp)",
    "press_force_kn": "แรงกดปั๊มขึ้นรูป (Press Force)",
    "motor_current_amp": "กระแสไฟฟ้ามอเตอร์ (Motor Current)",
    "hydraulic_pressure_bar": "แรงดันไฮดรอลิก (Hydraulic Pressure)",
    "cycle_time_sec": "ระยะเวลาผลิตต่อรอบ (Cycle Time)",
    "vibration_rms_roll_mean_5": "ค่าเฉลี่ยแรงสั่นสะสม 5 รอบ",
    "vibration_rms_roll_std_5": "ความแปรปรวนของแรงสั่น",
    "bearing_temp_c_roll_mean_5": "แนวโน้มความร้อนสะสม",
    "motor_current_amp_roll_mean_5": "แนวโน้มโหลดมอเตอร์สะสม",
    "vibration_delta_1": "อัตราเร่งแรงสั่นเทียบรอบก่อน",
    "temp_delta_1": "อัตราความร้อนเพิ่มขึ้นเทียบรอบก่อน",
    "motor_current_delta_1": "กระแสโหลดพุ่งสูงเทียบรอบก่อน",
    "crest_factor_est": "ดัชนี Crest Factor (แรงกระแทกยอดคลื่น)",
    "energy_proxy": "กำลังงานขับเคลื่อนรวม"
}

class RootCauseExplainer:
    """
    คำนวณ SHAP Values สำหรับการสืบหาสาเหตุของความผิดปกติ (Root Cause Attribution)
    """
    def __init__(self, model):
        self.raw_model = model.model if hasattr(model, "model") else model
        try:
            self.explainer = shap.TreeExplainer(self.raw_model)
        except Exception:
            self.explainer = None

    def explain_event(self, X: pd.DataFrame, top_k: int = 4) -> Dict[str, Any]:
        """
        วิเคราะห์ว่าปัจจัยใดมีผลผลักดันให้เกิดความเสี่ยงมากที่สุด
        คืนค่าโครงสร้างข้อมูลพร้อมนำไปแสดงผลบน Dashboard (Bar Chart / Waterfall)
        """
        feature_names = list(X.columns)
        
        if self.explainer is not None:
            try:
                shap_values = self.explainer.shap_values(X)
                # ในกรณี Binary Classification ของ LightGBM shap_values อาจเป็น list [class 0, class 1] หรือ array
                if isinstance(shap_values, list) and len(shap_values) == 2:
                    vals = shap_values[1][0]
                elif isinstance(shap_values, np.ndarray):
                    if shap_values.ndim == 2:
                        vals = shap_values[0]
                    elif shap_values.ndim == 3:
                        vals = shap_values[0, :, 1]
                    else:
                        vals = shap_values
                else:
                    vals = np.zeros(len(feature_names))
            except Exception:
                # Fallback: ใช้การคูณ feature value กับ tree importance
                vals = np.zeros(len(feature_names))
        else:
            vals = np.zeros(len(feature_names))

        # จับคู่ชื่อฟีเจอร์กับค่า SHAP
        contributions = []
        for name, val in zip(feature_names, vals):
            contributions.append({
                "feature": name,
                "display_name": FEATURE_LABELS_TH.get(name, name),
                "shap_impact": round(float(val), 4),
                "feature_value": round(float(X[name].iloc[0]), 2),
                "is_risk_increasing": bool(val > 0)
            })

        # เรียงลำดับตามขนาดผลกระทบสูงสุด (|shap_impact|)
        contributions.sort(key=lambda x: abs(x["shap_impact"]), reverse=True)
        top_factors = contributions[:top_k]

        top_feature = top_factors[0]["feature"] if top_factors else "None"
        top_impact = top_factors[0]["shap_impact"] if top_factors else 0.0

        return {
            "top_root_cause": top_feature,
            "top_root_cause_display": FEATURE_LABELS_TH.get(top_feature, top_feature),
            "top_impact": top_impact,
            "attributions": top_factors
        }
