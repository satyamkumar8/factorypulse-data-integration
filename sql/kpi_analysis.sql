-- ============================================================================
-- FactoryPulse: Manufacturing KPI & OEE Analysis
-- Dialect: PostgreSQL 15+
-- Description: Core manufacturing metrics including Production Volume, Defect Rate,
--              Availability, Performance, Quality, and Overall Equipment Effectiveness (OEE).
-- ============================================================================

-- 1. Line-Level Summary: Production Volume & Defect Rate
SELECT 
    t.line_id,
    COUNT(t.event_id) AS total_cycles,
    SUM(t.good_units) AS total_good_units,
    SUM(t.defect_units) AS total_defect_units,
    SUM(t.good_units + t.defect_units) AS total_produced_units,
    ROUND(
        (SUM(t.defect_units)::NUMERIC / NULLIF(SUM(t.good_units + t.defect_units), 0)) * 100.0, 
        2
    ) AS defect_rate_pct,
    ROUND(
        (SUM(t.good_units)::NUMERIC / NULLIF(SUM(t.good_units + t.defect_units), 0)) * 100.0, 
        2
    ) AS yield_pct
FROM machine_telemetry t
GROUP BY t.line_id
ORDER BY total_produced_units DESC;


-- 2. Comprehensive Machine-Level OEE Calculation (The 3 Pillars of OEE)
-- Availability = Operating Time / (Operating Time + Unplanned Downtime)
-- Performance  = (Ideal Cycle Time * Total Produced) / Operating Time
-- Quality      = Good Units / Total Produced Units
-- Overall OEE  = (Availability * Performance * Quality) / 10000
WITH machine_operating_metrics AS (
    SELECT 
        t.line_id,
        t.machine_id,
        COUNT(t.event_id) AS total_cycles,
        SUM(t.good_units) AS good_units,
        SUM(t.defect_units) AS defect_units,
        SUM(t.good_units + t.defect_units) AS total_produced,
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
    GROUP BY t.line_id, t.machine_id
),
oee_components AS (
    SELECT 
        line_id,
        machine_id,
        total_produced,
        good_units,
        defect_units,
        operating_time_sec,
        unplanned_downtime_sec,
        -- Availability Percentage
        ROUND(
            (operating_time_sec / NULLIF(operating_time_sec + unplanned_downtime_sec, 0)) * 100.0, 
            2
        ) AS availability_pct,
        -- Performance Percentage (Capped at 100% for realistic bounds)
        ROUND(
            LEAST(((ideal_cycle_time_sec * total_produced) / NULLIF(operating_time_sec, 0)) * 100.0, 100.0), 
            2
        ) AS performance_pct,
        -- Quality Percentage
        ROUND(
            (good_units::NUMERIC / NULLIF(total_produced, 0)) * 100.0, 
            2
        ) AS quality_pct
    FROM machine_operating_metrics
)
SELECT 
    line_id,
    machine_id,
    total_produced,
    good_units,
    defect_units,
    ROUND(operating_time_sec / 3600.0, 2) AS operating_hours,
    ROUND(unplanned_downtime_sec / 3600.0, 2) AS downtime_hours,
    COALESCE(availability_pct, 0.0) AS availability_pct,
    COALESCE(performance_pct, 0.0) AS performance_pct,
    COALESCE(quality_pct, 0.0) AS quality_pct,
    ROUND(
        (COALESCE(availability_pct, 0.0) * COALESCE(performance_pct, 0.0) * COALESCE(quality_pct, 0.0)) / 10000.0, 
        2
    ) AS oee_pct,
    CASE 
        WHEN ((availability_pct * performance_pct * quality_pct) / 10000.0) >= 85.0 THEN 'World Class (>=85%)'
        WHEN ((availability_pct * performance_pct * quality_pct) / 10000.0) >= 70.0 THEN 'Typical / Good (70-84%)'
        ELSE 'Needs Improvement (<70%)'
    END AS oee_classification
FROM oee_components
ORDER BY oee_pct DESC;


-- 3. Telemetry Physical Operating Envelopes (Sensors Health Check)
SELECT 
    line_id,
    machine_id,
    ROUND(AVG(vibration_rms), 3) AS avg_vibration_rms,
    ROUND(MAX(vibration_rms), 3) AS peak_vibration_rms,
    ROUND(AVG(bearing_temp_c), 2) AS avg_bearing_temp_c,
    ROUND(MAX(bearing_temp_c), 2) AS peak_bearing_temp_c,
    ROUND(AVG(motor_current_amp), 2) AS avg_motor_current_amp,
    ROUND(AVG(press_force_kn), 2) AS avg_press_force_kn
FROM machine_telemetry
WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY line_id, machine_id
ORDER BY peak_vibration_rms DESC;
