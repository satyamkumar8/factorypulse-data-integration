-- 002_add_sensor_telemetry.sql
-- เพิ่มฟิลด์เซนเซอร์ทางกายภาพเพื่อรองรับโมเดล Industrial Data Science & Predictive Maintenance (NHK Spring focus)

ALTER TABLE machine_telemetry 
ADD COLUMN IF NOT EXISTS vibration_rms NUMERIC(8, 3) DEFAULT 1.25,
ADD COLUMN IF NOT EXISTS vibration_kurtosis NUMERIC(8, 3) DEFAULT 3.00,
ADD COLUMN IF NOT EXISTS bearing_temp_c NUMERIC(6, 2) DEFAULT 45.0,
ADD COLUMN IF NOT EXISTS press_force_kn NUMERIC(8, 2) DEFAULT 120.0,
ADD COLUMN IF NOT EXISTS motor_current_amp NUMERIC(6, 2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS hydraulic_pressure_bar NUMERIC(6, 2) DEFAULT 150.0;

-- ตารางเก็บบันทึกผลลัพธ์การประเมิน Machine Health Score และผลการพยากรณ์ความเสี่ยงแบบ Real-time
CREATE TABLE IF NOT EXISTS machine_health_scores (
    score_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    line_id VARCHAR(20) NOT NULL,
    machine_id VARCHAR(20) NOT NULL,
    event_id BIGINT,
    health_index NUMERIC(5, 2) NOT NULL,       -- สเกล 0 - 100%
    anomaly_score NUMERIC(6, 4) NOT NULL,      -- คะแนนความผิดปกติจาก Unsupervised Model
    defect_probability NUMERIC(5, 4) NOT NULL, -- ความน่าจะเป็นที่ชิ้นงานจะมี Defect (0.0 - 1.0)
    risk_level VARCHAR(20) NOT NULL,           -- 'NORMAL', 'WARNING', 'CRITICAL'
    top_root_cause VARCHAR(50),                -- เซนเซอร์ที่มีอิทธิพลต่อความเสี่ยงสูงสุด (จาก SHAP)
    root_cause_impact NUMERIC(6, 4)            -- ค่าความรุนแรงของฟีเจอร์ดังกล่าว
);

CREATE INDEX IF NOT EXISTS idx_health_scores_machine_ts ON machine_health_scores(line_id, machine_id, timestamp DESC);
