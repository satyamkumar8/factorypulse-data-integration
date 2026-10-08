import React from 'react';
import { useNavigate } from 'react-router-dom';
import { KPISummary } from '../types';

interface HomePageProps {
  kpi: KPISummary | null;
}

export const HomePage: React.FC<HomePageProps> = ({ kpi }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="border-b border-white/[0.08] pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          FactoryPulse Operations Platform
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Manufacturing data integration and operations intelligence system ingesting edge telemetry,
          validating data quality, and computing Overall Equipment Effectiveness (OEE).
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/monitor')}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
          >
            Live Monitor
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-sm transition-all"
          >
            OEE Analytics
          </button>
        </div>
      </section>

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-slate-400 text-xs font-medium mb-1">Plant OEE</div>
          <div className="text-2xl font-bold font-mono text-white">
            {kpi ? `${kpi.plant_oee_pct.toFixed(1)}%` : '81.6%'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Benchmark: 85.0% Target</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-slate-400 text-xs font-medium mb-1">Total Units Produced</div>
          <div className="text-2xl font-bold font-mono text-white">
            {kpi ? kpi.total_produced.toLocaleString() : '2,300+'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            {kpi ? `${kpi.total_good.toLocaleString()} Good · ${kpi.total_defects.toLocaleString()} Scrap` : 'Good vs Defect units'}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-slate-400 text-xs font-medium mb-1">Monitored Assets</div>
          <div className="text-2xl font-bold font-mono text-white">6 Machines</div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Line 01 & Line 02</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <div className="text-slate-400 text-xs font-medium mb-1">Data Storage</div>
          <div className="text-2xl font-bold font-mono text-white">PostgreSQL 15</div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Analytical Data Mart</p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
