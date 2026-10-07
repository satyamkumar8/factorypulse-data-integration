import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  BarChart3, 
  ArrowRight, 
  Layers, 
  Gauge, 
  Database,
  Workflow,
  Cpu
} from 'lucide-react';
import { KPISummary } from '../types';

interface HomePageProps {
  kpi: KPISummary | null;
}

export const HomePage: React.FC<HomePageProps> = ({ kpi }) => {
  const navigate = useNavigate();

  const pipelineSteps = [
    {
      step: '01',
      title: 'Telemetry Ingestion',
      subtitle: 'Edge Machine Signals',
      description: 'Ingests physical sensor telemetry (vibration, bearing temperature, motor current, cycle times, defect counts) from CNCs, robotic arms, and stamping presses.',
      tech: 'Python / Real-time Stream'
    },
    {
      step: '02',
      title: 'Data Quality & ETL',
      subtitle: 'Validation & Transformation',
      description: 'Applies automated data validation gates to detect corrupted records and computes hourly OEE metrics (Availability, Performance, Quality).',
      tech: 'Python ETL / Pandas'
    },
    {
      step: '03',
      title: 'PostgreSQL Data Mart',
      subtitle: 'Dimensional Storage',
      description: 'Persists structured dimension tables and hourly production summaries with idempotent upsert logic and audit execution logs.',
      tech: 'PostgreSQL 15'
    },
    {
      step: '04',
      title: 'Analytics & Insights',
      subtitle: 'Decision Intelligence',
      description: 'Delivers operational intelligence through SQL analytics (CTEs, Window Functions, Pareto), Apache Superset, and real-time operations interfaces.',
      tech: 'FastAPI / Superset / React'
    }
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* 1. Header Section */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              FactoryPulse Operations Platform
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Manufacturing data integration and operations intelligence system ingesting physical edge telemetry, validating data quality, and computing Overall Equipment Effectiveness (OEE).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/monitor')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span>OEE Analytics</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Plant High-Level Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Plant OEE</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {kpi ? `${kpi.plant_oee_pct.toFixed(1)}%` : '81.6%'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Benchmark: 85.0% Target</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Units Produced</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {kpi ? kpi.total_produced.toLocaleString() : '2,300+'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            {kpi ? `${kpi.total_good.toLocaleString()} Good · ${kpi.total_defects.toLocaleString()} Scrap` : 'Good vs Defect units'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Monitored Assets</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            6 Machines
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Line 01 & Line 02</p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Data Storage</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            PostgreSQL 15
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Analytical Data Mart</p>
        </div>
      </section>

      {/* 3. End-to-End Data Pipeline Architecture */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
          <Workflow className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            End-to-End Data Pipeline Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineSteps.map((item) => (
            <div 
              key={item.step}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Step {item.step}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{item.tech}</span>
                </div>
                <h3 className="text-sm font-bold text-white pt-1">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Core Modules Navigation Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div 
          onClick={() => navigate('/monitor')}
          className="p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/40 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Live Operations Monitor
                </h3>
                <p className="text-xs text-slate-400">Shopfloor telemetry and equipment status</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time machine health cards, sensor telemetry values, and anomaly alert notifications across all production lines.
          </p>
        </div>

        <div 
          onClick={() => navigate('/analytics')}
          className="p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-purple-500/40 transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                  OEE Analytics & Insights
                </h3>
                <p className="text-xs text-slate-400">Historical performance and trend analysis</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Detailed 3-Pillars OEE breakdown (Availability, Performance, Quality), hourly trend lines, and machine scorecards.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
