-- 002_add_sensor_telemetry.sql
-- Add physical sensor fields to support Industrial Data Science & Predictive Maintenance models (NHK Spring focus)

ALTER TABLE machine_telemetry 
ADD COLUMN IF NOT EXISTS vibration_rms NUMERIC(8, 3) DEFAULT 1.25,
ADD COLUMN IF NOT EXISTS vibration_kurtosis NUMERIC(8, 3) DEFAULT 3.00,
ADD COLUMN IF NOT EXISTS bearing_temp_c NUMERIC(6, 2) DEFAULT 45.0,
ADD COLUMN IF NOT EXISTS press_force_kn NUMERIC(8, 2) DEFAULT 120.0,
ADD COLUMN IF NOT EXISTS motor_current_amp NUMERIC(6, 2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS hydraulic_pressure_bar NUMERIC(6, 2) DEFAULT 150.0;

-- Table to store Machine Health Score evaluations and real-time risk predictions
CREATE TABLE IF NOT EXISTS machine_health_scores (
    score_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    event_id BIGINT,
    health_index NUMERIC(5, 2) NOT NULL,       -- Scale 0 - 100%
    anomaly_score NUMERIC(6, 4) NOT NULL,      -- Anomaly score from Unsupervised Model
    defect_probability NUMERIC(5, 4) NOT NULL, -- Defect probability of the part (0.0 - 1.0)
    risk_level VARCHAR(20) NOT NULL,           -- 'NORMAL', 'WARNING', 'CRITICAL'
    top_root_cause VARCHAR(50),                -- Sensor with highest risk influence (from SHAP)
    root_cause_impact NUMERIC(6, 4)            -- Impact magnitude of the feature
);

CREATE INDEX IF NOT EXISTS idx_health_scores_machine_ts ON machine_health_scores(line_id, machine_id, timestamp DESC);
