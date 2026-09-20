-- ============================================================================
-- FactoryPulse: Database Initialization Script
-- Dialect: PostgreSQL 15+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Master & Dimension Tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS downtime_reasons (
    status_code INT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL
);

INSERT INTO downtime_reasons (status_code, status_name, category) VALUES
(1, 'Running Normal', 'Production'),
(2, 'Tool Change', 'Planned Maintenance'),
(3, 'Mechanical Jam', 'Unplanned Downtime'),
(4, 'Sensor Fault', 'Unplanned Downtime'),
(5, 'No Material', 'Idle')
ON CONFLICT (status_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS dim_line (
    line_id VARCHAR(20) PRIMARY KEY,
    line_name VARCHAR(100) NOT NULL,
    plant_location VARCHAR(50) DEFAULT 'Rayong Plant 1',
    target_oee_pct NUMERIC(5, 2) DEFAULT 85.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dim_line (line_id, line_name, plant_location, target_oee_pct) VALUES
('LINE_01', 'Automotive Suspension Line 1', 'Rayong Plant 1', 85.00),
('LINE_02', 'Precision Stamping Line 2', 'Rayong Plant 1', 85.00)
ON CONFLICT (line_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS dim_machine (
    machine_id VARCHAR(20) PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    machine_type VARCHAR(50) NOT NULL,
    line_id VARCHAR(20) REFERENCES dim_line(line_id),
    ideal_cycle_sec NUMERIC(6, 2) NOT NULL,
    power_rating_kw NUMERIC(6, 2) DEFAULT 45.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dim_machine (machine_id, machine_name, machine_type, line_id, ideal_cycle_sec, power_rating_kw) VALUES
('CNC_A', '5-Axis CNC Milling Center A', 'CNC Machining', 'LINE_01', 12.0, 37.5),
('CNC_B', 'Heavy-Duty CNC Lathe B', 'CNC Turning', 'LINE_01', 15.0, 45.0),
('ROBOT_ARM', '6-Axis Articulated Robot', 'Robotic Handling', 'LINE_01', 8.0, 12.0)
ON CONFLICT (machine_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Telemetry & Live Events
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS machine_telemetry (
    event_id BIGSERIAL PRIMARY KEY,
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cycle_time_sec NUMERIC(6, 2) NOT NULL,
    good_units INT DEFAULT 0,
    defect_units INT DEFAULT 0,
    status_code INT REFERENCES downtime_reasons(status_code),
    vibration_rms NUMERIC(8, 3) DEFAULT 1.25,
    vibration_kurtosis NUMERIC(8, 3) DEFAULT 3.00,
    bearing_temp_c NUMERIC(6, 2) DEFAULT 45.0,
    press_force_kn NUMERIC(8, 2) DEFAULT 120.0,
    motor_current_amp NUMERIC(6, 2) DEFAULT 15.0,
    hydraulic_pressure_bar NUMERIC(6, 2) DEFAULT 150.0
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON machine_telemetry (timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_line ON machine_telemetry (line_id, machine_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_line_machine_ts_desc ON machine_telemetry (line_id, machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_unplanned_faults ON machine_telemetry (machine_id, timestamp DESC) WHERE status_code IN (3, 4);

-- ----------------------------------------------------------------------------
-- 3. Data Mart: Hourly Production & OEE Summary
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hourly_production_summary (
    summary_id SERIAL PRIMARY KEY,
    hour_bucket TIMESTAMP NOT NULL,
    line_id VARCHAR(50) NOT NULL,
    machine_id VARCHAR(50) NOT NULL,
    total_cycles INT NOT NULL,
    total_good_units INT NOT NULL,
    total_defect_units INT NOT NULL,
    total_produced_units INT NOT NULL,
    operating_time_sec NUMERIC(10, 2) NOT NULL,
    unplanned_downtime_sec NUMERIC(10, 2) NOT NULL,
    planned_downtime_sec NUMERIC(10, 2) NOT NULL,
    idle_time_sec NUMERIC(10, 2) NOT NULL,
    availability_pct NUMERIC(5, 2) NOT NULL,
    performance_pct NUMERIC(5, 2) NOT NULL,
    quality_pct NUMERIC(5, 2) NOT NULL,
    oee_pct NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_hour_line_machine UNIQUE (hour_bucket, line_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_datamart_hour ON hourly_production_summary(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_datamart_line_machine ON hourly_production_summary(line_id, machine_id);

-- ----------------------------------------------------------------------------
-- 4. Pipeline Execution Audit Logs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pipeline_execution_logs (
    log_id SERIAL PRIMARY KEY,
    pipeline_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    rows_processed INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Operational Alerts Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_operational_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    threshold_value NUMERIC(10, 2),
    actual_value NUMERIC(10, 2),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_alerts_ts ON fact_operational_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_machine ON fact_operational_alerts (line_id, machine_id, severity);

-- ----------------------------------------------------------------------------
-- 6. Machine Health & Prediction Scores Table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS machine_health_scores (
    score_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    event_id BIGINT,
    health_index NUMERIC(5, 2) NOT NULL,
    anomaly_score NUMERIC(6, 4) NOT NULL,
    defect_probability NUMERIC(5, 4) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    top_root_cause VARCHAR(50),
    root_cause_impact NUMERIC(6, 4)
);

CREATE INDEX IF NOT EXISTS idx_health_scores_machine_ts ON machine_health_scores(line_id, machine_id, timestamp DESC);