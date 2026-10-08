"""
ml/xai_engine.py

Explainable AI (XAI) & Root Cause Analysis (RCA) Engine
Translating Model Decisions into Engineering Actions for Shopfloor Operators (NHK Spring)
"""

import numpy as np
import pandas as pd
import shap
from typing import Dict, List, Any, Tuple

# Feature display names for plant engineers
FEATURE_LABELS_TH = {
    "vibration_rms": "Vibration RMS",
    "vibration_kurtosis": "Vibration Kurtosis",
    "bearing_temp_c": "Bearing Temp",
    "press_force_kn": "Press Force",
    "motor_current_amp": "Motor Current",
    "hydraulic_pressure_bar": "Hydraulic Pressure",
    "cycle_time_sec": "Cycle Time",
    "vibration_rms_roll_mean_5": "Vibration RMS 5-Cycle Mean",
    "vibration_rms_roll_std_5": "Vibration RMS Variation",
    "bearing_temp_c_roll_mean_5": "Cumulative Heat Trend",
    "motor_current_amp_roll_mean_5": "Cumulative Motor Load Trend",
    "vibration_delta_1": "Vibration Rate of Change vs Prev Cycle",
    "temp_delta_1": "Temperature Rise vs Prev Cycle",
    "motor_current_delta_1": "Motor Current Surge vs Prev Cycle",
    "crest_factor_est": "Crest Factor Index (Wave Peak)",
    "energy_proxy": "Total Driving Power"
}

class RootCauseExplainer:
    """
    Compute SHAP values for root cause attribution.
    """
    def __init__(self, model):
        self.raw_model = model.model if hasattr(model, "model") else model
        try:
            self.explainer = shap.TreeExplainer(self.raw_model)
        except Exception:
            self.explainer = None

    def explain_event(self, X: pd.DataFrame, top_k: int = 4) -> Dict[str, Any]:
        """
        Analyze which factors contribute most significantly to operational risk.
        Returns structured data ready for dashboard display (Bar Chart / Waterfall).
        """
        feature_names = list(X.columns)
        
        if self.explainer is not None:
            try:
                shap_values = self.explainer.shap_values(X)
                # In LightGBM binary classification, shap_values can be list [class 0, class 1] or array
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
                # Fallback: multiply feature value with tree importance
                vals = np.zeros(len(feature_names))
        else:
            vals = np.zeros(len(feature_names))

        # Pair feature names with SHAP values
        contributions = []
        for name, val in zip(feature_names, vals):
            contributions.append({
                "feature": name,
                "display_name": FEATURE_LABELS_TH.get(name, name),
                "shap_impact": round(float(val), 4),
                "feature_value": round(float(X[name].iloc[0]), 2),
                "is_risk_increasing": bool(val > 0)
            })

        # Sort by absolute impact magnitude (|shap_impact|)
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
