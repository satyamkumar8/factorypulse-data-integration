import os
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool

DEFAULT_URI = "postgresql+psycopg2://mfg_user:mfg_password@localhost:5432/manufacturing_db"
DB_URI = os.getenv("DB_URI", DEFAULT_URI)

# Connection pool for high-concurrency production usage
engine = create_engine(
    DB_URI,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True
)

TARGET_CYCLE_TIMES = {
    "CNC_A": 12.0,
    "CNC_B": 15.0,
    "ROBOT_ARM": 8.0
}

def get_latest_machines(line_id: Optional[str] = None) -> List[Dict[str, Any]]:
    condition = "WHERE t.line_id = :line_id" if line_id else ""
    query = text(f"""
        WITH ranked AS (
            SELECT 
                t.event_id,
                t.timestamp,
                t.line_id,
                t.machine_id,
                t.status_code,
                r.status_name,
                r.category,
                t.good_units,
                t.defect_units,
                t.cycle_time_sec,
                COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
                COALESCE(t.vibration_kurtosis, 3.00) AS vibration_kurtosis,
                COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
                COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
                COALESCE(t.motor_current_amp, 15.0) AS motor_current_amp,
                COALESCE(t.hydraulic_pressure_bar, 150.0) AS hydraulic_pressure_bar,
                ROW_NUMBER() OVER (PARTITION BY t.line_id, t.machine_id ORDER BY t.event_id DESC) as rn
            FROM machine_telemetry t
            JOIN downtime_reasons r ON t.status_code = r.status_code
            {condition}
        ),
        latest_health AS (
            SELECT DISTINCT ON (line_id, machine_id)
                line_id,
                machine_id,
                health_index,
                anomaly_score,
                defect_probability,
                risk_level,
                top_root_cause
            FROM machine_health_scores
            ORDER BY line_id, machine_id, timestamp DESC
        )
        SELECT 
            r.*,
            COALESCE(h.health_index, 100.0) AS health_index,
            COALESCE(h.defect_probability, 0.01) AS defect_probability,
            COALESCE(h.risk_level, 'NORMAL') AS risk_level,
            COALESCE(h.top_root_cause, 'None') AS top_root_cause
        FROM ranked r
        LEFT JOIN latest_health h ON r.line_id = h.line_id AND r.machine_id = h.machine_id
        WHERE r.rn <= 5 
        ORDER BY r.line_id, r.machine_id, r.rn ASC;
    """)
    params = {"line_id": line_id} if line_id else {}
    with engine.connect() as conn:
        rows = conn.execute(query, params).mappings().all()
        grouped: Dict[tuple, Dict[str, Any]] = {}
        for r in rows:
            key = (r["line_id"], r["machine_id"])
            if key not in grouped:
                target = TARGET_CYCLE_TIMES.get(r["machine_id"], 10.0)
                grouped[key] = {
                    "event_id": r["event_id"],
                    "timestamp": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"]),
                    "line_id": r["line_id"],
                    "machine_id": r["machine_id"],
                    "status_code": r["status_code"],
                    "status_name": r["status_name"],
                    "category": r["category"],
                    "good_units": r["good_units"],
                    "defect_units": r["defect_units"],
                    "cycle_time_sec": float(r["cycle_time_sec"]),
                    "target_cycle_time_sec": target,
                    "vibration_rms": float(r["vibration_rms"]),
                    "vibration_kurtosis": float(r["vibration_kurtosis"]),
                    "bearing_temp_c": float(r["bearing_temp_c"]),
                    "press_force_kn": float(r["press_force_kn"]),
                    "motor_current_amp": float(r["motor_current_amp"]),
                    "hydraulic_pressure_bar": float(r["hydraulic_pressure_bar"]),
                    "health_index": float(r["health_index"]),
                    "defect_probability": float(r["defect_probability"]),
                    "risk_level": str(r["risk_level"]),
                    "top_root_cause": str(r["top_root_cause"]),
                    "recent_history": []
                }
            grouped[key]["recent_history"].append({
                "event_id": r["event_id"],
                "status_code": r["status_code"],
                "status_name": r["status_name"],
                "category": r["category"],
                "good_units": r["good_units"],
                "defect_units": r["defect_units"],
                "cycle_time_sec": float(r["cycle_time_sec"]),
                "time": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"])
            })
        return list(grouped.values())

