"""
FactoryPulse - High-Throughput Manufacturing Telemetry Generator
Generates realistic large-scale industrial datasets (up to 1,000,000+ records)
using optimized chunked bulk inserts.
"""

import sys
import time
import random
import argparse
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "manufacturing_db",
    "user": "mfg_user",
    "password": "mfg_password"
}

MACHINE_PROFILES = {
    "CNC_A": {"cycle_range": (9.0, 11.5), "vib_base": 1.20, "temp_base": 42.0, "press_base": 95.0, "amp_base": 14.0, "hyd_base": 140.0},
    "CNC_B": {"cycle_range": (12.0, 15.0), "vib_base": 1.60, "temp_base": 48.0, "press_base": 135.0, "amp_base": 18.5, "hyd_base": 155.0},
    "ROBOT_ARM": {"cycle_range": (6.5, 8.5), "vib_base": 0.75, "temp_base": 36.0, "press_base": 12.0, "amp_base": 8.0, "hyd_base": 90.0}
}

LINES = ["LINE_01", "LINE_02"]
MACHINES = ["CNC_A", "CNC_B", "ROBOT_ARM"]

def generate_record_tuple(line: str, machine: str, ts: datetime):
    profile = MACHINE_PROFILES[machine]
    # Status distribution: 85% Normal (1), 5% Tool Change (2), 4% Jam (3), 3% Sensor (4), 3% Idle (5)
    status = random.choices([1, 2, 3, 4, 5], weights=[85, 5, 4, 3, 3])[0]

    if status == 1:
        cycle_time = round(random.uniform(*profile["cycle_range"]), 2)
        good = random.randint(1, 3)
        defect = 1 if random.random() < 0.035 else 0
        vib = round(profile["vib_base"] + random.gauss(0, 0.08), 3)
        kurt = round(3.0 + random.uniform(-0.1, 0.3), 3)
        temp = round(profile["temp_base"] + random.gauss(0, 1.2), 2)
        press = round(profile["press_base"] + random.gauss(0, 2.0), 2)
        amps = round(profile["amp_base"] + random.gauss(0, 0.4), 2)
        hyd = round(profile["hyd_base"] + random.gauss(0, 1.5), 2)
    else:
        cycle_time = round(random.uniform(20.0, 60.0), 2)
        good, defect = 0, 0
        vib = round(profile["vib_base"] * (2.2 if status == 3 else 0.4), 3)
        kurt = round(8.5 if status == 3 else 2.8, 3)
        temp = round(profile["temp_base"] + (20.0 if status == 3 else -3.0), 2)
        press = round(profile["press_base"] * 1.4 if status == 3 else 0.0, 2)
        amps = round(profile["amp_base"] * 1.8 if status == 3 else 0.2, 2)
        hyd = round(profile["hyd_base"] * 0.7, 2)

    return (
        line, machine, ts, cycle_time, good, defect, status,
        vib, kurt, temp, press, amps, hyd
    )

def bulk_generate(target_rows: int, chunk_size: int = 5000):
    print(f"\n=======================================================")
    print(f" FactoryPulse - Bulk Ingestion Engine ({target_rows:,} records)")
    print(f"=======================================================")

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cursor = conn.cursor()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

    insert_sql = """
        INSERT INTO machine_telemetry (
            line_id, machine_id, timestamp, cycle_time_sec, good_units, defect_units, status_code,
            vibration_rms, vibration_kurtosis, bearing_temp_c, press_force_kn, motor_current_amp, hydraulic_pressure_bar
        ) VALUES %s;
    """

    start_time = time.time()
    current_time = datetime.now()
    records_inserted = 0
    time_step_sec = 2.0  # 2s resolution per record

    print(f"Generating data stream with chunk size = {chunk_size:,}...")

    while records_inserted < target_rows:
        batch_count = min(chunk_size, target_rows - records_inserted)
        batch_records = []

        for _ in range(batch_count):
            line = random.choice(LINES)
            machine = random.choice(MACHINES)
            ts = current_time - timedelta(seconds=(target_rows - records_inserted) * time_step_sec)
            batch_records.append(generate_record_tuple(line, machine, ts))
            records_inserted += 1

        execute_values(cursor, insert_sql, batch_records, page_size=chunk_size)
        conn.commit()

        elapsed = time.time() - start_time
        rate = records_inserted / elapsed if elapsed > 0 else 0
        progress_pct = (records_inserted / target_rows) * 100.0
        print(f" -> Inserted {records_inserted:,}/{target_rows:,} records ({progress_pct:.1f}%) | Speed: {rate:,.0f} rows/sec", end="\r")

    total_time = time.time() - start_time
    avg_speed = records_inserted / total_time if total_time > 0 else 0
    print(f"\n\n✅ Bulk ingestion complete!")
    print(f" -> Total records: {records_inserted:,}")
    print(f" -> Total duration: {total_time:.2f} seconds")
    print(f" -> Average throughput: {avg_speed:,.0f} records/second")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FactoryPulse Bulk Telemetry Generator")
    parser.add_argument("--rows", type=int, default=10000, help="Number of telemetry records to generate (e.g. 1000000 for 1M)")
    parser.add_argument("--chunk-size", type=int, default=5000, help="Batch insertion chunk size")
    args = parser.parse_args()

    bulk_generate(target_rows=args.rows, chunk_size=args.chunk_size)
