"""
FactoryPulse ETL - Transform Module
Computes Overall Equipment Effectiveness (OEE) metrics and hourly production aggregations.
"""

import logging
from typing import Dict
import pandas as pd

logger = logging.getLogger("factorypulse.etl.transform")

# Standard ideal cycle times per equipment type (seconds/part)
IDEAL_CYCLE_TIMES: Dict[str, float] = {
    "CNC_A": 12.0,
    "CNC_B": 15.0,
    "ROBOT_ARM": 8.0
}
DEFAULT_IDEAL_CYCLE = 10.0

def calculate_hourly_oee_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms validated event-level telemetry into hourly aggregated OEE metrics.
    Formulas:
        1. Availability % = (Operating Time / (Operating Time + Unplanned Downtime)) * 100
        2. Performance %  = (Ideal Cycle Time * Total Units Produced) / Operating Time * 100 (capped at 100%)
        3. Quality %      = (Good Units / Total Units Produced) * 100
        4. OEE %          = (Availability * Performance * Quality) / 10000
    """
    if df.empty:
        return pd.DataFrame()

    # Add hour bucket column
    df_work = df.copy()
    df_work["hour_bucket"] = df_work["timestamp"].dt.floor("h")

    # Time categorization based on status_code / downtime_category
    df_work["operating_time_sec"] = df_work.apply(
        lambda r: r["cycle_time_sec"] if r["status_code"] == 1 else 0.0, axis=1
    )
    df_work["unplanned_downtime_sec"] = df_work.apply(
        lambda r: r["cycle_time_sec"] if r["downtime_category"] == "Unplanned Downtime" else 0.0, axis=1
    )
    df_work["planned_downtime_sec"] = df_work.apply(
        lambda r: r["cycle_time_sec"] if r["downtime_category"] == "Planned Maintenance" else 0.0, axis=1
    )
    df_work["idle_time_sec"] = df_work.apply(
        lambda r: r["cycle_time_sec"] if r["downtime_category"] == "Idle" else 0.0, axis=1
    )

    # Hourly Grouping
    grouped = df_work.groupby(["hour_bucket", "line_id", "machine_id"]).agg(
        total_cycles=("event_id", "count"),
        total_good_units=("good_units", "sum"),
        total_defect_units=("defect_units", "sum"),
        operating_time_sec=("operating_time_sec", "sum"),
        unplanned_downtime_sec=("unplanned_downtime_sec", "sum"),
        planned_downtime_sec=("planned_downtime_sec", "sum"),
        idle_time_sec=("idle_time_sec", "sum"),
    ).reset_index()

    grouped["total_produced_units"] = grouped["total_good_units"] + grouped["total_defect_units"]

    # Compute OEE Components
    def compute_oee(row):
        machine = row["machine_id"]
        ideal_cycle = IDEAL_CYCLE_TIMES.get(machine, DEFAULT_IDEAL_CYCLE)
        op_time = row["operating_time_sec"]
        unplanned_time = row["unplanned_downtime_sec"]
        produced = row["total_produced_units"]
        good = row["total_good_units"]

        # 1. Availability
        total_run_window = op_time + unplanned_time
        availability = (op_time / total_run_window * 100.0) if total_run_window > 0 else 0.0

        # 2. Performance
        if op_time > 0:
            performance = min((ideal_cycle * produced / op_time) * 100.0, 100.0)
        else:
            performance = 0.0

        # 3. Quality
        quality = (good / produced * 100.0) if produced > 0 else 0.0

        # 4. Overall OEE
        oee = (availability * performance * quality) / 10000.0

        return pd.Series({
            "availability_pct": round(availability, 2),
            "performance_pct": round(performance, 2),
            "quality_pct": round(quality, 2),
            "oee_pct": round(oee, 2)
        })

    oee_metrics = grouped.apply(compute_oee, axis=1)
    result_df = pd.concat([grouped, oee_metrics], axis=1)

    logger.info(f"Transformed telemetry into {len(result_df)} hourly OEE summary records.")
    return result_df