def get_recent_telemetry(limit: int = 50, line_id: Optional[str] = None) -> List[Dict[str, Any]]:
    condition = "WHERE t.line_id = :line_id" if line_id else ""
    query = text(f"""
        SELECT 
            t.event_id,
            t.timestamp,
            t.line_id,
            t.machine_id,
            t.status_code,
            r.status_name,
            r.category,
            t.good_units,
            t.defect_units,
            t.cycle_time_sec,
            COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
            COALESCE(t.vibration_kurtosis, 3.00) AS vibration_kurtosis,
            COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
            COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
            COALESCE(t.motor_current_amp, 15.0) AS motor_current_amp,
            COALESCE(t.hydraulic_pressure_bar, 150.0) AS hydraulic_pressure_bar
        FROM machine_telemetry t
        JOIN downtime_reasons r ON t.status_code = r.status_code
        {condition}
        ORDER BY t.event_id DESC
        LIMIT :limit;
    """)
    params = {"limit": limit}
    if line_id:
        params["line_id"] = line_id
    with engine.connect() as conn:
        rows = conn.execute(query, params).mappings().all()
        return [
            {
                "event_id": r["event_id"],
                "timestamp": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"]),
                "line_id": r["line_id"],
                "machine_id": r["machine_id"],
                "status_code": r["status_code"],
                "status_name": r["status_name"],
                "category": r["category"],
                "good_units": r["good_units"],
                "defect_units": r["defect_units"],
                "cycle_time_sec": float(r["cycle_time_sec"]),
                "vibration_rms": float(r["vibration_rms"]),
                "vibration_kurtosis": float(r["vibration_kurtosis"]),
                "bearing_temp_c": float(r["bearing_temp_c"]),
                "press_force_kn": float(r["press_force_kn"]),
                "motor_current_amp": float(r["motor_current_amp"]),
                "hydraulic_pressure_bar": float(r["hydraulic_pressure_bar"])
            }
            for r in rows
        ]

