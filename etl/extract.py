"""
FactoryPulse ETL - Extract Module
Extracts raw telemetry and master reference datasets from PostgreSQL storage.
"""

import logging
from typing import Optional
import pandas as pd
from sqlalchemy import Engine, text

logger = logging.getLogger("factorypulse.etl.extract")

def extract_raw_telemetry(
    engine: Engine,
    since_timestamp: Optional[str] = None,
    line_id: Optional[str] = None,
    limit: Optional[int] = None
) -> pd.DataFrame:
    """
    Extracts raw telemetry events joined with downtime master reasons.
    """
    filters = []
    params = {}

    if since_timestamp:
        filters.append("t.timestamp >= :since_ts")
        params["since_ts"] = since_timestamp

    if line_id:
        filters.append("t.line_id = :line_id")
        params["line_id"] = line_id

    where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
    limit_clause = f"LIMIT {limit}" if limit else ""

    query = f"""
    SELECT 
        t.event_id,
        t.line_id,
        t.machine_id,
        t.timestamp,
        t.cycle_time_sec,
        t.good_units,
        t.defect_units,
        t.status_code,
        r.status_name,
        r.category AS downtime_category,
        COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
        COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
        COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
        COALESCE(t.motor_current_amp, 15.0) AS motor_current_amp
    FROM machine_telemetry t
    LEFT JOIN downtime_reasons r ON t.status_code = r.status_code
    {where_clause}
    ORDER BY t.timestamp ASC
    {limit_clause};
    """

    with engine.connect() as conn:
        df = pd.read_sql_query(text(query), conn, params=params)
        logger.info(f"Extracted {len(df)} telemetry records from PostgreSQL.")
        return df
