import React from 'react';
import { 
  CheckCircle, 
  AlertOctagon, 
  Wrench, 
  PauseCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Gauge,
  Zap,
  Clock,
  Hash,
  Cpu,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { MachineHealth } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface MachineHealthCardsProps {
  machines: MachineHealth[];
  selectedMachineFilter: string | null;
  onSelectMachine: (machineId: string | null) => void;
  activeUpdateKeys: Set<string>;
  hoveredMachine: string | null;
  onHoverMachine: (machineKey: string | null) => void;
  columns?: 2 | 3;
}

const MACHINE_ACCENTS: Record<string, { tag: string; color: string; border: string }> = {
  CNC_A: { tag: 'text-sky-300 bg-sky-500/10 border-sky-500/30', color: 'text-sky-400', border: 'border-sky-500/30' },
  CNC_B: { tag: 'text-pink-300 bg-pink-500/10 border-pink-500/30', color: 'text-pink-400', border: 'border-pink-500/30' },
  ROBOT_ARM: { tag: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', color: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export const ROOT_CAUSE_TRANSLATIONS: Record<string, { th: string; en: string }> = {
  vibration_rms: { th: 'ความสั่นสะเทือน (Vibration RMS)', en: 'Bearing Vibration Spike (RMS)' },
  vibration_kurtosis: { th: 'แรงกระแทกแหลมคม (Kurtosis)', en: 'Bearing Impact Spike (Kurtosis)' },
  bearing_temp_c: { th: 'อุณหภูมิแบริ่ง (Bearing Temp)', en: 'Bearing Overheating (Temp)' },
  press_force_kn: { th: 'แรงกดปั๊มขึ้นรูป (Press Force)', en: 'Press Force Drift (kN)' },
  motor_current_amp: { th: 'กระแสไฟฟ้ามอเตอร์ (Motor Current)', en: 'Motor Current Load Surge' },
  hydraulic_pressure_bar: { th: 'แรงดันไฮดรอลิก (Hydraulic Pressure)', en: 'Hydraulic Pressure Fluctuation' },
  cycle_time_sec: { th: 'ระยะเวลาผลิตต่อรอบ (Cycle Time)', en: 'Cycle Time Latency' },
  vibration_rms_roll_mean_5: { th: 'ค่าเฉลี่ยแรงสั่นสะสม 5 รอบ', en: '5-Cycle Rolling Vibration Drift' },
  vibration_rms_roll_std_5: { th: 'ความแปรปรวนของแรงสั่น', en: 'Vibration Instability (Std Dev)' },
  bearing_temp_c_roll_mean_5: { th: 'แนวโน้มความร้อนสะสม', en: 'Heat Accumulation Trend' },
  motor_current_amp_roll_mean_5: { th: 'แนวโน้มโหลดมอเตอร์สะสม', en: 'Motor Load Accumulation' },
  vibration_delta_1: { th: 'อัตราเร่งแรงสั่นเทียบรอบก่อน', en: 'Sudden Vibration Acceleration' },
  temp_delta_1: { th: 'อัตราความร้อนเพิ่มขึ้นเทียบรอบก่อน', en: 'Sudden Heat Spike' },
  motor_current_delta_1: { th: 'กระแสโหลดพุ่งสูงเทียบรอบก่อน', en: 'Sudden Motor Load Surge' },
  crest_factor_est: { th: 'ดัชนี Crest Factor (แรงกระแทกยอดคลื่น)', en: 'Crest Factor Spike (Peak)' },
  energy_proxy: { th: 'กำลังงานขับเคลื่อนรวม', en: 'Total Driving Energy Surge' },
};

export const formatRootCause = (cause: string | undefined, lang: 'th' | 'en'): string => {
  if (!cause || cause === 'None') return '';
  if (ROOT_CAUSE_TRANSLATIONS[cause]) {
    return ROOT_CAUSE_TRANSLATIONS[cause][lang];
  }
  for (const entry of Object.values(ROOT_CAUSE_TRANSLATIONS)) {
    if (entry.th === cause) {
      return entry[lang];
    }
  }
  if (lang === 'en') {
    if (cause.includes('สั่นสะเทือน') || cause.includes('Vibration')) return 'Bearing Vibration Anomaly';
    if (cause.includes('อุณหภูมิ') || cause.includes('ความร้อน') || cause.includes('Temp')) return 'Bearing Overheating';
    if (cause.includes('แรงกด') || cause.includes('Press Force')) return 'Press Force Anomaly';
    if (cause.includes('กระแส') || cause.includes('Current')) return 'Motor Current Load Surge';
    if (cause.includes('ไฮดรอลิก') || cause.includes('Hydraulic')) return 'Hydraulic Pressure Anomaly';
    if (cause.includes('ระยะเวลา') || cause.includes('Cycle Time')) return 'Cycle Time Latency';
    if (cause.includes('กระแทก') || cause.includes('Kurtosis')) return 'Impact Shock Spike (Kurtosis)';
  }
  return cause;
};

export const MachineHealthCards: React.FC<MachineHealthCardsProps> = ({
  machines,
  selectedMachineFilter,
  onSelectMachine,
  activeUpdateKeys,
  hoveredMachine,
  onHoverMachine,
  columns = 3,
}) => {
  const { t, lang } = useLanguage();

  const getLocalizedStatusName = (statusCode: number, fallbackName: string) => {
    switch (statusCode) {
      case 1: return t.common.statusNormal;
      case 2: return t.common.statusMaintenance;
      case 3: return t.common.statusJam;
      case 4: return t.common.statusFault;
      case 5: return t.common.statusNoMaterial;
      default: return fallbackName;
    }
  };

  const getLocalizedCategory = (category: string) => {
    switch (category) {
      case 'Production': return t.common.catProduction;
      case 'Unplanned Downtime': return t.common.catUnplannedDowntime;
      case 'Planned Maintenance': return t.common.catPlannedMaintenance;
      case 'Idle': return t.common.catIdle;
      default: return category;
    }
  };

  const getStatusStyles = (category: string, defectCount: number) => {
    if (category === 'Unplanned Downtime') {
      return {
        cardBorder: 'border-red-500/40 bg-red-950/20 hover:border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
        beacon: 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping',
        badge: 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold',
        textTitle: 'text-red-400',
        icon: AlertOctagon,
      };
    }
    if (category === 'Planned Maintenance') {
      return {
        cardBorder: 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
        beacon: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold',
        textTitle: 'text-amber-300',
        icon: Wrench,
      };
    }
    if (category === 'Idle') {
      return {
        cardBorder: 'border-slate-800 bg-slate-900/40 hover:border-slate-700',
        beacon: 'bg-slate-400',
        badge: 'bg-slate-800 text-slate-300 border border-slate-700 font-bold',
        textTitle: 'text-slate-300',
        icon: PauseCircle,
      };
    }
    if (defectCount > 0) {
      return {
        cardBorder: 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/60',
        beacon: 'bg-amber-400 animate-ping',
        badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold',
        textTitle: 'text-amber-300',
        icon: AlertOctagon,
      };
    }
    // Normal Production
    return {
      cardBorder: 'border-white/[0.08] bg-[#0c121e]/80 hover:border-emerald-500/40 shadow-sm',
      beacon: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
      badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold',
      textTitle: 'text-white',
      icon: CheckCircle,
    };
  };

  const getHistoryDotColor = (category: string, defectCount: number) => {
    if (category === 'Unplanned Downtime') return 'bg-red-500 shadow-[0_0_6px_#ef4444]';
    if (category === 'Planned Maintenance') return 'bg-amber-400';
    if (category === 'Idle') return 'bg-slate-500';
    if (defectCount > 0) return 'bg-amber-400';
    return 'bg-emerald-400 shadow-[0_0_6px_#10b981]';
  };

  const formatRelativeTime = (ts: string) => {
    try {
      const eventTime = new Date(ts).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - eventTime) / 1000));
      if (diffSec < 5) return t.common.justNow;
      if (diffSec < 60) return `${diffSec} ${t.common.secondsAgo}`;
      return `${Math.floor(diffSec / 60)} ${t.common.minutesAgo}`;
    } catch {
      return '';
    }
  };

  // Group machines by Line
  const lineGroups = React.useMemo(() => {
    const groups: Record<string, MachineHealth[]> = {};
    machines.forEach((m) => {
      if (!groups[m.line_id]) groups[m.line_id] = [];
      groups[m.line_id].push(m);
    });
    return groups;
  }, [machines]);

  const getLineSubtitle = (lineId: string) => {
    if (lineId === 'LINE_01') {
      return lang === 'th' ? 'สายการผลิต 1 • เครื่องกัด & แขนกลประกอบ' : 'Line 1 • Machining & High-Speed Milling';
    }
    if (lineId === 'LINE_02') {
      return lang === 'th' ? 'สายการผลิต 2 • เครื่องกลึง & ตรวจสอบคุณภาพ' : 'Line 2 • Lathe & Robotic Inspection';
    }
    return '';
  };

  const renderMachineCard = (m: MachineHealth) => {
    const machineKey = `${m.line_id}_${m.machine_id}`;
    const isSelected = selectedMachineFilter === machineKey;
    const isHovered = hoveredMachine === machineKey;
    const isJustUpdated = activeUpdateKeys.has(machineKey);
    const styles = getStatusStyles(m.category, m.defect_units);
    const isDefect = m.defect_units > 0;
    const localizedStatusName = getLocalizedStatusName(m.status_code, m.status_name);

    const accent = MACHINE_ACCENTS[m.machine_id] || {
      tag: 'text-slate-300 bg-white/5 border-white/10',
      color: 'text-slate-300',
      border: 'border-white/10'
    };

    const targetSec = m.target_cycle_time_sec || 10.0;
    const cycleRatio = m.cycle_time_sec / targetSec;
    const cycleColor =
      cycleRatio > 1.3
        ? 'text-red-400 font-bold'
        : cycleRatio > 1.05
        ? 'text-amber-400 font-semibold'
        : 'text-emerald-400 font-semibold';

    const cycleProgressPct = Math.min(100, Math.max(10, (m.cycle_time_sec / (targetSec * 1.5)) * 100));

    return (
      <div
        key={machineKey}
        onClick={() => onSelectMachine(isSelected ? null : machineKey)}
        onMouseEnter={() => onHoverMachine(machineKey)}
        onMouseLeave={() => onHoverMachine(null)}
        className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between min-h-[220px] cursor-pointer transition-all duration-200 backdrop-blur-xl ${
          styles.cardBorder
        } ${
          isJustUpdated 
            ? 'ring-2 ring-emerald-400 bg-emerald-950/30 scale-[1.01] shadow-[0_0_25px_rgba(16,185,129,0.25)] z-10' 
            : ''
        } ${
          isHovered 
            ? 'ring-1 ring-sky-400/80 bg-white/[0.06] shadow-xl z-10' 
            : ''
        } ${
          isSelected 
            ? 'ring-2 ring-emerald-500/90 bg-emerald-950/25 shadow-lg' 
            : ''
        }`}
      >
        {/* Active update lightning indicator */}
        {isJustUpdated && (
          <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-lg animate-bounce z-20 whitespace-nowrap">
            <Zap className="w-3 h-3 fill-current" />
            <span>{t.monitor.ingestedNotice(m.event_id)}</span>
          </div>
        )}

        {/* Card Header: Machine Identity & High-Fidelity Status Pill */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${accent.tag}`}>
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-base tracking-tight font-mono">
                    {m.machine_id}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                    {m.line_id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {getLocalizedCategory(m.category)}
                </p>
              </div>
            </div>

            {/* Status Pill with Beacon - No Truncation */}
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 ${styles.badge}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.beacon}`} />
              <span className="whitespace-nowrap">{localizedStatusName}</span>
            </div>
          </div>

          {/* Metadata Row: Event ID & Timestamp in clean text */}
          <div className="mt-2.5 flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3 text-slate-600" />
              <span>Event #{m.event_id}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              <span>{formatRelativeTime(m.timestamp)}</span>
            </span>
          </div>
        </div>

        {/* Output Yield & Cycle Speed Metric Strip */}
        <div className="my-3 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 gap-2">
          {/* Output Counter */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-slate-400">
              Yield Result
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isDefect ? (
                <span className="text-sm font-extrabold font-mono text-red-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  +{m.good_units} / -{m.defect_units} {lang === 'th' ? 'เสีย' : 'Scrap'}
                </span>
              ) : (
                <span className="text-sm font-extrabold font-mono text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{m.good_units} {lang === 'th' ? 'ชิ้นดี' : 'Good'}
                </span>
              )}
            </div>
          </div>

          {/* Cycle Time */}
          <div className="flex flex-col justify-center text-right">
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-slate-400">
              {t.monitor.cycleLabel}
            </span>
            <div className="flex items-center justify-end gap-1 mt-0.5 font-mono">
              <strong className={`text-sm ${cycleColor}`}>{m.cycle_time_sec.toFixed(1)}s</strong>
              <span className="text-slate-400 text-[11px]">/ {targetSec.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Cycle Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                cycleRatio > 1.3 ? 'bg-red-400' : cycleRatio > 1.05 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${cycleProgressPct}%` }}
            />
          </div>
        </div>

        {/* Predictive Health & Anomaly Index (NHK Spring Data Science Engine) */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-sans font-medium text-slate-400">Health Index:</span>
              <span className={`font-mono font-bold text-xs ${
                (m.health_index ?? 100) >= 75 ? 'text-emerald-400' : (m.health_index ?? 100) >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {(m.health_index ?? 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-sans font-medium text-slate-400">Defect Risk:</span>
              <span className={`font-mono font-bold ${
                (m.defect_probability ?? 0) > 0.3 ? 'text-red-400' : 'text-slate-200'
              }`}>
                {((m.defect_probability ?? 0.01) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Physical Sensors Telemetry Strip */}
          <div className="grid grid-cols-3 gap-1 text-[10px] bg-black/30 p-1.5 rounded-lg border border-white/[0.04]">
            <div className="flex flex-col">
              <span className="font-sans font-medium text-slate-400">Vib RMS</span>
              <span className="font-mono text-slate-200 font-semibold">{m.vibration_rms ? `${m.vibration_rms.toFixed(2)}` : '1.25'} mm/s²</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-medium text-slate-400">Temp</span>
              <span className="font-mono text-slate-200 font-semibold">{m.bearing_temp_c ? `${m.bearing_temp_c.toFixed(1)}` : '42.0'} °C</span>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-medium text-slate-400">Press</span>
              <span className="font-mono text-slate-200 font-semibold">{m.press_force_kn ? `${m.press_force_kn.toFixed(0)}` : '95'} kN</span>
            </div>
          </div>

          {/* Root Cause Alert Badge */}
          {m.top_root_cause && m.top_root_cause !== 'None' && (
            <div className="text-[10px] font-sans font-medium px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">RCA: <strong className="font-semibold text-amber-200">{formatRootCause(m.top_root_cause, lang)}</strong></span>
            </div>
          )}
        </div>

        {/* Recent 5 Cycles History Beads */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-slate-600" />
            <span>{t.monitor.recent5Cycles}</span>
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/[0.06]">
            {m.recent_history && m.recent_history.length > 0 ? (
              [...m.recent_history].reverse().map((h, i) => (
                <div
                  key={h.event_id || i}
                  title={`#${h.event_id}: ${getLocalizedStatusName(h.status_code, h.status_name)} (${h.cycle_time_sec}s)`}
                  className="flex flex-col items-center group relative cursor-help"
                >
                  <div className={`w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-150 ${getHistoryDotColor(h.category, h.defect_units)}`} />
                </div>
              ))
            ) : (
              <span className="text-[9px] font-mono text-slate-600">Awaiting</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const lineKeys = Object.keys(lineGroups).sort();
  const gridColsClass = columns === 2 
    ? 'grid-cols-1 sm:grid-cols-2' 
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-5">
      {lineKeys.map((lineId) => {
        const lineMachines = lineGroups[lineId];
        const hasBreakdown = lineMachines.some(m => m.category === 'Unplanned Downtime');
        const isLine01 = lineId === 'LINE_01';

        return (
          <div key={lineId} className="space-y-3">
            {/* Line Section Title Bar */}
            <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex items-center space-x-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isLine01 
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' 
                    : 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                }`}>
                  {lineId}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {getLineSubtitle(lineId)}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                {hasBreakdown ? (
                  <span className="text-red-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    {lang === 'th' ? 'มีเหตุขัดข้อง' : 'Incident Active'}
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {lang === 'th' ? 'ปกติ 3/3 เครื่อง' : '3/3 Operating'}
                  </span>
                )}
              </div>
            </div>

            {/* Machines Grid for this Line */}
            <div className={`grid ${gridColsClass} gap-4`}>
              {lineMachines.map(renderMachineCard)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

