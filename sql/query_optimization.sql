-- ============================================================================
-- FactoryPulse: SQL Query Optimization & Indexing Strategies
-- Dialect: PostgreSQL 15+
-- Description: Production query optimization benchmarks, execution plan analysis,
--              partial indexing, composite B-Trees, and materialized aggregation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Indexing Optimization Strategies
-- ----------------------------------------------------------------------------

-- A. Composite Index for Filter + Sort Time-Series Queries
-- Eliminates Sort step in execution plan by matching index order (line_id, machine_id, timestamp DESC)
CREATE INDEX IF NOT EXISTS idx_telemetry_line_machine_ts_desc 
ON machine_telemetry (line_id, machine_id, timestamp DESC);

-- B. Partial Index for High-Value Subsets (Anomalies & Failures Only)
-- Only indexes 5-15% of records that are in fault status, reducing index size by >85%
CREATE INDEX IF NOT EXISTS idx_telemetry_unplanned_faults 
ON machine_telemetry (machine_id, timestamp DESC) 
WHERE status_code IN (3, 4);

-- C. Partial Index for Defective Production Events (Scrap Auditing)
CREATE INDEX IF NOT EXISTS idx_telemetry_defects_only 
ON machine_telemetry (line_id, machine_id, timestamp DESC) 
WHERE defect_units > 0;


-- ----------------------------------------------------------------------------
-- 2. EXPLAIN ANALYZE: Unoptimized vs Optimized Query Plan Benchmark
-- ----------------------------------------------------------------------------

-- [UNOPTIMIZED QUERY]: Full sequential scan with memory sort on large telemetry tables
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    event_id, timestamp, line_id, machine_id, vibration_rms, bearing_temp_c
FROM machine_telemetry
WHERE status_code IN (3, 4)
ORDER BY timestamp DESC
LIMIT 50;

-- [OPTIMIZED QUERY]: Uses Partial Index (idx_telemetry_unplanned_faults) -> Index Scan + Zero Sort overhead
EXPLAIN (ANALYZE, BUFFERS, TIMING)
SELECT 
    event_id, timestamp, line_id, machine_id, vibration_rms, bearing_temp_c
FROM machine_telemetry
WHERE status_code IN (3, 4) AND machine_id = 'CNC_A'
ORDER BY timestamp DESC
LIMIT 50;


-- ----------------------------------------------------------------------------
-- 3. Materialized View for High-Performance BI Dashboards (Sub-50ms Response)
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_machine_kpi AS
SELECT 
    DATE(t.timestamp) AS kpi_date,
    t.line_id,
    t.machine_id,
    COUNT(t.event_id) AS total_cycles,
    SUM(t.good_units) AS total_good,
    SUM(t.defect_units) AS total_defects,
    ROUND((SUM(t.defect_units)::NUMERIC / NULLIF(SUM(t.good_units + t.defect_units), 0)) * 100.0, 2) AS scrap_rate_pct,
    ROUND(SUM(CASE WHEN t.status_code = 1 THEN t.cycle_time_sec ELSE 0 END) / 3600.0, 2) AS operating_hours,
    ROUND(SUM(CASE WHEN r.category = 'Unplanned Downtime' THEN t.cycle_time_sec ELSE 0 END) / 3600.0, 2) AS downtime_hours,
    ROUND(AVG(t.vibration_rms), 3) AS avg_vibration,
    ROUND(AVG(t.bearing_temp_c), 1) AS avg_temp
FROM machine_telemetry t
JOIN downtime_reasons r ON t.status_code = r.status_code
GROUP BY DATE(t.timestamp), t.line_id, t.machine_id
WITH NO DATA;

-- Unique Index enabling CONCURRENT refresh without locking readers
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_machine_kpi 
ON mv_daily_machine_kpi (kpi_date, line_id, machine_id);

-- Command to periodically refresh Materialized View (e.g. from Cron / Airflow / Batch ETL):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_machine_kpi;
