// Simplified OeeTrendChart component - English only, no language context
import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  LayoutGrid,
  BarChart2,
  Grid3X3,
  Filter,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { HourlyOEE } from '../types';

interface OeeTrendChartProps {
  oeeData: HourlyOEE[];
  selectedLine: string;
}

// Static English strings formerly provided by translation context
const t = {
  analytics: {
    lineAverage: 'Line Avg',
    chartTitle: 'OEE Trend',
    chartSubtitle: 'Hourly OEE Metrics',
    viewLine: 'Line',
    viewSplit: 'Split',
    viewBar: 'Bar',
    viewMatrix: 'Matrix',
    isolateFilter: 'Filter',
    showAllLines: (count: number) => `Show all (${count})`,
    isolateSoloMode: 'Solo',
    cardLatest: 'Latest',
    cardAvg: 'Avg',
    cardMin: 'Min',
    cardMax: 'Max',
    noData: 'No data',
    noDataSub: 'No OEE data available',
    metricOee: 'OEE',
    metricAvailability: 'Availability',
    metricPerformance: 'Performance',
    metricQuality: 'Quality',
    target85Line: 'Target 85%',
    viewSplitDesc: 'Split view shows each machine separately'
  },
  home: {
    oeeBenchmarkNotice: 'Benchmark notice'
  }
};

// Distinct, high-contrast industrial neon palette for dark theme
const SERIES_CONFIG: Record<string, { color: string; dash: string; label: string; shortLabel: string }> = {
  'LINE_01 | CNC_A': { color: '#38bdf8', dash: '0', label: 'L1 CNC_A (Sky)', shortLabel: 'L1 CNC_A' },
  'LINE_01 | CNC_B': { color: '#f472b6', dash: '0', label: 'L1 CNC_B (Pink)', shortLabel: 'L1 CNC_B' },
  'LINE_01 | ROBOT_ARM': { color: '#34d399', dash: '0', label: 'L1 Robot (Emerald)', shortLabel: 'L1 Robot' },
  'LINE_02 | CNC_A': { color: '#fbbf24', dash: '4 4', label: 'L2 CNC_A (Amber)', shortLabel: 'L2 CNC_A' },
  'LINE_02 | CNC_B': { color: '#c084fc', dash: '4 4', label: 'L2 CNC_B (Purple)', shortLabel: 'L2 CNC_B' },
  'LINE_02 | ROBOT_ARM': { color: '#22d3ee', dash: '4 4', label: 'L2 Robot (Cyan)', shortLabel: 'L2 Robot' },
  'CNC_A': { color: '#38bdf8', dash: '0', label: 'CNC_A', shortLabel: 'CNC_A' },
  'CNC_B': { color: '#f472b6', dash: '0', label: 'CNC_B', shortLabel: 'CNC_B' },
  'ROBOT_ARM': { color: '#34d399', dash: '0', label: 'ROBOT_ARM', shortLabel: 'Robot' }
};

const FALLBACK_PALETTE = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#c084fc', '#22d3ee', '#818cf8'];

