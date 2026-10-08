import os
import streamlit as st
import pandas as pd
import plotly.express as px
from sqlalchemy import create_engine
from streamlit_autorefresh import st_autorefresh

st.set_page_config(page_title="Industrial Real-Time & OEE Monitor", layout="wide")

# Auto-refresh display every 3 seconds
count = st_autorefresh(interval=3000, limit=None, key="live_refresh_counter")

DEFAULT_URI = "postgresql+psycopg2://mfg_user:mfg_password@localhost:5432/manufacturing_db"
DB_URI = os.getenv("DB_URI", DEFAULT_URI)
engine = create_engine(DB_URI)

st.title("🏭 Real-Time Line Telemetry & OEE Monitor")
st.caption(f"⚡ Live Polling Active (Cycle #{count}) — Updating every 3s")

# ----------------------------------------------------
# 1. Data Retrieval (Single Connection Scope)
# ----------------------------------------------------
try:
    with engine.connect() as conn:
        # Fetch latest status of all machines, along with Predictive Health scores and physical sensor readings
        latest_machines_df = pd.read_sql("""
            WITH ranked AS (
                SELECT 
                    t.event_id,
                    t.timestamp,
                    t.line_id,
                    t.machine_id,
                    r.status_name,
                    r.category,
                    t.good_units,
                    t.defect_units,
                    t.cycle_time_sec,
                    COALESCE(t.vibration_rms, 1.25) AS vibration_rms,
                    COALESCE(t.bearing_temp_c, 45.0) AS bearing_temp_c,
                    COALESCE(t.press_force_kn, 120.0) AS press_force_kn,
                    ROW_NUMBER() OVER (PARTITION BY t.line_id, t.machine_id ORDER BY t.event_id DESC) as rn
                FROM machine_telemetry t
                JOIN downtime_reasons r ON t.status_code = r.status_code
            ),
            health AS (
                SELECT DISTINCT ON (line_id, machine_id)
                    line_id,
                    machine_id,
                    health_index,
                    defect_probability,
                    risk_level,
                    top_root_cause
                FROM machine_health_scores
                ORDER BY line_id, machine_id, timestamp DESC
            )
            SELECT 
                r.*,
                COALESCE(h.health_index, 100.0) AS health_index,
                COALESCE(h.defect_probability, 0.01) AS defect_probability,
                COALESCE(h.risk_level, 'NORMAL') AS risk_level,
                COALESCE(h.top_root_cause, 'None') AS top_root_cause
            FROM ranked r
            LEFT JOIN health h ON r.line_id = h.line_id AND r.machine_id = h.machine_id
            WHERE r.rn = 1
            ORDER BY r.line_id, r.machine_id;
        """, conn)

        # Fetch latest 10 events for live table feed with sensor readings
        live_df = pd.read_sql("""
            SELECT 
                t.event_id,
                t.timestamp,
                t.line_id,
                t.machine_id,
                r.status_name,
                t.good_units,
                t.defect_units,
                t.cycle_time_sec,
                ROUND(COALESCE(t.vibration_rms, 1.25)::numeric, 2) AS vibration_rms,
                ROUND(COALESCE(t.bearing_temp_c, 45.0)::numeric, 1) AS bearing_temp_c,
                ROUND(COALESCE(t.press_force_kn, 120.0)::numeric, 0) AS press_force_kn
            FROM machine_telemetry t
            JOIN downtime_reasons r ON t.status_code = r.status_code
            ORDER BY t.event_id DESC
            LIMIT 10;
        """, conn)

        # Fetch historical OEE from Data Mart
        oee_df = pd.read_sql("""
            SELECT 
                hour_bucket,
                line_id,
                machine_id,
                availability_pct,
                performance_pct,
                quality_pct,
                oee_pct,
                total_good_units,
                total_defect_units,
                unplanned_downtime_sec
            FROM hourly_production_summary
            ORDER BY hour_bucket DESC;
        """, conn)

except Exception as e:
    st.error(f"Database Connection Error: {e}")
    st.stop()

# ----------------------------------------------------
# 2. Live Machine Status Cards (fixed 4-column layout)
# ----------------------------------------------------
st.subheader("🔴 Live Machine Health")

if not latest_machines_df.empty:
    cols = st.columns(len(latest_machines_df))

    for idx, (_, row) in enumerate(latest_machines_df.iterrows()):
        with cols[idx]:
            is_breakdown = row["category"] == "Unplanned Downtime"
            is_defect = row["defect_units"] > 0
            
            status_color = "red" if is_breakdown else ("orange" if is_defect else "green")
            
            health_val = float(row["health_index"])
            delta_label = f"Health: {health_val:.1f}%"
            st.metric(
                label=f"{row['line_id']} | {row['machine_id']}",
                value=f"{row['status_name']}",
                delta=delta_label,
                delta_color="normal" if health_val >= 75 else "inverse"
            )
            st.caption(f"⚡ Vib: {float(row['vibration_rms']):.2f} mm/s² | 🌡️ {float(row['bearing_temp_c']):.1f}°C | 🔨 {float(row['press_force_kn']):.0f} kN")
            if row["top_root_cause"] != "None":
                st.caption(f"⚠️ :red[RCA: {row['top_root_cause']}]")
            else:
                st.caption(f"Defect Risk: {float(row['defect_probability'])*100:.1f}% | :{status_color}[{row['category']}]")

st.divider()

# ----------------------------------------------------
# 3. Stream Feed & Historic OEE Charts
# ----------------------------------------------------
c1, c2 = st.columns([1, 1])

with c1:
    st.subheader("📡 Recent Telemetry & Physical Sensors (Latest 10)")
    st.dataframe(
        live_df[["event_id", "timestamp", "line_id", "machine_id", "status_name", "good_units", "defect_units", "cycle_time_sec", "vibration_rms", "bearing_temp_c", "press_force_kn"]],
        hide_index=True,
        width="stretch"
    )

with c2:
    st.subheader("📈 Hourly OEE Trend (Batch Layer)")
    if not oee_df.empty:
        fig_oee = px.line(
            oee_df, 
            x="hour_bucket", 
            y="oee_pct", 
            color="machine_id",
            markers=True,
            labels={"hour_bucket": "Time Bucket", "oee_pct": "OEE (%)"}
        )
        st.plotly_chart(fig_oee, width="stretch")
    else:
        st.info("No aggregated OEE data yet. Run `batch_etl.py` to populate.")