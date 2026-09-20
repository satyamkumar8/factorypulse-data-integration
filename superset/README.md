# FactoryPulse - Apache Superset BI & Dashboard Layer

This directory contains the Apache Superset configuration, automated container initialization script, and dataset definitions for the FactoryPulse Manufacturing Platform.

---

## 1. Architecture & Data Flow

```
PostgreSQL 15 (manufacturing_db)
  ├── hourly_production_summary (Data Mart)
  ├── machine_telemetry (Raw Sensor & Physics Events)
  ├── fact_operational_alerts (Alerting Table)
  └── dim_machine / dim_line / dim_downtime_reason
       │
       ▼ (SQLAlchemy / psycopg2 Connection)
Apache Superset (Port 8088)
  ├── Virtual Datasets & Semantic Metrics
  ├── Interactive OEE Executive Dashboards
  ├── Downtime Pareto 80/20 Charts
  └── Scheduled Operational Alert Reports
```

---

## 2. Key Datasets Registered in Superset

1. **`hourly_production_summary` (Data Mart)**
   - **Metrics**: Average OEE %, Availability %, Performance %, Quality %, Total Production, Total Defects.
   - **Dimensions**: `hour_bucket`, `line_id`, `machine_id`.
   - **Visualizations**: Time-series multi-line OEE trend, Machine comparison bar chart, Heatmap matrix.

2. **`downtime_pareto_analysis` (SQL Virtual Dataset)**
   - **SQL Query**: [sql/downtime_analysis.sql](file:///c:/Users/satya/Downloads/mfg-data-pipeline-main/mfg-data-pipeline-main/sql/downtime_analysis.sql)
   - **Visualizations**: Dual-axis bar & cumulative percentage curve (Pareto 80/20).

3. **`fact_operational_alerts` (Alerts Feed)**
   - **Metrics**: Alert count by severity (`CRITICAL`, `WARNING`, `INFO`), MTTR duration.
   - **Visualizations**: Gauge cards, real-time alert table, machine fault distribution pie chart.

---

## 3. Quick Start (via Docker Compose)

To launch Superset along with the entire platform:

```bash
docker compose up -d superset
```

- **URL**: `http://localhost:8088`
- **Username**: `admin`
- **Password**: `admin`
- **Pre-configured Database**: `FactoryPulse Manufacturing Warehouse` (`postgresql://mfg_user:mfg_password@postgres:5432/manufacturing_db`)
