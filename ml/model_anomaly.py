"""
ml/model_anomaly.py

Unsupervised Anomaly Detection & Machine Health Index Formulation
Utilizing Isolation Forest with Physical Normal Baseline Learning
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import Tuple, Dict, Any

class MachineHealthAnomalyModel:
    """
    โมเดลประเมินสุขภาพเครื่องจักรและตรวจจับความผิดปกติแบบ Unsupervised
    เรียนรู้จากสภาวะการผลิตปกติ (Normal Baseline) โดยไม่ต้องพึ่งพา Label ของเสีย
    """
    def __init__(self, contamination: float = 0.04, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=100,
            max_samples="auto",
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.score_min = -0.35
        self.score_max = 0.15
        self.is_fitted = False

    def fit(self, X: pd.DataFrame):
        """
        เทรนโมเดลบนชุดข้อมูลสภาวะปกติ (Production Running Events)
        """
        self.model.fit(X)
        self.is_fitted = True
        
        # คำนวณช่วงการกระจายตัวของ Decision Scores เพื่อนำไปทำ Normalization
        scores = self.model.decision_function(X)
        self.score_min = float(np.percentile(scores, 0.5))
        self.score_max = float(np.percentile(scores, 99.5))
        return self

    def score_event(self, X: pd.DataFrame) -> Tuple[float, float, str]:
        """
        ประเมินผล Event:
        คืนค่า:
        1. health_index (0.00 - 100.00%)
        2. raw_anomaly_score (Scikit-Learn decision function: ยิ่งติดลบ ยิ่งผิดปกติ)
        3. risk_level ('NORMAL', 'WARNING', 'CRITICAL')
        """
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before scoring.")

        # decision_function: ค่าเป็นบวก = ปกติ, ค่าเป็นลบ = ผิดปกติ
        raw_score = float(self.model.decision_function(X)[0])
        
        # แปลงคะแนน Anomaly ให้เป็นสเกล Health Index (0 - 100%)
        # Normal baseline จะได้ Health 90 - 100%
        # เมื่อเริ่มมีสัญญาณเสื่อมสภาพ (Warning) จะอยู่ที่ 60 - 85%
        # เมื่อเกิด Anomaly รุนแรงจะต่ำกว่า 50%
        normalized = (raw_score - self.score_min) / (self.score_max - self.score_min + 1e-6)
        health_index = float(np.clip(normalized * 100.0, 0.0, 100.0))

        if health_index >= 75.0:
            risk_level = "NORMAL"
        elif health_index >= 50.0:
            risk_level = "WARNING"
        else:
            risk_level = "CRITICAL"

        return round(health_index, 2), round(raw_score, 4), risk_level