def get_new_telemetry_events(after_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    query = text("""
        SELECT 
            t.event_id,
            t.timestamp,
            t.line_id,
            t.machine_id,
            t.status_code,
            r.status_name,
            r.category,
            t.good_units,
            t.defect_units,
            t.cycle_time_sec,
            COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
            COALESCE(t.vibration_kurtosis, 3.00) AS vibration_kurtosis,
            COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
            COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
            COALESCE(t.motor_current_amp, 15.0) AS motor_current_amp,
            COALESCE(t.hydraulic_pressure_bar, 150.0) AS hydraulic_pressure_bar
        FROM machine_telemetry t
        JOIN downtime_reasons r ON t.status_code = r.status_code
        WHERE t.event_id > :after_id
        ORDER BY t.event_id ASC
        LIMIT :limit;
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"after_id": after_id, "limit": limit}).mappings().all()
        return [
            {
                "event_id": r["event_id"],
                "timestamp": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"]),
                "line_id": r["line_id"],
                "machine_id": r["machine_id"],
                "status_code": r["status_code"],
                "status_name": r["status_name"],
                "category": r["category"],
                "good_units": r["good_units"],
                "defect_units": r["defect_units"],
                "cycle_time_sec": float(r["cycle_time_sec"]),
                "vibration_rms": float(r["vibration_rms"]),
                "vibration_kurtosis": float(r["vibration_kurtosis"]),
                "bearing_temp_c": float(r["bearing_temp_c"]),
                "press_force_kn": float(r["press_force_kn"]),
                "motor_current_amp": float(r["motor_current_amp"]),
                "hydraulic_pressure_bar": float(r["hydraulic_pressure_bar"])
            }
            for r in rows
        ]

def get_predictive_health_summary(line_id: Optional[str] = None) -> List[Dict[str, Any]]:
    condition = "WHERE line_id = :line_id" if line_id else ""
    query = text(f"""
        SELECT DISTINCT ON (line_id, machine_id)
            score_id,
            timestamp,
            line_id,
            machine_id,
            health_index,
            anomaly_score,
            defect_probability,
            risk_level,
            top_root_cause,
            root_cause_impact
        FROM machine_health_scores
        {condition}
        ORDER BY line_id, machine_id, timestamp DESC;
    """)
    params = {"line_id": line_id} if line_id else {}
    with engine.connect() as conn:
        rows = conn.execute(query, params).mappings().all()
        return [
            {
                "line_id": r["line_id"],
                "machine_id": r["machine_id"],
                "health_index": float(r["health_index"]),
                "anomaly_score": float(r["anomaly_score"]),
                "defect_probability": float(r["defect_probability"]),
                "risk_level": str(r["risk_level"]),
                "top_root_cause": str(r["top_root_cause"] or "None"),
                "root_cause_impact": float(r["root_cause_impact"] or 0.0),
                "timestamp": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"])
            }
            for r in rows
        ]

def get_max_event_id() -> int:
    query = text("SELECT COALESCE(MAX(event_id), 0) FROM machine_telemetry;")
    with engine.connect() as conn:
        return conn.execute(query).scalar() or 0

def get_hourly_oee() -> List[Dict[str, Any]]:
    query = text("""
        SELECT 
            hour_bucket,
            line_id,
            machine_id,
            total_cycles,
            total_good_units,
            total_defect_units,
            total_produced_units,
            operating_time_sec,
            unplanned_downtime_sec,
            availability_pct,
            performance_pct,
            quality_pct,
            oee_pct
        FROM hourly_production_summary
        ORDER BY hour_bucket ASC, line_id, machine_id;
    """)
    with engine.connect() as conn:
        rows = conn.execute(query).mappings().all()
        return [
            {
                "hour_bucket": r["hour_bucket"].isoformat() if hasattr(r["hour_bucket"], "isoformat") else str(r["hour_bucket"]),
                "line_id": r["line_id"],
                "machine_id": r["machine_id"],
                "total_cycles": r["total_cycles"],
                "total_good_units": r["total_good_units"],
                "total_defect_units": r["total_defect_units"],
                "total_produced_units": r["total_produced_units"],
                "operating_time_sec": float(r["operating_time_sec"]),
                "unplanned_downtime_sec": float(r["unplanned_downtime_sec"]),
                "availability_pct": float(r["availability_pct"]),
                "performance_pct": float(r["performance_pct"]),
                "quality_pct": float(r["quality_pct"]),
                "oee_pct": float(r["oee_pct"])
            }
            for r in rows
        ]

def get_kpi_summary(line_id: Optional[str] = None) -> Dict[str, Any]:
    # Compute summary from telemetry and latest OEE (scoped by line_id if provided)
    with engine.connect() as conn:
        condition_telemetry = "WHERE t.line_id = :line_id" if line_id else ""
        condition_oee = "WHERE line_id = :line_id" if line_id else ""
        params = {"line_id": line_id} if line_id else {}

        # Telemetry aggregate
        telemetry_stats = conn.execute(text(f"""
            SELECT 
                COUNT(*) as total_events,
                COALESCE(SUM(good_units), 0) as total_good,
                COALESCE(SUM(defect_units), 0) as total_defect,
                COALESCE(SUM(CASE WHEN r.category = 'Unplanned Downtime' THEN t.cycle_time_sec ELSE 0 END), 0) as lost_time
            FROM machine_telemetry t
            JOIN downtime_reasons r ON t.status_code = r.status_code
            {condition_telemetry};
        """), params).mappings().first()

        # Latest OEE average
        avg_oee = conn.execute(text(f"""
            SELECT COALESCE(ROUND(AVG(oee_pct), 2), 0.0) as avg_oee
            FROM (
                SELECT DISTINCT ON (line_id, machine_id) oee_pct
                FROM hourly_production_summary
                {condition_oee}
                ORDER BY line_id, machine_id, hour_bucket DESC
            ) latest_oee;
        """), params).scalar() or 0.0

        # Breakdown machines right now
        breakdown_count = conn.execute(text(f"""
            SELECT COUNT(*) FROM (
                SELECT DISTINCT ON (t.line_id, t.machine_id) r.category
                FROM machine_telemetry t
                JOIN downtime_reasons r ON t.status_code = r.status_code
                {condition_telemetry}
                ORDER BY t.line_id, t.machine_id, t.event_id DESC
            ) m WHERE category = 'Unplanned Downtime';
        """), params).scalar() or 0

        active_count = 3 if line_id else 6

        total_good = int(telemetry_stats["total_good"]) if telemetry_stats else 0
        total_defect = int(telemetry_stats["total_defect"]) if telemetry_stats else 0
        total_produced = total_good + total_defect
        defect_rate = round((total_defect / total_produced * 100.0), 2) if total_produced > 0 else 0.0
        lost_time = float(telemetry_stats["lost_time"]) if telemetry_stats else 0.0

        return {
            "scope": line_id if line_id else "ALL LINES",
            "plant_oee_pct": float(avg_oee),
            "total_produced": total_produced,
            "total_good": total_good,
            "total_defects": total_defect,
            "defect_rate_pct": defect_rate,
            "unplanned_downtime_sec": lost_time,
            "active_machines_count": active_count,
            "breakdown_machines_count": int(breakdown_count)
        }

def get_logs(limit: int = 10) -> List[Dict[str, Any]]:
    query = text("""
        SELECT 
            log_id,
            pipeline_name,
            start_time,
            end_time,
            status,
            rows_processed,
            error_message
        FROM pipeline_execution_logs
        ORDER BY log_id DESC
        LIMIT :limit;
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"limit": limit}).mappings().all()
        return [
            {
                "log_id": r["log_id"],
                "pipeline_name": r["pipeline_name"],
                "start_time": r["start_time"].isoformat() if hasattr(r["start_time"], "isoformat") else str(r["start_time"]),
                "end_time": r["end_time"].isoformat() if hasattr(r["end_time"], "isoformat") and r["end_time"] else None,
                "status": r["status"],
                "rows_processed": r["rows_processed"],
                "error_message": r["error_message"]
            }
            for r in rows
        ]

