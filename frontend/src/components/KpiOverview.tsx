import React from 'react';
import { 
  Gauge, 
  Layers, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Radio
} from 'lucide-react';
import { KPISummary } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface KpiOverviewProps {
  kpi: KPISummary | null;
}

export const KpiOverview: React.FC<KpiOverviewProps> = ({ kpi }) => {
  const { t, lang } = useLanguage();
  if (!kpi) return null;

  const rawScope = kpi.scope && kpi.scope !== 'ALL LINES' ? kpi.scope : 'ALL LINES';
  const scopeLabel = rawScope === 'ALL LINES' && lang === 'th' ? 'ทุกสาย (ALL)' : rawScope;
  const isFiltered = rawScope !== 'ALL LINES';

  const formatSec = (sec: number) => {
    if (sec >= 3600) {
      return `${(sec / 3600).toFixed(1)} ${lang === 'th' ? 'ชม.' : 'hrs'}`;
    } else if (sec >= 60) {
      return `${(sec / 60).toFixed(1)} ${lang === 'th' ? 'นาที' : 'mins'}`;
    }
    return `${sec.toFixed(0)}s`;
  };

  const oeeColor =
    kpi.plant_oee_pct >= 85
      ? 'text-emerald-400'
      : kpi.plant_oee_pct >= 60
      ? 'text-amber-400'
      : 'text-red-400';

  const oeeBadgeBg =
    kpi.plant_oee_pct >= 85
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : kpi.plant_oee_pct >= 60
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-red-500/15 text-red-300 border-red-500/30';
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. OEE Index Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.03] group-hover:bg-emerald-500/[0.08] rounded-full blur-2xl pointer-events-none transition-all" />
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-400">
            {isFiltered ? `${rawScope} OEE` : t.monitor.kpiOeeTitle}
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Gauge className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2.5 flex items-baseline justify-between gap-2">
          <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${oeeColor}`}>
            {kpi.plant_oee_pct.toFixed(1)}%
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${oeeBadgeBg}`}>
            {kpi.plant_oee_pct >= 85 ? 'World Class' : kpi.plant_oee_pct >= 60 ? 'Typical' : 'Needs Attn'}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
            <span>Target: 85.0%</span>
            <span>{kpi.plant_oee_pct >= 85 ? '✓ On Target' : 'Benchmark 85%'}</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                kpi.plant_oee_pct >= 85 ? 'bg-emerald-400' : kpi.plant_oee_pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, kpi.plant_oee_pct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Total Output Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 hover:border-sky-500/30 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/[0.03] group-hover:bg-sky-500/[0.08] rounded-full blur-2xl pointer-events-none transition-all" />
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-400">
            {isFiltered ? `${rawScope} Output` : t.monitor.kpiOutputTitle}
          </span>
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2.5 flex items-baseline justify-between gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
            {kpi.total_produced.toLocaleString()}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {kpi.total_good.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.05]">
          <span>{t.monitor.kpiUnitsProduced}</span>
          <span className="text-emerald-400 font-semibold">
            {kpi.total_produced > 0 ? `${((kpi.total_good / kpi.total_produced) * 100).toFixed(1)}% Good` : '100%'}
          </span>
        </div>
      </div>

      {/* 3. Scrap Rate Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 hover:border-red-500/30 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.03] group-hover:bg-red-500/[0.08] rounded-full blur-2xl pointer-events-none transition-all" />
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-400">
            {isFiltered ? `${rawScope} Scrap` : t.monitor.kpiScrapTitle}
          </span>
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2.5 flex items-baseline justify-between gap-2">
          <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
            kpi.defect_rate_pct > 2 ? 'text-red-400' : 'text-amber-400'
          }`}>
            {kpi.defect_rate_pct.toFixed(2)}%
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-300 border border-red-500/30">
            {kpi.total_defects} {lang === 'th' ? 'ชิ้นเสีย' : 'defects'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.05]">
          <span>{t.monitor.kpiThresholdScrap}</span>
          <span className={kpi.defect_rate_pct <= 2 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
            {kpi.defect_rate_pct <= 2 ? '✓ Within Limit' : '⚠ Exceeded'}
          </span>
        </div>
      </div>

      {/* 4. Lost Downtime Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 hover:border-amber-500/30 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.03] group-hover:bg-amber-500/[0.08] rounded-full blur-2xl pointer-events-none transition-all" />
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-400">
            {isFiltered ? `${rawScope} Downtime` : t.monitor.kpiLostTimeTitle}
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2.5 flex items-baseline justify-between gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-amber-300">
            {formatSec(kpi.unplanned_downtime_sec)}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Unplanned
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.05]">
          <span>{t.monitor.kpiStoppageDuration}</span>
          <span className="text-slate-400">Recorded</span>
        </div>
      </div>

      {/* 5. Fleet Health Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#0c121e]/80 hover:border-teal-500/30 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/[0.03] group-hover:bg-teal-500/[0.08] rounded-full blur-2xl pointer-events-none transition-all" />
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="uppercase tracking-wider font-semibold text-[11px] text-slate-400 truncate">
              {t.monitor.kpiHealthTitle}
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/[0.06] text-slate-400 font-mono">
              {scopeLabel}
            </span>
          </div>
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
            kpi.breakdown_machines_count > 0 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2.5 flex items-baseline justify-between gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
            {kpi.active_machines_count - kpi.breakdown_machines_count}
            <span className="text-slate-500 text-lg font-normal">/{kpi.active_machines_count}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            {t.monitor.kpiActiveLabel}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.05]">
          {kpi.breakdown_machines_count > 0 ? (
            <span className="text-red-400 font-semibold animate-pulse">
              {t.monitor.kpiDownCount(kpi.breakdown_machines_count)}
            </span>
          ) : (
            <span className="text-emerald-400 font-medium">
              {t.monitor.kpiAllOperating}
            </span>
          )}
          <span className="text-slate-400">Shopfloor</span>
        </div>
      </div>
    </div>
  );
};
