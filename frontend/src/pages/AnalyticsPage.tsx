import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  SlidersHorizontal, 
  Gauge, 
  Target,
  Layers,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { OeeTrendChart } from '../components/OeeTrendChart';
import { HourlyOEE } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AnalyticsPageProps {
  oeeData: HourlyOEE[];
  selectedLine: string;
  onClearOee?: () => Promise<boolean>;
  onRefreshOee?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  oeeData,
  selectedLine,
  onClearOee,
  onRefreshOee,
}) => {
  const { t, lang } = useLanguage();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearToast, setClearToast] = useState<string | null>(null);

  const handleConfirmClear = async () => {
    if (!onClearOee) return;
    setClearing(true);
    const success = await onClearOee();
    setClearing(false);
    setIsClearModalOpen(false);
    if (success) {
      setClearToast(t.analytics.clearOeeSuccess);
      setTimeout(() => setClearToast(null), 5000);
    }
  };

  // Compute latest hour metrics for each machine
  const latestByMachine = useMemo(() => {
    const map: Record<string, HourlyOEE> = {};
    const filtered = oeeData.filter(d => selectedLine === 'ALL' || d.line_id === selectedLine);
    filtered.forEach((row) => {
      const key = `${row.line_id} ${row.machine_id}`;
      if (!map[key] || new Date(row.hour_bucket) > new Date(map[key].hour_bucket)) {
        map[key] = row;
      }
    });
    return Object.values(map);
  }, [oeeData, selectedLine]);

  const pillarChartData = useMemo(() => {
    return latestByMachine.map((m) => ({
      name: `${m.line_id} ${m.machine_id}`,
      Availability: m.availability_pct,
      Performance: m.performance_pct,
      Quality: m.quality_pct,
      OEE: m.oee_pct,
      produced: m.total_produced_units,
      good: m.total_good_units,
      defects: m.total_defect_units,
      downtime: m.unplanned_downtime_sec,
    }));
  }, [latestByMachine]);

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto px-4 lg:px-8 py-6 pb-14">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>{t.analytics.pageTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
            {t.analytics.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 font-sans text-xs font-medium">
            {t.analytics.activeScope} <strong className="text-emerald-400 font-mono">{selectedLine}</strong>
          </span>

          {onRefreshOee && (
            <button
              onClick={onRefreshOee}
              title={lang === 'th' ? 'รีเฟรชข้อมูล OEE' : 'Refresh OEE Data'}
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onClearOee && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              disabled={oeeData.length === 0}
              title={t.analytics.btnClearOeeData}
              className="flex items-center gap-1.5 px-3.5 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-xs font-sans font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)] flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.analytics.btnClearOeeData}</span>
            </button>
          )}
        </div>
      </div>

      {/* Clear Toast Banner */}
      {clearToast && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-sans flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{clearToast}</span>
          </div>
          <button onClick={() => setClearToast(null)} className="font-bold opacity-70 hover:opacity-100 px-1.5">✕</button>
        </div>
      )}

      {/* Main OEE Trend Chart (Line / Bar / Matrix) */}
      <div className="min-h-[480px]">
        <OeeTrendChart oeeData={oeeData} selectedLine={selectedLine} />
      </div>

      {/* OEE 3-Pillars Deep Dive Section */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.analytics.pillarSectionTitle}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {t.analytics.pillarSectionSubtitle}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1 rounded-full border border-white/10">
            {t.analytics.pillarFormula}
          </span>
        </div>

        {/* Pillars Comparison Bar Chart */}
        <div className="h-72 w-full">
          {pillarChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              {t.analytics.noData}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pillarChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11} 
                  interval={0}
                />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = pillarChartData.find(d => d.name === label);
                    return (
                      <div className="bg-[#0c121e]/95 border border-white/15 rounded-xl p-3 text-xs font-mono shadow-2xl text-slate-200">
                        <p className="font-bold text-white border-b border-white/10 pb-1 mb-2">{label}</p>
                        <div className="space-y-1">
                          {payload.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between gap-4" style={{ color: p.color }}>
                              <span>{p.name}:</span>
                              <span className="font-bold text-white">{Number(p.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        {item && (
                          <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-400 space-y-0.5">
                            <div>{lang === 'th' ? 'ยอดผลิต' : 'Produced'}: {item.produced} ({lang === 'th' ? 'ดี' : 'Good'}: {item.good}, {lang === 'th' ? 'เสีย' : 'Scrap'}: {item.defects})</div>
                            <div>{lang === 'th' ? 'เวลาหยุดฉุกเฉิน' : 'Unplanned Downtime'}: {item.downtime}s</div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="Availability" name={lang === 'th' ? 'ความพร้อม (A)' : 'Availability'} fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Performance" name={lang === 'th' ? 'ประสิทธิภาพ (P)' : 'Performance'} fill="#c084fc" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Quality" name={lang === 'th' ? 'คุณภาพ (Q)' : 'Quality'} fill="#34d399" radius={[3, 3, 0, 0]} />
                <Bar dataKey="OEE" name="OEE" fill="#fbbf24" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Machine Breakdown Metric Cards (Scorecards with Mini Progress Bars) */}
        <div className="border-t border-white/[0.08] pt-4.5 mt-2">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'th' ? 'คะแนนแจกแจงรายเครื่องจักร (Machine Pillar Scorecards)' : 'Machine Pillar Scorecards'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-4">
            {pillarChartData.map((m) => {
              const parts = m.name.split(' ');
              const lineName = parts.length > 1 ? parts[0] : '';
              const machineName = parts.length > 1 ? parts.slice(1).join(' ') : m.name;

              return (
                <div 
                  key={m.name} 
                  className="p-4 rounded-xl border border-white/[0.08] bg-black/40 hover:bg-black/60 hover:border-white/20 text-xs font-mono transition-all shadow-md space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white tracking-wide">{machineName}</span>
                      {lineName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/10 font-mono">
                          {lineName}
                        </span>
                      )}
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                      m.OEE >= 85 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                        : m.OEE >= 60 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      OEE {m.OEE.toFixed(1)}%
                    </span>
                  </div>

                  {/* 3 Pillars with Mini Progress Bars */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{lang === 'th' ? 'ความพร้อม (A)' : 'Availability (A)'}</span>
                        <span className="font-semibold text-sky-400">{m.Availability.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-sky-400 transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, m.Availability))}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{lang === 'th' ? 'ประสิทธิภาพ (P)' : 'Performance (P)'}</span>
                        <span className="font-semibold text-purple-400">{m.Performance.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-purple-400 transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, m.Performance))}%` }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">{lang === 'th' ? 'คุณภาพ (Q)' : 'Quality (Q)'}</span>
                        <span className="font-semibold text-emerald-400">{m.Quality.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-emerald-400 transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(0, m.Quality))}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-white/[0.06] flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{lang === 'th' ? 'ชิ้นงานดี' : 'Good'}: <strong className="text-slate-200">{m.good}</strong> / {m.produced}</span>
                    <span>{lang === 'th' ? 'เวลาหยุด' : 'Downtime'}: <strong className={m.downtime > 0 ? 'text-rose-400' : 'text-slate-400'}>{m.downtime}s</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Benchmark Standards & Reference Grid (Balanced 2-Column Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>{t.analytics.benchmarksTitle}</span>
          </div>
          <div className="overflow-x-auto text-xs font-mono border border-white/[0.08] rounded-xl bg-black/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] text-slate-400 border-b border-white/[0.08]">
                  <th className="py-3 px-3.5">{t.analytics.colMachineType}</th>
                  <th className="py-3 px-3.5">{t.analytics.colTargetCycle}</th>
                  <th className="py-3 px-3.5">{t.analytics.colHourlyRate}</th>
                  <th className="py-3 px-3.5">{t.analytics.colTolerance}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3.5 font-semibold text-sky-400">
                    {lang === 'th' ? 'เครื่องกัด CNC_A' : 'CNC Milling Machine A'}
                  </td>
                  <td className="py-3 px-3.5 font-bold">12.0s</td>
                  <td className="py-3 px-3.5">300 {lang === 'th' ? 'ชิ้น/ชม.' : 'units/hr'}</td>
                  <td className="py-3 px-3.5 text-emerald-400">± 1.5s</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3.5 font-semibold text-pink-400">
                    {lang === 'th' ? 'เครื่องกลึง CNC_B' : 'CNC Lathe Machine B'}
                  </td>
                  <td className="py-3 px-3.5 font-bold">15.0s</td>
                  <td className="py-3 px-3.5">240 {lang === 'th' ? 'ชิ้น/ชม.' : 'units/hr'}</td>
                  <td className="py-3 px-3.5 text-emerald-400">± 2.0s</td>
                </tr>
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3.5 font-semibold text-emerald-400">
                    {lang === 'th' ? 'แขนกลประกอบ ROBOT_ARM' : 'Robotic Assembly Arm'}
                  </td>
                  <td className="py-3 px-3.5 font-bold">8.0s</td>
                  <td className="py-3 px-3.5">450 {lang === 'th' ? 'ชิ้น/ชม.' : 'units/hr'}</td>
                  <td className="py-3 px-3.5 text-emerald-400">± 1.0s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span>{t.analytics.thresholdsTitle}</span>
          </div>
          <div className="space-y-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 leading-relaxed shadow-sm">
              <span className="font-bold">{t.analytics.thresholdWorldClass}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 leading-relaxed shadow-sm">
              <span className="font-bold">{t.analytics.thresholdTypical}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 leading-relaxed shadow-sm">
              <span className="font-bold">{t.analytics.thresholdLow}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Clear OEE Data Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b101b] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.analytics.confirmClearOeeTitle}
                </h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {t.analytics.confirmClearOeeDesc}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] text-slate-300 space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Target Table:</span>
                <span className="text-emerald-400 font-mono font-semibold">hourly_production_summary</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Current OEE Records:</span>
                <span className="text-rose-400 font-mono font-bold">{oeeData.length} records</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Data Mart Action:</span>
                <span className="text-sky-400 font-mono font-semibold">
                  TRUNCATE & RESTART IDENTITY
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={clearing}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-sans font-medium transition-all cursor-pointer"
              >
                {t.common.close}
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={clearing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-sans font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{clearing ? (lang === 'th' ? 'กำลังล้าง...' : 'Clearing...') : t.analytics.btnConfirmClearOee}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
