import React from 'react';
import { KPISummary } from '../types';

interface KpiOverviewProps {
  kpi: KPISummary | null;
}

export const KpiOverview: React.FC<KpiOverviewProps> = ({ kpi }) => {
  if (!kpi) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="text-slate-400 text-xs font-medium mb-1">Plant OEE</div>
        <div className="text-2xl font-bold font-mono text-white">{kpi.plant_oee_pct.toFixed(1)}%</div>
        <p className="text-[11px] text-slate-400 font-mono mt-1">Benchmark: 85.0% Target</p>
      </div>
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="text-slate-400 text-xs font-medium mb-1">Total Units Produced</div>
        <div className="text-2xl font-bold font-mono text-white">{kpi.total_produced.toLocaleString()}</div>
        <p className="text-[11px] text-slate-400 font-mono mt-1">
          {kpi.total_good.toLocaleString()} Good · {kpi.total_defects.toLocaleString()} Scrap
        </p>
      </div>
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="text-slate-400 text-xs font-medium mb-1">Monitored Assets</div>
        <div className="text-2xl font-bold font-mono text-white">{kpi.active_machines_count} Machines</div>
        <p className="text-[11px] text-slate-400 font-mono mt-1">Line 01 & Line 02</p>
      </div>
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="text-slate-400 text-xs font-medium mb-1">Data Storage</div>
        <div className="text-2xl font-bold font-mono text-white">PostgreSQL 15</div>
        <p className="text-[11px] text-slate-400 font-mono mt-1">Analytical Data Mart</p>
      </div>
    </div>
  );
};

export default KpiOverview;
