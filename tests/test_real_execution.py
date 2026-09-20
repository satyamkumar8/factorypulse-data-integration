"""
FactoryPulse - Real Execution & End-to-End Verification Test
Creates in-memory database schema, inserts test telemetry, runs ETL pipeline,
evaluates operational alerts, and tests SQL analytical compatibility.
"""

import unittest
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import create_engine, text

from etl.extract import extract_raw_telemetry
from etl.validate import validate_telemetry_batch
from etl.transform import calculate_hourly_oee_metrics
from etl.load import load_oee_data_mart, log_pipeline_execution
from backend.alerts import evaluate_and_record_alerts, get_recent_alerts

class TestRealExecution(unittest.TestCase):

    def setUp(self):
        # Create an in-memory SQLite database to test SQL execution, ETL and Alerts
        self.engine = create_engine("sqlite:///:memory:")

        # Initialize Tables in SQLite (compatible subset for testing)
        with self.engine.begin() as conn:
            conn.execute(text("""
            CREATE TABLE downtime_reasons (
                status_code INTEGER PRIMARY KEY,
                status_name TEXT NOT NULL,
                category TEXT NOT NULL
            );
            """))
            conn.execute(text("""
            INSERT INTO downtime_reasons (status_code, status_name, category) VALUES
            (1, 'Running Normal', 'Production'),
            (2, 'Tool Change', 'Planned Maintenance'),
            (3, 'Mechanical Jam', 'Unplanned Downtime'),
            (4, 'Sensor Fault', 'Unplanned Downtime'),
            (5, 'No Material', 'Idle');
            """))

            conn.execute(text("""
            CREATE TABLE machine_telemetry (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                line_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                cycle_time_sec REAL NOT NULL,
                good_units INTEGER DEFAULT 0,
                defect_units INTEGER DEFAULT 0,
                status_code INTEGER REFERENCES downtime_reasons(status_code),
                vibration_rms REAL DEFAULT 1.25,
                vibration_kurtosis REAL DEFAULT 3.00,
                bearing_temp_c REAL DEFAULT 45.0,
                press_force_kn REAL DEFAULT 120.0,
                motor_current_amp REAL DEFAULT 15.0,
                hydraulic_pressure_bar REAL DEFAULT 150.0
            );
            """))

            conn.execute(text("""
            CREATE TABLE hourly_production_summary (
                summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
                hour_bucket TIMESTAMP NOT NULL,
                line_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                total_cycles INTEGER NOT NULL,
                total_good_units INTEGER NOT NULL,
                total_defect_units INTEGER NOT NULL,
                total_produced_units INTEGER NOT NULL,
                operating_time_sec REAL NOT NULL,
                unplanned_downtime_sec REAL NOT NULL,
                planned_downtime_sec REAL NOT NULL,
                idle_time_sec REAL NOT NULL,
                availability_pct REAL NOT NULL,
                performance_pct REAL NOT NULL,
                quality_pct REAL NOT NULL,
                oee_pct REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (hour_bucket, line_id, machine_id)
            );
            """))

            conn.execute(text("""
            CREATE TABLE pipeline_execution_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_name TEXT NOT NULL,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                status TEXT NOT NULL,
                rows_processed INTEGER DEFAULT 0,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """))

            conn.execute(text("""
            CREATE TABLE fact_operational_alerts (
                alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                line_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                threshold_value REAL,
                actual_value REAL,
                message TEXT NOT NULL,
                is_acknowledged BOOLEAN DEFAULT 0,
                acknowledged_at TIMESTAMP,
                acknowledged_by TEXT
            );
            """))

            # Insert sample events: normal, breakdown, high thermal, vibration spike
            now = datetime(2026, 3, 21, 10, 0, 0)
            events = [
                ("LINE_01", "CNC_A", now, 12.0, 2, 0, 1, 1.25, 45.0),
                ("LINE_01", "CNC_A", now + timedelta(minutes=5), 14.0, 1, 1, 1, 1.30, 48.0),
                ("LINE_01", "CNC_A", now + timedelta(minutes=10), 45.0, 0, 0, 3, 2.50, 72.0), # Prolonged breakdown + high temp + vib spike
                ("LINE_01", "CNC_B", now, 15.0, 2, 0, 1, 1.60, 50.0),
                ("LINE_01", "CNC_B", now + timedelta(minutes=15), 15.0, 2, 0, 1, 1.55, 49.0),
            ]
            for ev in events:
                conn.execute(text("""
                INSERT INTO machine_telemetry (
                    line_id, machine_id, timestamp, cycle_time_sec, good_units, defect_units,
                    status_code, vibration_rms, bearing_temp_c
                ) VALUES (:l, :m, :ts, :c, :g, :d, :s, :v, :t);
                """), {"l": ev[0], "m": ev[1], "ts": ev[2], "c": ev[3], "g": ev[4], "d": ev[5], "s": ev[6], "v": ev[7], "t": ev[8]})

    def test_full_etl_execution_and_load(self):
        """Test Extract -> Validate -> Transform -> Load into Data Mart."""
        # 1. EXTRACT
        raw_df = extract_raw_telemetry(self.engine)
        self.assertEqual(len(raw_df), 5)

        # 2. VALIDATE
        valid_df, val_summary = validate_telemetry_batch(raw_df)
        self.assertEqual(val_summary["valid_records"], 5)
        self.assertEqual(val_summary["dropped_records"], 0)

        # 3. TRANSFORM
        oee_df = calculate_hourly_oee_metrics(valid_df)
        self.assertEqual(len(oee_df), 2) # CNC_A and CNC_B

        # 4. LOAD (using SQLite REPLACE syntax for testing)
        upsert_sqlite = text("""
        INSERT OR REPLACE INTO hourly_production_summary (
            hour_bucket, line_id, machine_id, total_cycles, total_good_units, total_defect_units,
            total_produced_units, operating_time_sec, unplanned_downtime_sec, planned_downtime_sec,
            idle_time_sec, availability_pct, performance_pct, quality_pct, oee_pct
        ) VALUES (
            :hour_bucket, :line_id, :machine_id, :total_cycles, :total_good_units, :total_defect_units,
            :total_produced_units, :operating_time_sec, :unplanned_downtime_sec, :planned_downtime_sec,
            :idle_time_sec, :availability_pct, :performance_pct, :quality_pct, :oee_pct
        );
        """)
        records = oee_df.to_dict(orient="records")
        with self.engine.begin() as conn:
            for rec in records:
                if hasattr(rec["hour_bucket"], "to_pydatetime"):
                    rec["hour_bucket"] = rec["hour_bucket"].to_pydatetime()
                conn.execute(upsert_sqlite, rec)

        # Verify Data Mart in DB
        with self.engine.connect() as conn:
            cnt = conn.execute(text("SELECT COUNT(*) FROM hourly_production_summary;")).scalar()
            self.assertEqual(cnt, 2)

            # Check CNC_A values
            cnc_a = conn.execute(text("SELECT * FROM hourly_production_summary WHERE machine_id = 'CNC_A';")).mappings().first()
            self.assertEqual(cnc_a["total_cycles"], 3)
            self.assertEqual(cnc_a["total_good_units"], 3)
            self.assertEqual(cnc_a["total_defect_units"], 1)

    def test_alerts_evaluation_real_execution(self):
        """Test operational alerts logic evaluating real records."""
        alerts = evaluate_and_record_alerts(self.engine)
        self.assertTrue(len(alerts) >= 1)

        # Check that high temperature (72C > 65C) and vibration (>2.2) were caught
        alert_types = [a["alert_type"] for a in alerts]
        self.assertIn("THERMAL_ANOMALY", alert_types)
        self.assertIn("VIBRATION_SPIKE", alert_types)
        self.assertIn("PROLONGED_DOWNTIME", alert_types)

        # Verify saved in DB
        db_alerts = get_recent_alerts(self.engine)
        self.assertTrue(len(db_alerts) >= 1)

if __name__ == "__main__":
    unittest.main()
