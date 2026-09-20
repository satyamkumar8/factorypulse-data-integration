export interface MachineHistoryItem {
  event_id: number;
  status_code: number;
  status_name: string;
  category: string;
  good_units: number;
  defect_units: number;
  cycle_time_sec: number;
  time: string;
}

export interface MachineHealth {
  event_id: number;
  timestamp: string;
  line_id: string;
  machine_id: string;
  status_code: number;
  status_name: string;
  category: string;
  good_units: number;
  defect_units: number;
  cycle_time_sec: number;
  target_cycle_time_sec: number;
  vibration_rms?: number;
  vibration_kurtosis?: number;
  bearing_temp_c?: number;
  press_force_kn?: number;
  motor_current_amp?: number;
  hydraulic_pressure_bar?: number;
  health_index?: number;
  defect_probability?: number;
  risk_level?: string;
  top_root_cause?: string;
  recent_history?: MachineHistoryItem[];
}

export interface TelemetryEvent {
  event_id: number;
  timestamp: string;
  line_id: string;
  machine_id: string;
  status_code: number;
  status_name: string;
  category: string;
  good_units: number;
  defect_units: number;
  cycle_time_sec: number;
  vibration_rms?: number;
  vibration_kurtosis?: number;
  bearing_temp_c?: number;
  press_force_kn?: number;
  motor_current_amp?: number;
  hydraulic_pressure_bar?: number;
}

export interface MachinePredictiveHealth {
  line_id: string;
  machine_id: string;
  health_index: number;
  anomaly_score: number;
  defect_probability: number;
  risk_level: string;
  top_root_cause: string;
  root_cause_impact: number;
  timestamp?: string;
}

export interface HourlyOEE {
  hour_bucket: string;
  line_id: string;
  machine_id: string;
  total_cycles: number;
  total_good_units: number;
  total_defect_units: number;
  total_produced_units: number;
  operating_time_sec: number;
  unplanned_downtime_sec: number;
  availability_pct: number;
  performance_pct: number;
  quality_pct: number;
  oee_pct: number;
}

export interface KPISummary {
  scope?: string;
  plant_oee_pct: number;
  total_produced: number;
  total_good: number;
  total_defects: number;
  defect_rate_pct: number;
  unplanned_downtime_sec: number;
  active_machines_count: number;
  breakdown_machines_count: number;
}

export interface ExecutionLog {
  log_id: number;
  pipeline_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  rows_processed: number;
  error_message: string | null;
}
