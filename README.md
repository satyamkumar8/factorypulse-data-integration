# FactoryPulse

## Manufacturing Data Integration & Operations Intelligence Platform

An end-to-end manufacturing data integration platform that ingests machine telemetry and production data, processes it through Python ETL pipelines, stores analytical data in PostgreSQL, and delivers operational insights through SQL analytics, Apache Superset dashboards, and operational alerts.

---

## Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    1. MANUFACTURING DATA SOURCES                                   |
|   simulator.py / generate_bulk_data.py (Multi-axis CNCs, 6-Axis Robotic Arms, Physical Sensors)    |
|   - Physical telemetry generation: Vibration RMS, Bearing Temp, Press Force, Cycle Times, Yields  |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    2. PYTHON ETL PIPELINE                                          |
|   etl/extract.py  -->  etl/validate.py  -->  etl/transform.py  -->  etl/load.py                    |
|   ├── Data Quality Gates (Physical boundary checks, NULL dimension filters, schema validation)     |
|   ├── Hourly Availability, Performance, Quality, and OEE computation engine                        |
|   └── Idempotent upsert (ON CONFLICT DO UPDATE) + Audit logging (pipeline_execution_logs)          |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                3. POSTGRESQL DATA WAREHOUSE                                        |
|   [Conformed Dimensions]           [Analytical Data Mart]            [Operational Facts & Alerts]  |
|   dim_machine, dim_line,           hourly_production_summary         machine_telemetry             |
|   dim_date, dim_downtime_reason    (Hourly OEE metrics)              fact_operational_alerts       |
|   (B-Tree Indexes, Composite Line/Machine/Timestamp Indexes, Partial Fault Indexes)                |
+-------------------+-----------------------------+-----------------------------+--------------------+
                    |                             |                             |
                    v                             v                             v
+---------------------------------+ +---------------------------+ +----------------------------------+
|   4. ADVANCED SQL ANALYTICS     | |   5. BI & DASHBOARDS      | |   6. OPERATIONAL ALERT ENGINE    |
|   sql/kpi_analysis.sql          | |   Apache Superset (:8088) | |   backend/alerts.py              |
|   sql/cte_analysis.sql          | |   - OEE Executive Suite   | |   - Defect Rate > 5% Alert       |
|   sql/window_functions.sql      | |   - Downtime Pareto 80/20 | |   - Prolonged Downtime > 30s     |
|   sql/downtime_analysis.sql     | |   - Telemetry Envelopes   | |   - Thermal (>65°C) & Vib Spike  |
|   sql/query_optimization.sql    | |   Streamlit UI (:8501)    | |   - Consecutive Scrap Warnings   |
+-------------------+-------------+ +-------------+-------------+ +------------------+---------------+
                    |                             |                                  |
                    +-----------------------------+----------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                 7. SERVING & APPLICATION LAYER                                     |
