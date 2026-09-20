"""
ml/model_quality.py

Virtual Metrology & Predictive Quality Engine (NHK Spring Focus)
Supervised Defect Prediction using LightGBM / Gradient Boosting with Cost-Sensitive Weighting
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score
from typing import Dict, Any, Tuple

class PredictiveQualityModel:
    """
    โมเดลทำนายความน่าจะเป็นที่ชิ้นงานจะตกสเปก (Defect) ล่วงหน้าจากพารามิเตอร์เซนเซอร์
    ออกแบบมารับมือกับ Extreme Class Imbalance ในสายการผลิตจริง
    """
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.model = None
        self.feature_names = None
        self.decision_threshold = 0.35  # ปรับ Threshold ให้ไวขึ้นเพื่อลดโอกาสเกิด False Negative (ของเสียหลุด)

    def fit(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        self.feature_names = list(X.columns)
        
        # คำนวณอัตราส่วน Imbalance เพื่อกำหนด scale_pos_weight (Cost-Sensitive Weighting)
        pos_count = (y == 1).sum()
        neg_count = (y == 0).sum()
        scale_pos_weight = max(1.0, float(neg_count / max(1, pos_count)))

        self.model = lgb.LGBMClassifier(
            n_estimators=120,
            learning_rate=0.05,
            num_leaves=15,
            scale_pos_weight=scale_pos_weight,
            random_state=self.random_state,
            n_jobs=-1,
            verbosity=-1
        )
        self.model.fit(X, y)

        # ประเมินผล In-Sample / Validation
        y_prob = self.model.predict_proba(X)[:, 1]
        y_pred = (y_prob >= self.decision_threshold).astype(int)

        metrics = {
            "roc_auc": round(float(roc_auc_score(y, y_prob)), 4) if pos_count > 0 else 0.0,
            "pr_auc": round(float(average_precision_score(y, y_prob)), 4) if pos_count > 0 else 0.0,
            "precision": round(float(precision_score(y, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y, y_pred, zero_division=0)), 4),
            "scale_pos_weight": round(scale_pos_weight, 2),
            "pos_samples": int(pos_count),
            "neg_samples": int(neg_count)
        }
        return metrics

    def predict_defect_probability(self, X: pd.DataFrame) -> float:
        """
        คืนค่าความน่าจะเป็นที่ชิ้นงานจะมี Defect (0.0000 - 1.0000)
        """
        if self.model is None:
            raise RuntimeError("Model must be fitted before prediction.")
        prob = self.model.predict_proba(X)[:, 1][0]
        return round(float(prob), 4)

    def get_feature_importances(self) -> Dict[str, float]:
        if self.model is None:
            return {}
        importances = self.model.feature_importances_
        total = max(1e-6, np.sum(importances))
        return {name: round(float(imp / total), 4) for name, imp in zip(self.feature_names, importances)}
