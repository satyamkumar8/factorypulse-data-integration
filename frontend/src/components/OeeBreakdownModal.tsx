import React from 'react';
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
import { X, SlidersHorizontal, Info } from 'lucide-react';
import { HourlyOEE } from '../types';

interface OeeBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  oeeData: HourlyOEE[];
}

export const OeeBreakdownModal: React.FC<OeeBreakdownModalProps> = ({
  isOpen,
  onClose,
  oeeData,
}) => {
  if (!isOpen) return null;

  // Get the latest hour record for each machine
  const latestByMachine: Record<string, HourlyOEE> = {};
  oeeData.forEach((row) => {
    const key = `${row.line_id}_${row.machine_id}`;
    if (!latestByMachine[key] || new Date(row.hour_bucket) > new Date(latestByMachine[key].hour_bucket)) {
      latestByMachine[key] = row;
    }
  });

  const chartData = Object.values(latestByMachine).map((m) => ({
    name: `${m.line_id} ${m.machine_id}`,
    Availability: m.availability_pct,
    Performance: m.performance_pct,
    Quality: m.quality_pct,
    OEE: m.oee_pct,
    produced: m.total_produced_units,
    good: m.total_good_units,
    defects: m.total_defect_units,
    downtime: m.unplanned_downtime_sec
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-industrial-800 flex items-center justify-between bg-industrial-950">
          <div className="flex items-center space-x-2.5">
            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                OEE Pillar Breakdown Analysis (A / P / Q)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Comparative evaluation of Availability, Performance, and Quality across machines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-industrial-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Information box */}
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Mathematical Principles: </span>
              Availability measures lost production time due to unplanned breakdowns. 
              Performance measures production speed relative to ideal cycle time. 
              Quality measures the proportion of good units without defects.
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  angle={-15} 
                  textAnchor="end" 
                  interval={0}
                />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = chartData.find(d => d.name === label);
                    return (
                      <div className="bg-industrial-950 border border-industrial-700 rounded-lg p-3 text-xs font-mono shadow-xl">
                        <p className="font-bold text-white border-b border-industrial-800 pb-1 mb-2">{label}</p>
                        <div className="space-y-1">
                          {payload.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between gap-4" style={{ color: p.color }}>
                              <span>{p.name}:</span>
                              <span className="font-bold">{Number(p.value).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                        {item && (
                          <div className="mt-2 pt-2 border-t border-industrial-800 text-[11px] text-slate-400 space-y-0.5">
                            <div>Produced: {item.produced} units (Good: {item.good}, Defect: {item.defects})</div>
                            <div>Unplanned Downtime: {item.downtime}s</div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                <Bar dataKey="Availability" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Performance" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Quality" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OEE" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Machine Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {chartData.map((m) => (
              <div key={m.name} className="p-3 rounded-lg border border-industrial-800 bg-industrial-950 text-xs font-mono">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-industrial-850">
                  <span className="font-bold text-white">{m.name}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                    m.OEE >= 85 ? 'bg-emerald-500/20 text-emerald-300' : m.OEE >= 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    OEE {m.OEE.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Availability:</span>
                    <span className="font-semibold text-sky-400">{m.Availability.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Performance:</span>
                    <span className="font-semibold text-purple-400">{m.Performance.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quality:</span>
                    <span className="font-semibold text-emerald-400">{m.Quality.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-industrial-800 bg-industrial-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
