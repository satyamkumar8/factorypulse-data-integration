-- ============================================================================
-- FactoryPulse: Star Schema & Dimensional Modeling for Manufacturing Warehouse
-- Dialect: PostgreSQL 15+
-- Description: Dimensional model containing Conformed Dimensions (Machine, Line, Date, Reason)
--              and Facts (Telemetry, Hourly OEE Data Mart, Operational Alerts).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DIMENSION TABLES
-- ----------------------------------------------------------------------------

-- Dimension: Plants & Production Lines
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


-- Dimension: Machines & Physical Equipment Specs
CREATE TABLE IF NOT EXISTS dim_machine (
    machine_id VARCHAR(20) PRIMARY KEY,
    machine_name VARCHAR(100) NOT NULL,
    machine_type VARCHAR(50) NOT NULL,
    line_id VARCHAR(20) REFERENCES dim_line(line_id),
    ideal_cycle_sec NUMERIC(6, 2) NOT NULL,
    power_rating_kw NUMERIC(6, 2) DEFAULT 45.0,
    max_rpm INT DEFAULT 6000,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dim_machine (machine_id, machine_name, machine_type, line_id, ideal_cycle_sec, power_rating_kw) VALUES
('CNC_A', '5-Axis CNC Milling Center A', 'CNC Machining', 'LINE_01', 12.0, 37.5),
('CNC_B', 'Heavy-Duty CNC Lathe B', 'CNC Turning', 'LINE_01', 15.0, 45.0),
('ROBOT_ARM', '6-Axis Articulated Pick & Place Robot', 'Robotic Handling', 'LINE_01', 8.0, 12.0)
ON CONFLICT (machine_id) DO NOTHING;


-- Dimension: Downtime Reason Taxonomy (Standardized OEE Loss Hierarchy)
CREATE TABLE IF NOT EXISTS dim_downtime_reason (
    status_code INT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'Production', 'Planned Maintenance', 'Unplanned Downtime', 'Idle'
    severity_level VARCHAR(20) DEFAULT 'LOW'
);

INSERT INTO dim_downtime_reason (status_code, status_name, category, severity_level) VALUES
(1, 'Running Normal', 'Production', 'INFO'),
(2, 'Tool Change / Setup', 'Planned Maintenance', 'LOW'),
(3, 'Mechanical Jam', 'Unplanned Downtime', 'CRITICAL'),
(4, 'Sensor Fault', 'Unplanned Downtime', 'HIGH'),
(5, 'No Material / Starved', 'Idle', 'MEDIUM')
ON CONFLICT (status_code) DO NOTHING;


-- Dimension: Date Dimension (Calendar Attributes)
CREATE TABLE IF NOT EXISTS dim_date (
    date_key INT PRIMARY KEY, -- YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    day_of_week INT NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    month INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    quarter INT NOT NULL,
    year INT NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

-- Seed Date Dimension for current year (2025-2027)
INSERT INTO dim_date (date_key, full_date, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
SELECT 
    TO_CHAR(d, 'YYYYMMDD')::INT AS date_key,
    d AS full_date,
    EXTRACT(ISODOW FROM d)::INT AS day_of_week,
    TO_CHAR(d, 'Day') AS day_name,
    EXTRACT(MONTH FROM d)::INT AS month,
    TO_CHAR(d, 'Month') AS month_name,
    EXTRACT(QUARTER FROM d)::INT AS quarter,
    EXTRACT(YEAR FROM d)::INT AS year,
    CASE WHEN EXTRACT(ISODOW FROM d) IN (6, 7) THEN TRUE ELSE FALSE END AS is_weekend
FROM GENERATE_SERIES('2025-01-01'::DATE, '2027-12-31'::DATE, '1 day'::INTERVAL) d
ON CONFLICT (date_key) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. FACT TABLES
-- ----------------------------------------------------------------------------

-- Fact: Operational Alerts (Priority 5 Requirement)
CREATE TABLE IF NOT EXISTS fact_operational_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_key INT REFERENCES dim_date(date_key),
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'HIGH_DEFECT_RATE', 'PROLONGED_DOWNTIME', 'THERMAL_ANOMALY', 'VIBRATION_SPIKE'
    severity VARCHAR(20) NOT NULL,   -- 'INFO', 'WARNING', 'CRITICAL'
    threshold_value NUMERIC(10, 2),
    actual_value NUMERIC(10, 2),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_alerts_ts ON fact_operational_alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_machine ON fact_operational_alerts (line_id, machine_id, severity);
