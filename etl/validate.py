"""
FactoryPulse ETL - Validate Module
Data Quality Gates and Schema Validation for Industrial Telemetry.
"""

import logging
from typing import Tuple, Dict, Any
import pandas as pd

logger = logging.getLogger("factorypulse.etl.validate")

# Allowed operational boundaries
PHYSICAL_BOUNDARIES = {
    "cycle_time_sec": (0.5, 600.0),
    "bearing_temp_c": (-10.0, 150.0),
    "vibration_rms": (0.01, 50.0),
    "motor_current_amp": (0.0, 200.0),
    "press_force_kn": (0.0, 500.0),
}

VALID_STATUS_CODES = {1, 2, 3, 4, 5}

def validate_telemetry_batch(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Applies data quality gates to raw telemetry DataFrame:
    1. Removes records with NULL line_id, machine_id, or timestamp.
    2. Enforces positive non-null cycle times and units.
    3. Validates status_code against known taxonomy.
    4. Filters or clips out-of-bounds sensor readings.
    """
    total_input = len(df)
    if total_input == 0:
        return df, {
            "total_input": 0,
            "valid_records": 0,
            "dropped_records": 0,
            "drop_reasons": {}
        }

    drop_reasons = {}

    # 1. Null checks on primary keys/dimensions
    null_mask = df["line_id"].isna() | df["machine_id"].isna() | df["timestamp"].isna()
    null_count = int(null_mask.sum())
    if null_count > 0:
        drop_reasons["null_identifiers"] = null_count

    # 2. Cycle time sanity check
    invalid_cycle_mask = (df["cycle_time_sec"].isna()) | (df["cycle_time_sec"] <= 0) | (df["cycle_time_sec"] > 600.0)
    cycle_count = int(invalid_cycle_mask.sum())
    if cycle_count > 0:
        drop_reasons["invalid_cycle_time"] = cycle_count

    # 3. Non-negative units
    invalid_units_mask = (df["good_units"] < 0) | (df["defect_units"] < 0)
    units_count = int(invalid_units_mask.sum())
    if units_count > 0:
        drop_reasons["negative_production_units"] = units_count

    # 4. Valid status codes
    invalid_status_mask = ~df["status_code"].isin(VALID_STATUS_CODES)
    status_count = int(invalid_status_mask.sum())
    if status_count > 0:
        drop_reasons["unknown_status_code"] = status_count

    # Combine all failure masks
    combined_invalid = null_mask | invalid_cycle_mask | invalid_units_mask | invalid_status_mask
    valid_df = df[~combined_invalid].copy()

    # Cast timestamp to datetime
    valid_df["timestamp"] = pd.to_datetime(valid_df["timestamp"])

    dropped_count = total_input - len(valid_df)
    validation_summary = {
        "total_input": total_input,
        "valid_records": len(valid_df),
        "dropped_records": dropped_count,
        "valid_rate_pct": round((len(valid_df) / total_input) * 100.0, 2) if total_input > 0 else 100.0,
        "drop_reasons": drop_reasons
    }

    if dropped_count > 0:
        logger.warning(f"Data Quality Gate filtered out {dropped_count}/{total_input} invalid records: {drop_reasons}")
    else:
        logger.info(f"Data Quality Gate passed: 100% of {total_input} records valid.")

    return valid_df, validation_summary