def clear_execution_logs() -> Dict[str, Any]:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE pipeline_execution_logs RESTART IDENTITY;"))
    return {
        "status": "SUCCESS",
        "message": "Pipeline execution logs cleared and sequence reset to #1"
    }

def clear_telemetry_data() -> Dict[str, Any]:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE machine_telemetry RESTART IDENTITY;"))
    return {
        "status": "SUCCESS",
        "message": "Simulated machine telemetry cleared and event_id sequence reset to #1"
    }

def clear_oee_data() -> Dict[str, Any]:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE hourly_production_summary RESTART IDENTITY;"))
    return {
        "status": "SUCCESS",
        "message": "Hourly OEE summary data mart cleared and sequence reset to #1"
    }

def clear_all_history() -> Dict[str, Any]:
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE pipeline_execution_logs RESTART IDENTITY;"))
        conn.execute(text("TRUNCATE TABLE machine_telemetry RESTART IDENTITY;"))
        conn.execute(text("TRUNCATE TABLE hourly_production_summary RESTART IDENTITY;"))
    return {
        "status": "SUCCESS",
        "message": "All pipeline logs, telemetry events, and OEE summaries have been reset"
    }

def seed_historical_telemetry(hours_back: int = 8) -> Dict[str, Any]:
    lines = ["LINE_01", "LINE_02"]
    machines = ["CNC_A", "CNC_B", "ROBOT_ARM"]
    now = datetime.now().replace(minute=0, second=0, microsecond=0)

    insert_query = text("""
        INSERT INTO machine_telemetry (line_id, machine_id, timestamp, cycle_time_sec, good_units, defect_units, status_code)
        VALUES (:line_id, :machine_id, :ts, :cycle_time_sec, :good_units, :defect_units, :status_code);
    """)

    total_events = 0
    with engine.begin() as conn:
        for h_offset in range(hours_back, -1, -1):
            bucket_time = now - timedelta(hours=h_offset)
            for line in lines:
                for machine in machines:
                    cycles = random.randint(15, 25)
                    for _ in range(cycles):
                        ts = bucket_time + timedelta(minutes=random.randint(1, 58), seconds=random.randint(0, 59))
                        status = random.choices([1, 2, 3, 4, 5], weights=[85, 4, 5, 3, 3])[0]
                        if status == 1:
                            cycle_time = round(random.uniform(8.5, 14.0), 2)
                            good_units = random.randint(1, 2)
                            defect_units = 1 if random.random() < 0.04 else 0
                        else:
                            cycle_time = round(random.uniform(15.0, 40.0), 2)
                            good_units = 0
                            defect_units = 0

                        conn.execute(insert_query, {
                            "line_id": line,
                            "machine_id": machine,
                            "ts": ts,
                            "cycle_time_sec": cycle_time,
                            "good_units": good_units,
                            "defect_units": defect_units,
                            "status_code": status
                        })
                        total_events += 1

    # Immediately trigger ETL job to compute OEE summary across all hours
    etl_res = trigger_batch_etl_job()

    return {
        "status": "SUCCESS",
        "events_generated": total_events,
        "hours_covered": hours_back + 1,
        "etl_summary": etl_res
    }