|   FastAPI Backend (:8000)                                                                          |
|   ├── Connection pooling via SQLAlchemy QueuePool                                                  |
|   ├── Asynchronous WebSocket broadcaster for real-time shopfloor telemetry updates                 |
|   └── REST API endpoints for KPIs, Data Mart, Recent Telemetry, Pipeline Triggers & Alerts         |
|                                                                                                    |
|   React 18 + TypeScript Operations Dashboard (:3000)                                               |
|   ├── Shopfloor Fleet Status Matrix with live physical readouts                                    |
|   ├── Interactive OEE Multi-Line & Heatmap Analytics                                               |
|   └── WebSocket telemetry feed & operational alert notification banner                             |
+----------------------------------------------------------------------------------------------------+
```

---

## Key Capabilities

- **Modular Python ETL Pipeline**: Clear separation of concerns (`extract`, `validate`, `transform`, `load`) with automated data quality gates and execution audit logging.
- **PostgreSQL Analytical Data Mart**: Relational warehouse aggregating raw sensor telemetry into hourly operational KPIs.
- **Dimensional / Star-Schema Modeling**: Conformed dimensions (`dim_machine`, `dim_line`, `dim_date`, `dim_downtime_reason`) and transactional facts.
- **Advanced SQL Analytics**: Comprehensive SQL portfolio implementing Multi-Stage CTEs, Window Functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, moving averages), and query optimization strategies.
- **Manufacturing OEE Analytics**: End-to-end computation of Overall Equipment Effectiveness and its three pillars (Availability, Performance, Quality).
- **MTBF / MTTR Reliability Analysis**: Mean Time Between Failures, Mean Time To Repair, and Pareto 80/20 downtime distribution models.
- **Apache Superset BI Integration**: Containerized Apache Superset configuration with automated PostgreSQL datasource registration and analytical dataset definitions.
- **Operational Alerting**: Rule-based backend evaluation detecting thermal anomalies, vibration spikes, prolonged downtime, and scrap spikes.
- **FastAPI Backend**: Asynchronous ASGI backend featuring connection pooling, REST endpoints, and WebSocket telemetry broadcasting.
- **React / TypeScript Operations Dashboard**: Shopfloor monitoring interface displaying fleet health, sensor telemetry, and interactive charts (production build validated).
- **Docker Compose Deployment**: Declarative multi-container configuration orchestrating PostgreSQL, Backend, Frontend, Superset, and Streamlit.
- **High-Volume Telemetry Generation**: Chunked bulk generation supporting large-scale datasets (1M+ records) with memory-efficient database insertion.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **ETL / Data Processing** | Python 3.11+ | Modular pipeline execution and validation gates |
| **Database** | PostgreSQL 15 | Star schema warehouse, Data Mart, and indexing |
| **Analytics** | Modern SQL | CTEs, Window Functions, Pareto 80/20, MTBF/MTTR |
| **BI & Dashboards** | Apache Superset 3.1.0 | Visual dashboards, virtual datasets, reporting |
| **Backend** | FastAPI | REST APIs and asynchronous WebSocket streaming |
| **Frontend** | React 18 + TypeScript | Shopfloor fleet monitoring interface (Vite + TailwindCSS) |
| **Data Processing** | Pandas & SQLAlchemy | Data transformation and connection pool management |
| **Containerization** | Docker & Docker Compose | Multi-container service orchestration |
| **Testing** | Python unittest | Automated test suite for ETL and alerting logic |

---

## Data Pipeline

The ETL pipeline is structured in the [`etl/`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/etl/) package:

```
etl/
├── __init__.py         # Package entrypoint
├── extract.py          # Extracts raw telemetry joined with downtime taxonomy
├── validate.py         # Data Quality Gate (boundary checks, null filters, schema validation)
├── transform.py        # Hourly OEE component calculations & time-binning
├── load.py             # Idempotent upsert into Data Mart & audit logging
└── pipeline.py         # Master pipeline orchestrator & CLI runner
```

1. **Extract ([`etl/extract.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/etl/extract.py))**: Extracts raw telemetry events and downtime master records from PostgreSQL.
2. **Validate ([`etl/validate.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/etl/validate.py))**: Applies data quality gates that discard corrupt records (rejects $t_{\text{cycle}} \le 0$, null identifiers, negative production units, and out-of-range sensor readings).
3. **Transform ([`etl/transform.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/etl/transform.py))**: Computes hourly Availability %, Performance %, Quality %, and OEE % using standard industrial manufacturing formulas.
4. **Load ([`etl/load.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/etl/load.py))**: Performs idempotent upsert (`INSERT ... ON CONFLICT (hour_bucket, line_id, machine_id) DO UPDATE`) into `hourly_production_summary` and records start time, end time, status, and processed row count in `pipeline_execution_logs`.

---

## Data Model

The platform implements a dimensional star schema defined in [`database/schema_dimensional.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/database/schema_dimensional.sql) and [`init_db.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/init_db.sql):

### Conformed Dimensions
- **`dim_line`**: `line_id` (PK), `line_name`, `plant_location`, `target_oee_pct`.
- **`dim_machine`**: `machine_id` (PK), `machine_name`, `machine_type`, `line_id` (FK), `ideal_cycle_sec`, `power_rating_kw`.
- **`dim_date`**: `date_key` (PK), `full_date`, `day_of_week`, `day_name`, `month`, `quarter`, `year`, `is_weekend`.
- **`dim_downtime_reason`**: `status_code` (PK), `status_name`, `category`, `severity_level`.

### Fact & Data Mart Tables
- **`machine_telemetry`**: Raw physical telemetry facts (`event_id`, `line_id`, `machine_id`, `timestamp`, `cycle_time_sec`, `good_units`, `defect_units`, `vibration_rms`, `bearing_temp_c`, `press_force_kn`, `motor_current_amp`).
- **`hourly_production_summary`**: Analytical OEE Data Mart (`summary_id`, `hour_bucket`, `line_id`, `machine_id`, `total_cycles`, `total_good_units`, `total_defect_units`, `operating_time_sec`, `unplanned_downtime_sec`, `availability_pct`, `performance_pct`, `quality_pct`, `oee_pct`).
- **`fact_operational_alerts`**: Operational alert logs (`alert_id`, `timestamp`, `line_id`, `machine_id`, `alert_type`, `severity`, `threshold_value`, `actual_value`, `message`, `is_acknowledged`).
- **`pipeline_execution_logs`**: ETL audit logs (`log_id`, `pipeline_name`, `start_time`, `end_time`, `status`, `rows_processed`, `error_message`).

---

## SQL Analytics

All SQL queries are verified and organized in the [`sql/`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/) directory:

| Query Script | SQL Techniques | Analytical Purpose |
| :--- | :--- | :--- |
| **[`sql/kpi_analysis.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/kpi_analysis.sql)** | Aggregations, `JOIN`, `NULLIF`, `ROUND`, `CASE` | Line yield, scrap rate, and machine-level OEE classifications. |
| **[`sql/cte_analysis.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/cte_analysis.sql)** | Multi-stage CTEs, variance analysis, financial loss modeling | Shift-based scrap cost analysis and line bottleneck identification. |
| **[`sql/window_functions.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/window_functions.sql)** | `LAG()`, `LEAD()`, `DENSE_RANK()`, `AVG(...) OVER (ROWS BETWEEN ...)` | Cycle-to-cycle thermal drift, rolling moving averages, severity rankings. |
| **[`sql/downtime_analysis.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/downtime_analysis.sql)** | Cumulative sums, `SUM() OVER ()`, Pareto 80/20 rule | Identifies the "Vital Few" downtime causes; calculates MTBF and MTTR. |
| **[`sql/query_optimization.sql`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/query_optimization.sql)** | `EXPLAIN (ANALYZE, BUFFERS)`, Partial Indexes, Materialized Views | Execution plan analysis, composite B-Trees, and partial indexing. |

---

## Business & Manufacturing KPIs

FactoryPulse calculates standard industrial metrics:

$$\text{Availability (A)} = \frac{\text{Operating Time}}{\text{Operating Time} + \text{Unplanned Downtime}} \times 100$$

$$\text{Performance (P)} = \min\left( \frac{\text{Ideal Cycle Time} \times \text{Total Produced Units}}{\text{Operating Time}} \times 100, \, 100\% \right)$$

$$\text{Quality (Q)} = \frac{\text{Good Units}}{\text{Total Produced Units}} \times 100$$

$$\text{Overall Equipment Effectiveness (OEE)} = \frac{\text{Availability} \times \text{Performance} \times \text{Quality}}{10,000}$$

$$\text{Mean Time Between Failures (MTBF)} = \frac{\text{Total Operating Hours}}{\text{Number of Unplanned Failures}}$$

$$\text{Mean Time To Repair (MTTR)} = \frac{\text{Total Repair Minutes}}{\text{Number of Unplanned Failures}}$$

---

## Apache Superset

Containerized Apache Superset configuration with automated PostgreSQL datasource registration:

- **Configuration File ([`superset/superset_config.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/superset/superset_config.py))**: Configures alerting, dashboard cross-filters, and CORS.
- **Bootstrap Script ([`superset/superset-init.sh`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/superset/superset-init.sh))**: Automatically upgrades database schema, creates the default admin user, and registers the PostgreSQL warehouse connection.
- **Pre-configured Datasets**: Virtual datasets prepared for Hourly OEE, Downtime Pareto 80/20, and Machine Telemetry.

