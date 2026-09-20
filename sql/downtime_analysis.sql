-- ============================================================================
-- FactoryPulse: Downtime, Pareto 80/20, MTBF & MTTR Reliability Analysis
-- Dialect: PostgreSQL 15+
-- Description: In-depth industrial reliability queries for Mean Time Between Failures,
--              Mean Time To Repair, and Pareto root-cause downtime breakdown.
-- ============================================================================

-- 1. Downtime Pareto Analysis (80/20 Rule for Lost Time)
-- Calculates absolute lost seconds, percentage contribution, and cumulative percentage
WITH reason_lost_time AS (
    SELECT 
        r.status_code,
        r.status_name,
        r.category,
        COUNT(t.event_id) AS incident_count,
        SUM(t.cycle_time_sec) AS total_lost_sec
    FROM machine_telemetry t
    JOIN downtime_reasons r ON t.status_code = r.status_code
    WHERE t.status_code != 1 -- Non-normal operating states
    GROUP BY r.status_code, r.status_name, r.category
),
pareto_calc AS (
    SELECT 
        status_name,
        category,
        incident_count,
        total_lost_sec,
        ROUND(total_lost_sec / 3600.0, 2) AS lost_hours,
        ROUND((total_lost_sec / SUM(total_lost_sec) OVER ()) * 100.0, 2) AS lost_share_pct,
        ROUND(
            (SUM(total_lost_sec) OVER (ORDER BY total_lost_sec DESC ROWS UNBOUNDED PRECEDING) 
             / SUM(total_lost_sec) OVER ()) * 100.0, 
            2
        ) AS cumulative_share_pct
    FROM reason_lost_time
)
SELECT 
    status_name,
    category,
    incident_count,
    lost_hours,
    lost_share_pct,
    cumulative_share_pct,
    CASE 
        WHEN cumulative_share_pct <= 80.0 THEN 'Vital Few (Top 80% Pareto Cause)'
        ELSE 'Trivial Many'
    END AS pareto_classification
FROM pareto_calc
ORDER BY total_lost_sec DESC;


-- 2. MTBF (Mean Time Between Failures) and MTTR (Mean Time To Repair) per Machine
WITH machine_operating_summary AS (
    SELECT 
        line_id,
        machine_id,
        -- Total uptime in hours (normal status_code = 1)
        SUM(CASE WHEN status_code = 1 THEN cycle_time_sec ELSE 0 END) / 3600.0 AS total_uptime_hours,
        -- Total repair/unplanned downtime in hours
        SUM(CASE WHEN r.category = 'Unplanned Downtime' THEN cycle_time_sec ELSE 0 END) / 3600.0 AS total_repair_hours,
        -- Number of breakdown incidents
        COUNT(CASE WHEN r.category = 'Unplanned Downtime' THEN 1 ELSE NULL END) AS failure_count
    FROM machine_telemetry t
    JOIN downtime_reasons r ON t.status_code = r.status_code
    GROUP BY line_id, machine_id
)
SELECT 
    line_id,
    machine_id,
    ROUND(total_uptime_hours, 2) AS total_uptime_hours,
    ROUND(total_repair_hours, 2) AS total_repair_hours,
    failure_count,
    -- MTBF = Total Operating Hours / Number of Failures
    ROUND(
        total_uptime_hours / NULLIF(failure_count, 0), 
        2
    ) AS mtbf_hours,
    -- MTTR = Total Repair Hours / Number of Failures (in Minutes)
    ROUND(
        (total_repair_hours * 60.0) / NULLIF(failure_count, 0), 
        2
    ) AS mttr_minutes,
    -- Inherent Availability (Ai) = MTBF / (MTBF + MTTR_in_hours)
    ROUND(
        (total_uptime_hours / NULLIF(failure_count, 0)) / 
        NULLIF((total_uptime_hours / NULLIF(failure_count, 0)) + (total_repair_hours / NULLIF(failure_count, 0)), 0) * 100.0,
        2
    ) AS inherent_availability_pct
FROM machine_operating_summary
ORDER BY line_id, machine_id;