def trigger_batch_etl_job() -> Dict[str, Any]:
    pipeline_name = "hourly_oee_batch_aggregation"
    start_time = datetime.now()

    etl_query = text("""
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
    )
    WITH raw_metrics AS (
        SELECT 
            DATE_TRUNC('hour', t.timestamp) AS hour_bucket,
            t.line_id,
            t.machine_id,
            COUNT(t.event_id) AS total_cycles,
            SUM(t.good_units) AS total_good_units,
            SUM(t.defect_units) AS total_defect_units,
            SUM(t.good_units + t.defect_units) AS total_produced_units,
            SUM(CASE WHEN t.status_code = 1 THEN t.cycle_time_sec ELSE 0 END) AS operating_time_sec,
            SUM(CASE WHEN r.category = 'Unplanned Downtime' THEN t.cycle_time_sec ELSE 0 END) AS unplanned_downtime_sec,
            SUM(CASE WHEN r.category = 'Planned Maintenance' THEN t.cycle_time_sec ELSE 0 END) AS planned_downtime_sec,
            SUM(CASE WHEN r.category = 'Idle' THEN t.cycle_time_sec ELSE 0 END) AS idle_time_sec,
            CASE 
                WHEN t.machine_id = 'CNC_A' THEN 12.0
                WHEN t.machine_id = 'CNC_B' THEN 15.0
                WHEN t.machine_id = 'ROBOT_ARM' THEN 8.0
                ELSE 10.0
            END AS ideal_cycle_time_sec
        FROM machine_telemetry t
        JOIN downtime_reasons r ON t.status_code = r.status_code
        GROUP BY DATE_TRUNC('hour', t.timestamp), t.line_id, t.machine_id
    ),
    calculated_oee AS (
        SELECT 
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
            ROUND(
                (operating_time_sec / NULLIF(operating_time_sec + unplanned_downtime_sec, 0)) * 100.0, 
                2
            ) AS availability_pct,
            ROUND(
                LEAST(((ideal_cycle_time_sec * total_produced_units) / NULLIF(operating_time_sec, 0)) * 100.0, 100.0), 
                2
            ) AS performance_pct,
            ROUND(
                (total_good_units::NUMERIC / NULLIF(total_produced_units, 0)) * 100.0, 
                2
            ) AS quality_pct
        FROM raw_metrics
    )
    SELECT 
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
        COALESCE(availability_pct, 0.00) AS availability_pct,
        COALESCE(performance_pct, 0.00) AS performance_pct,
        COALESCE(quality_pct, 0.00) AS quality_pct,
        ROUND(
            (COALESCE(availability_pct, 0.00) * COALESCE(performance_pct, 0.00) * COALESCE(quality_pct, 0.00)) / 10000.0, 
            2
        ) AS oee_pct
    FROM calculated_oee
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

    log_query = text("""
    INSERT INTO pipeline_execution_logs (pipeline_name, start_time, end_time, status, rows_processed, error_message)
    VALUES (:p_name, :s_time, :e_time, :status, :rows, :err);
    """)

    with engine.begin() as conn:
        result = conn.execute(etl_query)
        rows_affected = result.rowcount
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        conn.execute(log_query, {
            "p_name": pipeline_name,
            "s_time": start_time,
            "e_time": end_time,
            "status": "SUCCESS",
            "rows": rows_affected,
            "err": None
        })

    return {
        "status": "SUCCESS",
        "message": f"Successfully aggregated and upserted {rows_affected} records into Data Mart",
        "rows_affected": rows_affected,
        "duration_sec": round(duration, 3)
    }
