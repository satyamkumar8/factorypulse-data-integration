-- ============================================================================
-- FactoryPulse: Advanced CTE Analysis (Common Table Expressions)
-- Dialect: PostgreSQL 15+
-- Description: Multi-stage CTE pipelines for shift-based yield analysis, scrap cost
--              estimation, and bottleneck machine identification.
-- ============================================================================

-- 1. Multi-Stage Shift Production & Scrap Cost Model
-- Stage 1: Assign timestamps to production shifts (Shift 1: Morning, Shift 2: Afternoon, Shift 3: Night)
-- Stage 2: Aggregate production, scrap, and downtime by Shift
-- Stage 3: Calculate financial impact based on estimated scrap unit cost ($15.50/unit) and downtime labor cost ($120/hr)
WITH shift_assigned_events AS (
    SELECT 
        event_id,
        line_id,
        machine_id,
        timestamp,
        cycle_time_sec,
        good_units,
        defect_units,
        status_code,
        CASE 
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 6 AND 13 THEN 'Shift 1 (06:00 - 14:00)'
            WHEN EXTRACT(HOUR FROM timestamp) BETWEEN 14 AND 21 THEN 'Shift 2 (14:00 - 22:00)'
            ELSE 'Shift 3 (22:00 - 06:00)'
        END AS work_shift,
        DATE(timestamp) AS production_date
    FROM machine_telemetry
),
shift_aggregates AS (
    SELECT 
        production_date,
        work_shift,
        line_id,
        COUNT(event_id) AS total_cycles,
        SUM(good_units) AS total_good,
        SUM(defect_units) AS total_scrap,
        SUM(good_units + defect_units) AS total_produced,
        SUM(CASE WHEN status_code IN (3, 4) THEN cycle_time_sec ELSE 0 END) AS unplanned_downtime_sec
    FROM shift_assigned_events
    GROUP BY production_date, work_shift, line_id
),
shift_financial_impact AS (
    SELECT 
        production_date,
        work_shift,
        line_id,
        total_produced,
        total_good,
        total_scrap,
        ROUND((total_scrap::NUMERIC / NULLIF(total_produced, 0)) * 100.0, 2) AS scrap_rate_pct,
        ROUND(unplanned_downtime_sec / 60.0, 2) AS downtime_minutes,
        -- Financial modeling: $15.50 material loss per defect unit
        ROUND(total_scrap * 15.50, 2) AS scrap_cost_usd,
        -- Financial modeling: $120/hr line stoppage overhead cost
        ROUND((unplanned_downtime_sec / 3600.0) * 120.0, 2) AS downtime_loss_usd
    FROM shift_aggregates
)
SELECT 
    production_date,
    work_shift,
    line_id,
    total_produced,
    total_good,
    total_scrap,
    scrap_rate_pct,
    downtime_minutes,
    scrap_cost_usd,
    downtime_loss_usd,
    (scrap_cost_usd + downtime_loss_usd) AS total_operational_loss_usd
FROM shift_financial_impact
ORDER BY production_date DESC, work_shift, total_operational_loss_usd DESC;


-- 2. Line Bottleneck Identification via Multi-Stage Stage Duration CTE
-- Compares cycle time deltas between upstream and downstream machines on the same line
WITH machine_cycle_stats AS (
    SELECT 
        line_id,
        machine_id,
        COUNT(*) AS cycle_count,
        ROUND(AVG(cycle_time_sec), 2) AS avg_cycle_time_sec,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cycle_time_sec)::NUMERIC, 2) AS median_cycle_sec,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cycle_time_sec)::NUMERIC, 2) AS p95_cycle_sec,
        ROUND(STDDEV(cycle_time_sec), 2) AS cycle_variance
    FROM machine_telemetry
    WHERE status_code = 1 -- Normal running only
    GROUP BY line_id, machine_id
),
line_takt_comparison AS (
    SELECT 
        line_id,
        machine_id,
        avg_cycle_time_sec,
        median_cycle_sec,
        p95_cycle_sec,
        cycle_variance,
        MAX(avg_cycle_time_sec) OVER (PARTITION BY line_id) AS line_slowest_cycle_sec,
        AVG(avg_cycle_time_sec) OVER (PARTITION BY line_id) AS line_avg_cycle_sec
    FROM machine_cycle_stats
)
SELECT 
    line_id,
    machine_id,
    avg_cycle_time_sec,
    median_cycle_sec,
    p95_cycle_sec,
    cycle_variance,
    line_slowest_cycle_sec,
    ROUND(avg_cycle_time_sec - line_avg_cycle_sec, 2) AS delta_from_line_avg,
    CASE 
        WHEN avg_cycle_time_sec = line_slowest_cycle_sec THEN 'CRITICAL BOTTLENECK'
        WHEN avg_cycle_time_sec > line_avg_cycle_sec THEN 'POTENTIAL PACER'
        ELSE 'OPTIMAL THROUGHPUT'
    END AS bottleneck_status
FROM line_takt_comparison
ORDER BY line_id, avg_cycle_time_sec DESC;