export const OeeTrendChart: React.FC<OeeTrendChartProps> = ({ oeeData, selectedLine }) => {
  const [activeMetric, setActiveMetric] = useState<'oee_pct' | 'availability_pct' | 'performance_pct' | 'quality_pct'>('oee_pct');
  const [chartType, setChartType] = useState<'line' | 'split' | 'bar'>('line');
  const [machineTypeFilter, setMachineTypeFilter] = useState('ALL');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [soloSeries, setSoloSeries] = useState<string | null>(null);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const chartData = useMemo(() => {
    const filtered = oeeData.filter(d => {
      if (selectedLine !== 'ALL' && d.line_id !== selectedLine) return false;
      if (machineTypeFilter !== 'ALL' && d.machine_id !== machineTypeFilter) return false;
      return true;
    });
    const bucketsMap: Record<string, any> = {};
    const seriesSet = new Set<string>();
    filtered.forEach(d => {
      const timeStr = d.hour_bucket.replace('T', ' ').slice(5, 16);
      if (!bucketsMap[timeStr]) {
        bucketsMap[timeStr] = { time: timeStr, rawHour: d.hour_bucket, totalMetric: 0, count: 0 };
      }
      const key = selectedLine === 'ALL' ? `${d.line_id} | ${d.machine_id}` : d.machine_id;
      seriesSet.add(key);
      const val = d[activeMetric];
      bucketsMap[timeStr][key] = val;
      bucketsMap[timeStr].totalMetric += val;
      bucketsMap[timeStr].count += 1;
    });
    const avgLabel = t.analytics.lineAverage;
    const result = Object.values(bucketsMap)
      .sort((a, b) => new Date(a.rawHour).getTime() - new Date(b.rawHour).getTime())
      .map(item => {
        const avg = item.count > 0 ? Number((item.totalMetric / item.count).toFixed(1)) : 0;
        return { ...item, [avgLabel]: avg };
      });
    return { data: result, series: Array.from(seriesSet).sort(), rawFiltered: filtered, avgKey: avgLabel };
  }, [oeeData, selectedLine, machineTypeFilter, activeMetric]);

  const allAvailableSeries = useMemo(() => {
    const set = new Set<string>();
    oeeData.forEach(d => {
      if (selectedLine !== 'ALL' && d.line_id !== selectedLine) return;
      if (machineTypeFilter !== 'ALL' && d.machine_id !== machineTypeFilter) return;
      const key = selectedLine === 'ALL' ? `${d.line_id} | ${d.machine_id}` : d.machine_id;
      set.add(key);
    });
    return Array.from(set).sort();
  }, [oeeData, selectedLine, machineTypeFilter]);

  const splitCardsData = useMemo(() => {
    const filtered = oeeData.filter(d => {
      if (selectedLine !== 'ALL' && d.line_id !== selectedLine) return false;
      if (machineTypeFilter !== 'ALL' && d.machine_id !== machineTypeFilter) return false;
      return true;
    });
    const map: Record<string, { key: string; line_id: string; machine_id: string; points: Array<{ time: string; rawHour: string; value: number; raw: HourlyOEE }> }> = {};
    filtered.forEach(d => {
      const key = selectedLine === 'ALL' ? `${d.line_id} | ${d.machine_id}` : d.machine_id;
      const timeStr = d.hour_bucket.replace('T', ' ').slice(5, 16);
      if (!map[key]) {
        map[key] = { key, line_id: d.line_id, machine_id: d.machine_id, points: [] };
      }
      map[key].points.push({ time: timeStr, rawHour: d.hour_bucket, value: Number(d[activeMetric].toFixed(1)), raw: d });
    });
    return Object.values(map)
      .map(card => {
        const sorted = card.points.sort((a, b) => new Date(a.rawHour).getTime() - new Date(b.rawHour).getTime());
        const values = sorted.map(p => p.value);
        const latestVal = values.length ? values[values.length - 1] : 0;
        const firstVal = values.length ? values[0] : 0;
        const trendDelta = Number((latestVal - firstVal).toFixed(1));
        const avgVal = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;
        const minVal = values.length ? Math.min(...values) : 0;
        const maxVal = values.length ? Math.max(...values) : 0;
        const conf = SERIES_CONFIG[card.key] || { color: '#38bdf8', dash: '0', label: card.key, shortLabel: card.key };
        return { ...card, points: sorted, latestVal, avgVal, minVal, maxVal, trendDelta, conf };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [oeeData, selectedLine, machineTypeFilter, activeMetric]);

  const metricTitles: Record<string, string> = {
    oee_pct: t.analytics.metricOee,
    availability_pct: t.analytics.metricAvailability,
    performance_pct: t.analytics.metricPerformance,
    quality_pct: t.analytics.metricQuality
  };

  const matrixData = useMemo(() => {
    if (chartType !== 'matrix') return null;
    const hours = Array.from(new Set(chartData.rawFiltered.map(d => d.hour_bucket.replace('T', ' ').slice(5, 16)))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const machines = Array.from(new Set(chartData.rawFiltered.map(d => selectedLine === 'ALL' ? `${d.line_id} | ${d.machine_id}` : d.machine_id)));
    const lookup: Record<string, Record<string, number>> = {};
    chartData.rawFiltered.forEach(d => {
      const key = selectedLine === 'ALL' ? `${d.line_id} | ${d.machine_id}` : d.machine_id;
      const h = d.hour_bucket.replace('T', ' ').slice(5, 16);
      if (!lookup[key]) lookup[key] = {};
      lookup[key][h] = d[activeMetric];
    });
    return { hours, machines, lookup };
  }, [chartData.rawFiltered, chartType, selectedLine, activeMetric]);

  const getCellColor = (val?: number) => {
    if (val === undefined) return 'bg-white/[0.02] text-slate-600';
    if (val >= 85) return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)] font-bold';
    if (val >= 60) return 'bg-amber-950/60 border-amber-500/30 text-amber-300 font-semibold';
    return 'bg-red-950/60 border-red-500/40 text-red-300 font-bold';
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col h-full shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
            {chartType === 'split' ? <LayoutGrid className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">{t.analytics.chartTitle}</h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {metricTitles[activeMetric]}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">{t.analytics.chartSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/10 text-xs font-mono h-8">
            <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${chartType === 'line' ? 'bg-white/15 text-white font-bold border border-white/20' : 'text-slate-400 hover:text-white'}`} title="Combined Line View">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.analytics.viewLine}</span>
            </button>
            <button onClick={() => setChartType('split')} className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${chartType === 'split' ? 'bg-purple-500/30 text-purple-200 font-bold border border-purple-500/40 shadow-xs' : 'text-slate-400 hover:text-white'}`} title="Split Grid View (Zero Overlap)">
              <LayoutGrid className="w-3.5 h-3.5 text-purple-300" />
              <span>{t.analytics.viewSplit}</span>
            </button>
            <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${chartType === 'bar' ? 'bg-white/15 text-white font-bold border border-white/20' : 'text-slate-400 hover:text-white'}`}>
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.analytics.viewBar}</span>
            </button>
          </div>
          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/10 text-xs font-mono h-8">
            {(['oee_pct', 'availability_pct', 'performance_pct', 'quality_pct'] as const).map(m => (
              <button key={m} onClick={() => setActiveMetric(m)} className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${activeMetric === m ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs' : 'text-slate-400 hover:text-white'}`}>
                {m === 'oee_pct' ? 'OEE' : m === 'availability_pct' ? 'A' : m === 'performance_pct' ? 'P' : 'Q'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 mb-3.5 pb-3 border-b border-white/[0.06] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 flex items-center gap-1 text-[11px]"><Filter className="w-3 h-3 text-slate-500" />{t.analytics.isolateFilter}</span>
          {['ALL', 'CNC_A', 'CNC_B', 'ROBOT_ARM'].map(type => (
            <button key={type} onClick={() => { setMachineTypeFilter(type); setSoloSeries(null); }} className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${machineTypeFilter === type ? 'bg-white/15 text-white font-bold border border-white/20' : 'bg-white/[0.02] text-slate-400 hover:text-white border border-white/[0.06]'}`}>
              {type}
            </button>
          ))}
          {hiddenSeries.size > 0 && (
            <button onClick={() => setHiddenSeries(new Set())} className="text-[11px] text-purple-400 hover:underline ml-auto font-medium cursor-pointer">
              {t.analytics.showAllLines(hiddenSeries.size)}
            </button>
          )}
        </div>
        {chartType !== 'matrix' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 mr-1"><Layers className="w-3 h-3 text-purple-400" />{t.analytics.isolateSoloMode}</span>
            <button onClick={() => setSoloSeries(null)} className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${soloSeries === null ? 'bg-purple-500/25 text-purple-200 font-bold border border-purple-500/40 shadow-xs' : 'bg-white/[0.02] text-slate-400 hover:text-white border border-white/[0.06]'}`}>Show All</button>
            {chartType !== 'split' && (
              <button onClick={() => setSoloSeries(soloSeries === chartData.avgKey ? null : chartData.avgKey)} onMouseEnter={() => setHoveredSeries(chartData.avgKey)} onMouseLeave={() => setHoveredSeries(null)} className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${soloSeries === chartData.avgKey ? 'bg-white/30 text-white font-bold border border-white/40 shadow-xs' : 'bg-white/[0.02] text-slate-300 hover:text-white border border-white/[0.06]'}`}>
                <span className="w-2 h-2 rounded-full bg-white inline-block shadow-sm" /> <span>{chartData.avgKey}</span> {soloSeries === chartData.avgKey && <span className="text-[10px] opacity-75">✕</span>}
              </button>
            )}
            {allAvailableSeries.map(seriesKey => {
              const conf = SERIES_CONFIG[seriesKey] || { color: '#38bdf8', label: seriesKey, shortLabel: seriesKey };
              const isSolo = soloSeries === seriesKey;
              return (
                <button key={seriesKey} onClick={() => setSoloSeries(isSolo ? null : seriesKey)} onMouseEnter={() => setHoveredSeries(seriesKey)} onMouseLeave={() => setHoveredSeries(null)} className={`px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${isSolo ? 'text-white font-bold shadow-md border' : 'bg-white/[0.02] text-slate-300 hover:text-white border border-white/[0.06]'}`} style={{ borderColor: isSolo ? conf.color : undefined, backgroundColor: isSolo ? `${conf.color}30` : undefined }}>
                  <span className="w-2 h-2 rounded-full inline-block shadow-sm" style={{ backgroundColor: conf.color }} />
                  <span>{conf.shortLabel || seriesKey}</span>
                  {isSolo && <span className="text-[10px] ml-0.5 font-bold">✕</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {chartType === 'line' && chartData.data.length === 1 && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Only 1 hourly OEE bucket available, showing single point markers. Line charts require 2+ hours to connect lines.</span>
          </div>
          <button onClick={() => setChartType('bar')} className="px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto">Switch to Bar →</button>
        </div>
      )}
      <div className={chartType === 'split' ? 'w-full' : 'w-full h-[380px] sm:h-[420px] relative'}>
        {chartData.data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-sans py-16">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 text-slate-500">
              <BarChart2 className="w-6 h-6 opacity-70" />
            </div>
            <p className="font-bold text-slate-200 text-sm">{t.analytics.noData}</p>
            <p className="text-xs text-slate-400 mt-1">{t.analytics.noDataSub}</p>
          </div>
        ) : chartType === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {splitCardsData.filter(card => !soloSeries || soloSeries === card.key).map(card => {
              const isAboveTarget = card.latestVal >= 85;
              const isMidTarget = card.latestVal >= 60;
              const badgeColor = isAboveTarget ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : isMidTarget ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-red-500/15 border-red-500/30 text-red-300';
              const gradId = `grad-${card.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
              return (
                <div key={card.key} className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-white/20 transition-all shadow-lg flex flex-col justify-between group" style={{ boxShadow: `0 4px 20px -4px ${card.conf.color}15` }}>
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shadow-[0_0_8px_currentColor]" style={{ backgroundColor: card.conf.color, color: card.conf.color }} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-white tracking-wide">{card.machine_id}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/10">{card.line_id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400">{t.analytics.cardLatest}:</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${badgeColor}`}>{card.latestVal.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-2 px-2 py-1.5 rounded-xl bg-black/30 border border-white/[0.04] text-[11px] font-mono text-slate-400">
                    <div><span className="text-slate-500 text-[10px] block">{t.analytics.cardAvg}</span><span className="font-semibold text-slate-200">{card.avgVal.toFixed(1)}%</span></div>
                    <div><span className="text-slate-500 text-[10px] block">{t.analytics.cardMin} / {t.analytics.cardMax}</span><span className="font-semibold text-slate-300">{card.minVal.toFixed(0)}% - {card.maxVal.toFixed(0)}%</span></div>
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">Trend</span>
                      <span className={`font-semibold flex items-center justify-end gap-0.5 ${card.trendDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {card.trendDelta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.trendDelta >= 0 ? `+${card.trendDelta}` : `${card.trendDelta}`}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-[145px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={card.points} margin={{ top: 8, right: 6, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={card.conf.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={card.conf.color} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" strokeOpacity={0.3} vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} tickFormatter={(v) => `${v}%`} tickLine={false} />
                    <ReferenceLine y={85} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.6} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0];
                      return (<div className="bg-[#0c121e]/95 border border-white/15 rounded-lg p-2 shadow-xl text-[11px] font-mono text-slate-200"><p className="text-slate-400 text-[10px]">{label}</p><p className="font-bold text-white flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: card.conf.color }} /><span>{metricTitles[activeMetric]}: {Number(pt.value).toFixed(1)}%</span></p></div>);
                    }} />
                    <Area type="monotone" dataKey="value" stroke={card.conf.color} strokeWidth={2.2} fill={`url(#${gradId})`} dot={{ r: 2.5, fill: card.conf.color, strokeWidth: 1 }} activeDot={{ r: 5, fill: '#ffffff', stroke: card.conf.color }} isAnimationActive={false} />
                  </AreaChart></ResponsiveContainer></div>
                  <div className="mt-3 flex items-center justify-end gap-3 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> ≥ 85% (World Class)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> 60 - 84% (Typical)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> &lt; 60% (Low)</span>
                  </div>
                </div>
              );
            })}
          </div>) : chartType === 'bar' ? (
        
  
        
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.data} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val}%`} tickLine={false} />
            <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 85%", fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              return (<div className="bg-[#0c121e]/95 border border-white/15 rounded-xl p-3 shadow-2xl text-xs font-mono text-slate-200"><p className="font-bold text-white border-b border-white/10 pb-1 mb-2">{label}</p><div className="space-y-1">{payload.map((item: any, idx: number) => (<div key={idx} className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5" style={{ color: item.color }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}:</span><span className="font-bold text-white">{Number(item.value).toFixed(1)}%</span></div>))}</div></div>);
            }} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', cursor: 'pointer' }} onClick={e => toggleSeries(String(e.dataKey))} />
            {chartData.series.filter(s => (!soloSeries || soloSeries === s) && !hiddenSeries.has(s)).map((seriesKey, idx) => {
              const conf = SERIES_CONFIG[seriesKey] || { color: FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length] };
              const isHovered = hoveredSeries === seriesKey;
              const isDimmed = hoveredSeries !== null && !isHovered;
              return <Bar key={seriesKey} dataKey={seriesKey} name={seriesKey} fill={conf.color} fillOpacity={isDimmed ? 0.15 : 1.0} radius={[3, 3, 0, 0]} />;
            })}
          </BarChart></ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData.data} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(val) => `${val}%`} tickLine={false} />
            <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 85%", fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              return (<div className="bg-[#0c121e]/95 border border-white/15 rounded-xl p-3 shadow-2xl text-xs font-mono text-slate-200"><p className="font-bold text-white border-b border-white/10 pb-1.5 mb-2">{label}</p><div className="space-y-1.5">{payload.map((item: any, idx: number) => {
                const isAvg = item.name === chartData.avgKey;
                return (<div key={idx} className={`flex items-center justify-between gap-4 ${isAvg ? 'pt-1 border-t border-white/10 font-bold' : ''}`}><span className="flex items-center gap-1.5" style={{ color: item.color }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />{item.name}:</span><span className="font-bold text-white">{Number(item.value).toFixed(1)}%</span></div>);
              })}</div></div>);
            }} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono', cursor: 'pointer' }} onClick={e => toggleSeries(String(e.dataKey))} />
            {(!soloSeries || soloSeries === chartData.avgKey) && !hiddenSeries.has(chartData.avgKey) && (
              <Line type="monotone" dataKey={chartData.avgKey} name={chartData.avgKey} stroke="#ffffff" strokeWidth={hoveredSeries === chartData.avgKey ? 3.8 : 2.5} strokeOpacity={hoveredSeries && hoveredSeries !== chartData.avgKey ? 0.15 : 1.0} dot={{ r: 3.5, strokeWidth: 1.5, fill: '#ffffff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
            )}
            {chartData.series.filter(s => (!soloSeries || soloSeries === s) && !hiddenSeries.has(s)).map((seriesKey, idx) => {
              const conf = SERIES_CONFIG[seriesKey] || { color: FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length], dash: '0' };
              const isHovered = hoveredSeries === seriesKey;
              const isDimmed = hoveredSeries !== null && !isHovered;
              return <Line key={seriesKey} type="monotone" dataKey={seriesKey} name={seriesKey} stroke={conf.color} strokeDasharray={conf.dash} strokeWidth={isHovered ? 3.8 : 2} strokeOpacity={isDimmed ? 0.15 : 1.0} dot={{ r: 3, strokeWidth: 1, fill: conf.color }} activeDot={{ r: 6 }} isAnimationActive={false} />;
            })}
          </LineChart></ResponsiveContainer>
        )}
      </div>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-500 border-t border-white/[0.06] pt-2.5">
        <span>{t.analytics.viewSplitDesc}</span>
        <span className="text-emerald-400 font-medium">{t.home.oeeBenchmarkNotice}</span>
      </div>
    </div>
  );
};
