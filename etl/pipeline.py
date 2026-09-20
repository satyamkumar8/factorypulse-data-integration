"""
FactoryPulse ETL - Master Pipeline Orchestrator
Coordinates: Extract -> Validate -> Transform -> Load with comprehensive audit logging.
"""

import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import create_engine

from .extract import extract_raw_telemetry
from .validate import validate_telemetry_batch
from .transform import calculate_hourly_oee_metrics
from .load import load_oee_data_mart, log_pipeline_execution

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [FactoryPulse ETL] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("factorypulse.etl.pipeline")

DEFAULT_DB_URI = "postgresql+psycopg2://mfg_user:mfg_password@localhost:5432/manufacturing_db"

def run_factorypulse_etl(
    db_uri: Optional[str] = None,
    line_id: Optional[str] = None,
    since_timestamp: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes the end-to-end FactoryPulse batch ETL pipeline:
    1. EXTRACT: Pulls raw machine telemetry from PostgreSQL.
    2. VALIDATE: Applies industrial data quality gates (filters invalid/corrupted records).
    3. TRANSFORM: Computes Availability, Performance, Quality, and OEE percentages.
    4. LOAD: Upserts metrics into Data Mart table with execution audit logging.
    """
    pipeline_name = "factorypulse_hourly_oee_pipeline"
    uri = db_uri or os.getenv("DB_URI", DEFAULT_DB_URI)
    engine = create_engine(uri)
    start_time = datetime.now()

    logger.info(f"Initiating pipeline: '{pipeline_name}'")

    try:
        # 1. EXTRACT
        raw_df = extract_raw_telemetry(engine, since_timestamp=since_timestamp, line_id=line_id)
        if raw_df.empty:
            logger.info("Extract returned 0 records. Pipeline finished with 0 updates.")
            end_time = datetime.now()
            log_pipeline_execution(engine, pipeline_name, start_time, end_time, "SUCCESS", 0)
            return {
                "status": "SUCCESS",
                "extracted_rows": 0,
                "valid_rows": 0,
                "loaded_rows": 0,
                "duration_sec": round((end_time - start_time).total_seconds(), 3),
                "validation_summary": {}
            }

        # 2. VALIDATE
        valid_df, val_summary = validate_telemetry_batch(raw_df)

        # 3. TRANSFORM
        oee_df = calculate_hourly_oee_metrics(valid_df)

        # 4. LOAD
        rows_loaded = load_oee_data_mart(engine, oee_df)
        end_time = datetime.now()
        duration = round((end_time - start_time).total_seconds(), 3)

        # Log Success
        log_pipeline_execution(
            engine,
            pipeline_name=pipeline_name,
            start_time=start_time,
            end_time=end_time,
            status="SUCCESS",
            rows_processed=rows_loaded
        )

        logger.info(f"Pipeline finished successfully in {duration}s. {rows_loaded} hourly aggregates upserted.")
        return {
            "status": "SUCCESS",
            "extracted_rows": len(raw_df),
            "valid_rows": len(valid_df),
            "loaded_rows": rows_loaded,
            "duration_sec": duration,
            "validation_summary": val_summary
        }

    except Exception as e:
        end_time = datetime.now()
        duration = round((end_time - start_time).total_seconds(), 3)
        error_msg = str(e)
        logger.error(f"Pipeline FAILED after {duration}s: {error_msg}", exc_info=True)

        try:
            log_pipeline_execution(
                engine,
                pipeline_name=pipeline_name,
                start_time=start_time,
                end_time=end_time,
                status="FAILED",
                rows_processed=0,
                error_message=error_msg
            )
        except Exception as log_err:
            logger.error(f"Failed to write error log to database: {log_err}")

        return {
            "status": "FAILED",
            "error": error_msg,
            "duration_sec": duration
        }

if __name__ == "__main__":
    result = run_factorypulse_etl()
    if result["status"] != "SUCCESS":
        sys.exit(1)
