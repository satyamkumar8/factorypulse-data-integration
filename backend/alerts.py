"""
FactoryPulse - Operational Alerting Engine
Monitors live manufacturing metrics against configurable operational thresholds
and persists alerts to fact_operational_alerts.
"""

import os
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import Engine, text

logger = logging.getLogger("factorypulse.alerts")

# Default Operational Thresholds
DEFAULT_THRESHOLDS = {
    "defect_rate_pct": 5.0,           # > 5% scrap triggers WARNING
    "max_downtime_sec": 30.0,         # > 30s single stoppage triggers ALERT
    "bearing_temp_c": 65.0,           # > 65°C triggers THERMAL WARNING
    "vibration_rms": 2.20,            # > 2.20 mm/s² triggers VIBRATION ALERT
    "consecutive_defects": 2          # >= 2 consecutive defects triggers QUALITY SPIKE
}

def evaluate_and_record_alerts(engine: Engine, thresholds: Optional[Dict[str, float]] = None) -> List[Dict[str, Any]]:
    """
    Evaluates recent telemetry events against operational thresholds and records alerts.
    """
    cfg = thresholds or DEFAULT_THRESHOLDS
    new_alerts = []

    # 1. Check for physical sensor boundary breaches & severe downtime in the latest events
    query_recent = text("""
        SELECT 
            t.event_id,
            t.timestamp,
            t.line_id,
            t.machine_id,
            t.cycle_time_sec,
            t.good_units,
            t.defect_units,
            t.status_code,
            r.status_name,
            r.category,
            COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
            COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c
        FROM machine_telemetry t
        JOIN downtime_reasons r ON t.status_code = r.status_code
        ORDER BY t.event_id DESC
        LIMIT 50;
    """)

    insert_alert_sql = text("""
        INSERT INTO fact_operational_alerts (
            line_id, machine_id, alert_type, severity, threshold_value, actual_value, message
        ) VALUES (
            :line_id, :machine_id, :alert_type, :severity, :threshold_val, :actual_val, :msg
        );
    """)

    try:
        with engine.connect() as conn:
            rows = conn.execute(query_recent).mappings().all()

        for row in rows:
            # A. Thermal Alert
            if row["bearing_temp_c"] > cfg["bearing_temp_c"]:
                alert = {
                    "line_id": row["line_id"],
                    "machine_id": row["machine_id"],
                    "alert_type": "THERMAL_ANOMALY",
                    "severity": "CRITICAL" if row["bearing_temp_c"] > 75.0 else "WARNING",
                    "threshold_val": cfg["bearing_temp_c"],
                    "actual_val": float(row["bearing_temp_c"]),
                    "msg": f"Bearing temperature of {row['bearing_temp_c']:.1f}°C exceeded limit of {cfg['bearing_temp_c']:.1f}°C"
                }
                new_alerts.append(alert)

            # B. Vibration Spike Alert
            if row["vibration_rms"] > cfg["vibration_rms"]:
                alert = {
                    "line_id": row["line_id"],
                    "machine_id": row["machine_id"],
                    "alert_type": "VIBRATION_SPIKE",
                    "severity": "WARNING",
                    "threshold_val": cfg["vibration_rms"],
                    "actual_val": float(row["vibration_rms"]),
                    "msg": f"Vibration RMS of {row['vibration_rms']:.2f} mm/s² exceeded safety threshold of {cfg['vibration_rms']:.2f} mm/s²"
                }
                new_alerts.append(alert)

            # C. Unplanned Breakdown / Prolonged Stoppage Alert
            if row["category"] == "Unplanned Downtime" and row["cycle_time_sec"] > cfg["max_downtime_sec"]:
                alert = {
                    "line_id": row["line_id"],
                    "machine_id": row["machine_id"],
                    "alert_type": "PROLONGED_DOWNTIME",
                    "severity": "CRITICAL",
                    "threshold_val": cfg["max_downtime_sec"],
                    "actual_val": float(row["cycle_time_sec"]),
                    "msg": f"Unplanned downtime event ({row['status_name']}) lasted {row['cycle_time_sec']:.1f}s"
                }
                new_alerts.append(alert)

        # Batch insert newly generated alerts (deduplicating to prevent flood)
        if new_alerts:
            with engine.begin() as conn:
                for a in new_alerts[:10]: # Top 10 to avoid noise
                    conn.execute(insert_alert_sql, {
                        "line_id": a["line_id"],
                        "machine_id": a["machine_id"],
                        "alert_type": a["alert_type"],
                        "severity": a["severity"],
                        "threshold_val": a["threshold_val"],
                        "actual_val": a["actual_val"],
                        "msg": a["msg"]
                    })
            logger.info(f"Recorded {len(new_alerts[:10])} operational alerts to database.")

    except Exception as e:
        logger.error(f"Error evaluating operational alerts: {e}")

    return new_alerts

def get_recent_alerts(engine: Engine, limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieves the latest operational alerts."""
    query = text("""
        SELECT 
            alert_id,
            timestamp,
            line_id,
            machine_id,
            alert_type,
            severity,
            threshold_value,
            actual_value,
            message,
            is_acknowledged
        FROM fact_operational_alerts
        ORDER BY timestamp DESC
        LIMIT :limit;
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"limit": limit}).mappings().all()
        return [
            {
                "alert_id": r["alert_id"],
                "timestamp": r["timestamp"].isoformat() if hasattr(r["timestamp"], "isoformat") else str(r["timestamp"]),
                "line_id": r["line_id"],
                "machine_id": r["machine_id"],
                "alert_type": r["alert_type"],
                "severity": r["severity"],
                "threshold_value": float(r["threshold_value"]) if r["threshold_value"] else None,
                "actual_value": float(r["actual_value"]) if r["actual_value"] else None,
                "message": r["message"],
                "is_acknowledged": r["is_acknowledged"]
            }
            for r in rows
        ]

def acknowledge_alert(engine: Engine, alert_id: int, user: str = "operator") -> bool:
    """Marks an alert as acknowledged."""
    query = text("""
        UPDATE fact_operational_alerts
        SET is_acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = :user
        WHERE alert_id = :alert_id;
    """)
    with engine.begin() as conn:
        result = conn.execute(query, {"alert_id": alert_id, "user": user})
        return result.rowcount > 0
