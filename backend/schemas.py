from typing import Optional, List
from pydantic import BaseModel

class MachineHealth(BaseModel):
    event_id: int
    timestamp: str
    line_id: str
    machine_id: str
    status_code: int
    status_name: str
    category: str
    good_units: int
    defect_units: int
    cycle_time_sec: float
    target_cycle_time_sec: float
    vibration_rms: Optional[float] = 1.25
    vibration_kurtosis: Optional[float] = 3.00
    bearing_temp_c: Optional[float] = 45.0
    press_force_kn: Optional[float] = 120.0
    motor_current_amp: Optional[float] = 15.0
    hydraulic_pressure_bar: Optional[float] = 150.0
    health_index: Optional[float] = 100.0
    defect_probability: Optional[float] = 0.01
    risk_level: Optional[str] = "NORMAL"
    top_root_cause: Optional[str] = "None"
    recent_history: Optional[List[dict]] = []

class TelemetryEvent(BaseModel):
    event_id: int
    timestamp: str
    line_id: str
    machine_id: str
    status_code: int
    status_name: str
    category: str
    good_units: int
    defect_units: int
    cycle_time_sec: float
    vibration_rms: Optional[float] = None
    vibration_kurtosis: Optional[float] = None
    bearing_temp_c: Optional[float] = None
    press_force_kn: Optional[float] = None
    motor_current_amp: Optional[float] = None
    hydraulic_pressure_bar: Optional[float] = None

class MachinePredictiveHealth(BaseModel):
    line_id: str
    machine_id: str
    health_index: float
    anomaly_score: float
    defect_probability: float
    risk_level: str
    top_root_cause: Optional[str] = "None"
    root_cause_impact: Optional[float] = 0.0
    timestamp: Optional[str] = None

class HourlyOEE(BaseModel):
    hour_bucket: str
    line_id: str
    machine_id: str
    total_cycles: int
    total_good_units: int
    total_defect_units: int
    total_produced_units: int
    operating_time_sec: float
    unplanned_downtime_sec: float
    availability_pct: float
    performance_pct: float
    quality_pct: float
    oee_pct: float

class KPISummary(BaseModel):
    scope: str = "ALL LINES"
    plant_oee_pct: float
    total_produced: int
    total_good: int
    total_defects: int
    defect_rate_pct: float
    unplanned_downtime_sec: float
    active_machines_count: int
    breakdown_machines_count: int

class ExecutionLog(BaseModel):
    log_id: int
    pipeline_name: str
    start_time: str
    end_time: Optional[str] = None
    status: str
    rows_processed: int
    error_message: Optional[str] = None

class ETLResponse(BaseModel):
    status: str
    message: str
    rows_affected: int
    duration_sec: float

class OperationalAlert(BaseModel):
    alert_id: int
    timestamp: str
    line_id: str
    machine_id: str
    alert_type: str
    severity: str
    threshold_value: Optional[float] = None
    actual_value: Optional[float] = None
    message: str
    is_acknowledged: bool = False