---

## Operational Alerts

The alerting engine in [`backend/alerts.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/backend/alerts.py) evaluates telemetry against configurable rules:

- **Thermal Anomaly**: Bearing temperature $> 65.0^\circ\text{C}$ (or $> 75.0^\circ\text{C}$ critical).
- **Vibration Spike**: Vibration RMS $> 2.20\text{ mm/s}^2$.
- **Prolonged Downtime**: Unplanned stoppage duration $> 30.0\text{s}$.
- **High Scrap Rate**: Defect rate $> 5.0\%$ or $\ge 2$ consecutive defect events.

Alerts are recorded in `fact_operational_alerts` and exposed via REST API endpoints (`/api/alerts`, `/api/alerts/evaluate`, `/api/alerts/{id}/acknowledge`).

---

## FastAPI Backend

The backend service in [`backend/`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/backend/) provides:

- **REST Endpoints**: `/api/machines/status`, `/api/telemetry/recent`, `/api/oee/hourly`, `/api/kpi/summary`, `/api/alerts`, `/api/logs`, `/api/etl/trigger`.
- **Database Connection Pooling**: Implemented using SQLAlchemy `QueuePool` with health check pre-pings (`backend/database.py`).
- **Asynchronous WebSocket Broadcaster**: Background task broadcasting live telemetry snapshots to connected frontend clients (`/api/ws/telemetry`).

---

## React Frontend

The shopfloor operations dashboard in [`frontend/`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/frontend/) built with React 18, TypeScript, Vite, and TailwindCSS features:

- **Fleet Status Matrix**: Live physical gauges (temperature, vibration, motor current), cycle timers, and machine status badges.
- **OEE Trend Analytics**: Time-series charts and line comparisons rendered via Recharts.
- **Real-Time Data Feed**: Live incoming telemetry updates and operational alert notifications.
- **Production Build Validated**: TypeScript compilation and Vite bundling (`tsc && vite build`) verified.

---

## Large Dataset Support

Implemented chunked bulk data generation and insertion using `psycopg2.extras.execute_values` in [`generate_bulk_data.py`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/generate_bulk_data.py) for high-volume manufacturing telemetry datasets (supports 1,000,000+ records).

---

## Docker

Multi-service container orchestration defined in [`docker-compose.yml`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/docker-compose.yml):

- **`postgres`**: PostgreSQL 15 database initialized with schema and dimensional seed data.
- **`backend`**: FastAPI ASGI server on port `8000`.
- **`frontend`**: React 18 production Nginx container on port `3000`.
- **`superset`**: Apache Superset BI server on port `8088`.
- **`legacy_dashboard`**: Streamlit monitoring interface on port `8501`.

*Docker Compose configuration has been validated via `docker compose config`.*

---

## Testing

Automated test suites in [`tests/`](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/tests/) covering Data Quality Gate filtering, OEE transformation mathematics, operational alert rule evaluation, and full ETL execution:

```bash
python -m unittest discover -s tests -v
```

**Verified Test Results:**
```
test_data_quality_gates (test_etl_pipeline.TestFactoryPulseETL) ... ok
test_oee_transform_calculation (test_etl_pipeline.TestFactoryPulseETL) ... ok
test_alerts_evaluation_real_execution (test_real_execution.TestRealExecution) ... ok
test_full_etl_execution_and_load (test_real_execution.TestRealExecution) ... ok
----------------------------------------------------------------------
Ran 4 tests in 0.061s
OK
```

---

## Project Structure

```
factorypulse/
├── README.md                     # Architecture & operations documentation
├── docker-compose.yml            # Multi-service Docker Compose configuration
├── init_db.sql                   # Master database schema & dimensions
├── requirements.txt              # Core Python dependencies
├── generate_bulk_data.py         # Chunked bulk telemetry generator
├── simulator.py                  # Live streaming physics sensor simulator
├── batch_etl.py                  # Batch ETL CLI runner
├── dashboard.py                  # Streamlit monitor
│
├── etl/                          # Modular Python ETL Pipeline
│   ├── __init__.py               # Package interface
│   ├── extract.py                # Database telemetry extractor
│   ├── validate.py               # Data quality gates (boundary & null checks)
│   ├── transform.py              # OEE & hourly aggregations
│   ├── load.py                   # Data Mart upsert & audit logger
│   └── pipeline.py               # Master pipeline coordinator
│
├── sql/                          # Advanced SQL Analytics Portfolio
│   ├── kpi_analysis.sql          # Line/Machine KPIs & OEE breakdowns
│   ├── cte_analysis.sql          # Multi-stage shift scrap cost & bottlenecks
│   ├── window_functions.sql      # LAG, LEAD, moving averages, DENSE_RANK
│   ├── downtime_analysis.sql     # Pareto 80/20 downtime, MTBF & MTTR
│   └── query_optimization.sql    # Indexing benchmarks & EXPLAIN ANALYZE
│
├── database/                     # Dimensional Modeling & Warehousing
│   ├── schema_dimensional.sql    # Star schema (Conformed Dims & Facts)
│   ├── create_datamart.sql       # Hourly production summary schema
│   └── create_logs_table.sql     # Execution audit logs schema
│
├── superset/                     # Apache Superset BI Integration
│   ├── Dockerfile                # Superset container specification
│   ├── superset_config.py        # Superset security & features configuration
│   ├── superset-init.sh          # Automated initialization script
│   └── README.md                 # Superset BI documentation
│
├── backend/                      # FastAPI Backend Service
│   ├── main.py                   # REST endpoints & WebSocket broadcaster
│   ├── database.py               # Connection pool & database operations
│   ├── alerts.py                 # Operational alerting rules & evaluation
│   ├── schemas.py                # Pydantic data validation models
│   └── Dockerfile                # Backend container specification
│
├── frontend/                     # React 18 TypeScript Web Application
│   ├── src/                      # App components, pages, and i18n
│   ├── package.json              # Frontend npm dependencies
│   └── Dockerfile                # Frontend Nginx container specification
│
└── tests/                        # Automated Test Suite
    ├── test_etl_pipeline.py      # Data Quality Gate & OEE calculation tests
    └── test_real_execution.py    # Real execution & alert evaluation tests
```

---

## Getting Started

### Local Development Setup

```bash
# 1. Install Python dependencies
pip install -r requirements.txt
pip install -r backend/requirements.txt

# 2. Run Automated Verification Tests
python -m unittest discover -s tests -v

# 3. Initialize PostgreSQL Database (when Postgres is running locally on port 5432)
psql -U mfg_user -d manufacturing_db -f init_db.sql

# 4. Generate Telemetry Records
python generate_bulk_data.py --rows 10000

# 5. Run the Batch ETL Pipeline
python batch_etl.py

# 6. Start FastAPI Backend API
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 7. Start React Frontend
cd frontend
npm install
npm run dev
```

### Docker Compose Deployment

```bash
# Start all containerized services
docker compose up -d

# Web Endpoints:
# -> React Frontend:     http://localhost:3000
# -> Apache Superset:    http://localhost:8088 (User: admin / Pass: admin)
# -> FastAPI Swagger UI: http://localhost:8000/docs
# -> Streamlit Monitor:  http://localhost:8501
```

---

## Golgix-Relevant Skills Demonstrated

- **SQL**: Window functions (`LAG`, `LEAD`, `DENSE_RANK`), multi-stage CTEs, Pareto 80/20 analysis, `EXPLAIN` query optimization.
- **Python**: Modular ETL architecture, Pandas transformations, Pydantic validation, alerting rules.
- **ETL & Data Integration**: Extract, Validate, Transform, Load design with data quality gates and audit logging.
- **PostgreSQL & Data Modeling**: Dimensional Star Schema (`dim_machine`, `dim_line`, `dim_date`, `dim_downtime_reason`) and indexed analytical facts.
- **Apache Superset**: Containerized BI integration with automated datasource bootstrapping.
- **Operational Alerting**: Real-time evaluation of machine health and downtime thresholds.
- **React & Frontend**: Component-based TypeScript UI with live WebSocket telemetry rendering.
- **FastAPI**: Asynchronous REST APIs, connection pooling, and WebSocket broadcasting.
- **Docker**: Declarative multi-container compose architecture.
- **Manufacturing Analytics**: Overall Equipment Effectiveness (OEE), Availability, Performance, Quality, MTBF, MTTR.

---

## Attribution

This project builds upon an open-source manufacturing data engineering foundation and has been substantially adapted and extended for the FactoryPulse implementation.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.