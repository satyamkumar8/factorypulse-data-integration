import time
import random
import sys
import argparse
import psycopg2
from datetime import datetime, timedelta

# Physical baseline definition for each machine type (automotive parts / NHK Spring industry standards)
MACHINE_PROFILES = {
    "CNC_A": {
        "cycle_time_range": (9.0, 11.5),
        "vibration_rms_base": 1.20,
        "bearing_temp_base": 42.0,
        "press_force_base": 95.0,
        "motor_current_base": 14.0,
        "hydraulic_pressure_base": 140.0,
    },
    "CNC_B": {
        "cycle_time_range": (12.0, 15.0),
        "vibration_rms_base": 1.60,
        "bearing_temp_base": 48.0,
        "press_force_base": 135.0,
        "motor_current_base": 18.5,
        "hydraulic_pressure_base": 155.0,
    },
    "ROBOT_ARM": {
        "cycle_time_range": (6.5, 8.5),
        "vibration_rms_base": 0.75,
        "bearing_temp_base": 36.0,
        "press_force_base": 12.0,
        "motor_current_base": 8.0,
        "hydraulic_pressure_base": 90.0,
    }
}

lines = ["LINE_01", "LINE_02"]
machines = ["CNC_A", "CNC_B", "ROBOT_ARM"]

# Track cumulative degradation state (Degradation State: 0.00 = brand new, 1.00 = maximum wear)
machine_wear = {f"{l}_{m}": random.uniform(0.05, 0.25) for l in lines for m in machines}

def generate_telemetry_record(line, machine, current_time=None):
    if current_time is None:
        current_time = datetime.now()

    m_key = f"{line}_{machine}"
    profile = MACHINE_PROFILES.get(machine, MACHINE_PROFILES["CNC_A"])
    wear = machine_wear[m_key]

    # Cumulative wear increase per cycle (Tool Wear & Bearing Fatigue)
    wear += random.uniform(0.001, 0.003)
    
    # Machine status assignment: high wear significantly increases chances of faults and defects
    if wear > 0.85:
        status_weights = [50, 20, 15, 10, 5]  # High probability of Tool Change or Breakdown
    elif wear > 0.60:
        status_weights = [70, 10, 10, 5, 5]
    else:
        status_weights = [85, 5, 4, 3, 3]

    status = random.choices([1, 2, 3, 4, 5], weights=status_weights)[0]

    # If maintenance occurs (Tool Change or Maintenance), wear is reset
    if status == 2:
        machine_wear[m_key] = random.uniform(0.02, 0.08)
        wear = machine_wear[m_key]
    else:
        machine_wear[m_key] = min(wear, 1.0)

    # Compute physics parameters based on status and wear
    if status == 1:  # Normal operation
        cycle_time = round(random.uniform(*profile["cycle_time_range"]) + (wear * 1.5), 2)
        good_units = random.randint(1, 3)
        
        # Influence of wear on part quality (Virtual Metrology Ground Truth)
        defect_prob = 0.01 + (0.40 * (wear ** 3))
        defect_units = 1 if random.random() < defect_prob else 0
        
        # Sensor physics during operation
        vibration_rms = round(profile["vibration_rms_base"] * (1.0 + wear * 0.8) + random.gauss(0, 0.05), 3)
        # Kurtosis: normally around ~3.0, but spikes if micro-cracks develop from wear
        vibration_kurtosis = round(3.0 + (wear ** 2) * 4.5 + random.uniform(-0.2, 0.4), 3)
        bearing_temp_c = round(profile["bearing_temp_base"] + (wear * 18.0) + random.gauss(0, 0.5), 2)
        press_force_kn = round(profile["press_force_base"] * (1.0 + (wear - 0.5) * 0.15) + random.gauss(0, 1.2), 2)
        motor_current_amp = round(profile["motor_current_base"] * (1.0 + wear * 0.35) + random.gauss(0, 0.3), 2)
        hydraulic_pressure_bar = round(profile["hydraulic_pressure_base"] + random.gauss(0, 1.5), 2)
    else:  # Downtime or fault condition
        cycle_time = round(random.uniform(15.0, 45.0), 2)
        good_units = 0
        defect_units = 0
        
        # Sensor values during fault state
        if status == 3:  # Mechanical Jam (sudden surge in electric current and vibration)
            vibration_rms = round(profile["vibration_rms_base"] * 2.5 + random.uniform(0.5, 1.5), 3)
            vibration_kurtosis = round(random.uniform(7.0, 14.0), 3)
            bearing_temp_c = round(profile["bearing_temp_base"] + 25.0 + random.uniform(0, 5), 2)
            press_force_kn = round(profile["press_force_base"] * 1.6, 2)
            motor_current_amp = round(profile["motor_current_base"] * 2.2, 2)
            hydraulic_pressure_bar = round(profile["hydraulic_pressure_base"] * 0.6, 2)
        else:
            vibration_rms = round(profile["vibration_rms_base"] * 0.3, 3)
            vibration_kurtosis = round(random.uniform(2.5, 3.2), 3)
            bearing_temp_c = round(profile["bearing_temp_base"] + random.uniform(-2, 2), 2)
            press_force_kn = round(random.uniform(0, 5), 2)
            motor_current_amp = round(profile["motor_current_base"] * 0.2, 2)
            hydraulic_pressure_bar = round(profile["hydraulic_pressure_base"] * 0.9, 2)

    return (
        line, machine, current_time, cycle_time, good_units, defect_units, status,
        vibration_rms, vibration_kurtosis, bearing_temp_c, press_force_kn, motor_current_amp, hydraulic_pressure_bar
    )

