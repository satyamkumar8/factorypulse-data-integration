-- ============================================================================
-- FactoryPulse: Advanced Window Functions in Manufacturing Telemetry
-- Dialect: PostgreSQL 15+
-- Description: Analytical queries demonstrating ROW_NUMBER, RANK, DENSE_RANK,
--              LAG, LEAD, rolling moving averages, and cumulative window frames.
-- ============================================================================

-- 1. Telemetry Drift Detection using LAG() and LEAD()
-- Detects abnormal step-changes in bearing temperature and vibration between successive cycles
WITH cycle_transitions AS (
    SELECT 
        event_id,
        line_id,
        machine_id,
        timestamp,
        cycle_time_sec,
        bearing_temp_c,
        vibration_rms,
        -- Prior cycle metrics
        LAG(bearing_temp_c, 1) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC
        ) AS prev_temp_c,
        LAG(vibration_rms, 1) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC
        ) AS prev_vibration_rms,
        -- Next cycle cycle time
        LEAD(cycle_time_sec, 1) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC
        ) AS next_cycle_time_sec
    FROM machine_telemetry
)
SELECT 
    event_id,
    line_id,
    machine_id,
    timestamp,
    bearing_temp_c,
    prev_temp_c,
    ROUND(bearing_temp_c - prev_temp_c, 2) AS temp_delta_c,
    vibration_rms,
    prev_vibration_rms,
    ROUND(vibration_rms - prev_vibration_rms, 3) AS vibration_delta_rms,
    CASE 
        WHEN (bearing_temp_c - prev_temp_c) > 5.0 THEN 'THERMAL SPIKE ALERT'
        WHEN (vibration_rms - prev_vibration_rms) > 0.5 THEN 'VIBRATION SHOCK ALERT'
        ELSE 'STABLE'
    END AS telemetry_status
FROM cycle_transitions
WHERE prev_temp_c IS NOT NULL
ORDER BY timestamp DESC
LIMIT 50;


-- 2. Rolling Moving Average & Moving Standard Deviation (5-Cycle Smoothing)
-- Useful for filtering edge sensor noise and computing real-time process control limits (SPC)
SELECT 
    event_id,
    line_id,
    machine_id,
    timestamp,
    cycle_time_sec,
    -- 5-event moving average of cycle time
    ROUND(
        AVG(cycle_time_sec) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC 
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ), 2
    ) AS rolling_avg_cycle_sec,
    -- 5-event moving standard deviation
    ROUND(
        STDDEV(cycle_time_sec) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC 
            ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
        ), 2
    ) AS rolling_std_cycle_sec,
    -- 10-event rolling average vibration
    ROUND(
        AVG(vibration_rms) OVER (
            PARTITION BY line_id, machine_id 
            ORDER BY timestamp ASC 
            ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
        ), 3
    ) AS rolling_avg_vibration_rms
FROM machine_telemetry
ORDER BY line_id, machine_id, timestamp DESC
LIMIT 100;


-- 3. Top-Ranked Longest Unplanned Downtime Incidents per Machine using DENSE_RANK()
WITH downtime_events AS (
    SELECT 
        t.event_id,
        t.line_id,
        t.machine_id,
        t.timestamp,
        r.status_name,
        r.category,
        t.cycle_time_sec AS lost_duration_sec,
        DENSE_RANK() OVER (
            PARTITION BY t.line_id, t.machine_id 
            ORDER BY t.cycle_time_sec DESC
        ) AS rank_severity_within_machine,
        ROW_NUMBER() OVER (
            ORDER BY t.cycle_time_sec DESC
        ) AS global_rank_severity
    FROM machine_telemetry t
    JOIN downtime_reasons r ON t.status_code = r.status_code
    WHERE r.category = 'Unplanned Downtime'
)
SELECT 
    global_rank_severity,
    rank_severity_within_machine,
    line_id,
    machine_id,
    timestamp,
    status_name,
    lost_duration_sec,
    ROUND(lost_duration_sec / 60.0, 2) AS lost_duration_min
FROM downtime_events
WHERE rank_severity_within_machine <= 3
ORDER BY line_id, machine_id, rank_severity_within_machine ASC;


-- 4. Cumulative Shift Production & Defect Progression (Running Total)
SELECT 
    event_id,
    line_id,
    machine_id,
    timestamp,
    good_units,
    defect_units,
    -- Running total of produced units per machine for the day
    SUM(good_units + defect_units) OVER (
        PARTITION BY line_id, machine_id, DATE(timestamp)
        ORDER BY timestamp ASC 
        ROWS UNBOUNDED PRECEDING
    ) AS cumulative_produced_today,
    -- Running total of scrap/defects
    SUM(defect_units) OVER (
        PARTITION BY line_id, machine_id, DATE(timestamp)
        ORDER BY timestamp ASC 
        ROWS UNBOUNDED PRECEDING
    ) AS cumulative_defects_today
FROM machine_telemetry
ORDER BY line_id, machine_id, timestamp DESC
LIMIT 100;
