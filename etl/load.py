"""
FactoryPulse ETL - Load Module
Idempotently loads transformed OEE aggregations into PostgreSQL Data Mart
and logs pipeline execution audit metadata.
"""

import logging
from datetime import datetime
from typing import Optional
import pandas as pd
from sqlalchemy import Engine, text

logger = logging.getLogger("factorypulse.etl.load")

def load_oee_data_mart(engine: Engine, oee_df: pd.DataFrame) -> int:
    """
    Upserts hourly OEE records into hourly_production_summary table.
    Uses ON CONFLICT (hour_bucket, line_id, machine_id) DO UPDATE for idempotency.
    """
    if oee_df.empty:
        logger.info("No OEE records to load.")
        return 0

    upsert_sql = text("""
    INSERT INTO hourly_production_summary (
        hour_bucket,
        line_id,
        machine_id,
        total_cycles,
        total_good_units,
        total_defect_units,
        total_produced_units,
        operating_time_sec,
        unplanned_downtime_sec,
        planned_downtime_sec,
        idle_time_sec,
        availability_pct,
        performance_pct,
        quality_pct,
        oee_pct
    ) VALUES (
        :hour_bucket,
        :line_id,
        :machine_id,
        :total_cycles,
        :total_good_units,
        :total_defect_units,
        :total_produced_units,
        :operating_time_sec,
        :unplanned_downtime_sec,
        :planned_downtime_sec,
        :idle_time_sec,
        :availability_pct,
        :performance_pct,
        :quality_pct,
        :oee_pct
    )
    ON CONFLICT (hour_bucket, line_id, machine_id)
    DO UPDATE SET
        total_cycles = EXCLUDED.total_cycles,
        total_good_units = EXCLUDED.total_good_units,
        total_defect_units = EXCLUDED.total_defect_units,
        total_produced_units = EXCLUDED.total_produced_units,
        operating_time_sec = EXCLUDED.operating_time_sec,
        unplanned_downtime_sec = EXCLUDED.unplanned_downtime_sec,
        planned_downtime_sec = EXCLUDED.planned_downtime_sec,
        idle_time_sec = EXCLUDED.idle_time_sec,
        availability_pct = EXCLUDED.availability_pct,
        performance_pct = EXCLUDED.performance_pct,
        quality_pct = EXCLUDED.quality_pct,
        oee_pct = EXCLUDED.oee_pct,
        created_at = CURRENT_TIMESTAMP;
    """)

    records = oee_df.to_dict(orient="records")
    with engine.begin() as conn:
        for record in records:
            conn.execute(upsert_sql, record)

    logger.info(f"Successfully upserted {len(records)} records into Data Mart (hourly_production_summary).")
    return len(records)

def log_pipeline_execution(
    engine: Engine,
    pipeline_name: str,
    start_time: datetime,
    end_time: datetime,
    status: str,
    rows_processed: int = 0,
    error_message: Optional[str] = None
) -> None:
    """
    Writes execution audit metadata to pipeline_execution_logs.
    """
    log_query = text("""
    INSERT INTO pipeline_execution_logs (
        pipeline_name, start_time, end_time, status, rows_processed, error_message
    ) VALUES (
        :pipeline_name, :start_time, :end_time, :status, :rows_processed, :error_message
    );
    """)

    try:
        with engine.begin() as conn:
            conn.execute(log_query, {
                "pipeline_name": pipeline_name,
                "start_time": start_time,
                "end_time": end_time,
                "status": status,
                "rows_processed": rows_processed,
                "error_message": error_message
            })
        logger.info(f"Logged pipeline execution: {pipeline_name} -> {status} ({rows_processed} rows).")
    except Exception as e:
        logger.error(f"Failed to record pipeline log: {e}")