def run():
    parser = argparse.ArgumentParser(description="Industrial IoT & Sensor Telemetry Simulator")
    parser.add_argument("--batch-generate", type=int, default=0, help="Generate N historical telemetry events immediately for ML training")
    args = parser.parse_args()

    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="manufacturing_db",
        user="mfg_user",
        password="mfg_password"
    )
    cursor = conn.cursor()

    insert_query = """
    INSERT INTO machine_telemetry (
        line_id, machine_id, timestamp, cycle_time_sec, good_units, defect_units, status_code,
        vibration_rms, vibration_kurtosis, bearing_temp_c, press_force_kn, motor_current_amp, hydraulic_pressure_bar
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """

    if args.batch_generate > 0:
        total_records = args.batch_generate
        print(f"Generating {total_records} historical physical sensor events for Data Science training...")
        start_history = datetime.now() - timedelta(hours=max(6, total_records // 150))
        delta_sec = 10
        records = []
        
        for i in range(total_records):
            line = random.choice(lines)
            machine = random.choice(machines)
            record_time = start_history + timedelta(seconds=i * delta_sec)
            record = generate_telemetry_record(line, machine, record_time)
            records.append(record)

            if len(records) >= 500:
                cursor.executemany(insert_query, records)
                conn.commit()
                records = []
                print(f"Generated {i + 1}/{total_records} records...")

        if records:
            cursor.executemany(insert_query, records)
            conn.commit()

        print(f"Successfully generated and inserted {total_records} sensor telemetry records!")
        cursor.close()
        conn.close()
        return

    print("Starting Line Data Ingestion Simulator with Physical Sensors (Ctrl+C to stop)...")
    try:
        while True:
            line = random.choice(lines)
            machine = random.choice(machines)
            record = generate_telemetry_record(line, machine, datetime.now())

            cursor.execute(insert_query, record)
            conn.commit()

            print(
                f"[{record[2].strftime('%H:%M:%S')}] Ingested: {line} | {machine} | "
                f"Status: {record[6]} | Vib: {record[7]:.2f} mm/s2 | Temp: {record[9]:.1f}C | Good: {record[4]} | Defect: {record[5]}"
            )
            time.sleep(2)

    except KeyboardInterrupt:
        print("\nSimulator stopped.")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run()