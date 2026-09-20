import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  BarChart3, 
  ArrowRight, 
  Layers, 
  Gauge, 
  Terminal,
  Sparkles,
  Check,
  Copy,
  Cpu as CpuIcon,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { PageTab } from '../components/Navbar';
import { KPISummary } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HomePageProps {
  onNavigate?: (tab: PageTab) => void;
  kpi: KPISummary | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, kpi }) => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const goTo = (path: string, tab?: PageTab) => {
    if (onNavigate && tab) onNavigate(tab);
    navigate(path);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const terminalCommands = [
    {
      id: 'cmd-sim',
      title: lang === 'th' ? '1. รันเครื่องจำลองสัญญาณเซนเซอร์ PLC' : '1. Run PLC Edge Simulator',
      cmd: 'python simulator.py',
    },
    {
      id: 'cmd-stream',
      title: lang === 'th' ? '2. สตรีมมอนิเตอร์ตรวจจับความผิดปกติ' : '2. Stream Health & Anomaly Monitor',
      cmd: 'python stream_monitor.py',
    },
    {
      id: 'cmd-etl',
      title: lang === 'th' ? '3. ไปป์ไลน์คำนวณ OEE Batch ทันที' : '3. Hourly OEE Batch Aggregation',
      cmd: 'python batch_etl.py',
    },
    {
      id: 'cmd-rep',
      title: lang === 'th' ? '4. รายงานสรุป KPI ทาง Terminal' : '4. Terminal Executive KPI Report',
      cmd: 'python run_analysis.py',
    },
  ];

  return (
    <div className="space-y-12 lg:space-y-14 max-w-6xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* 1. 21st.dev Style Hero Section */}
      <section className="text-center space-y-5 pt-2 pb-2 relative">
        {/* Subtle Ambient Radial Aura behind headline */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 blur-[90px] pointer-events-none -z-10" />

        {/* Minimal pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-emerald-400 text-xs font-mono font-medium shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>{t.home.architectureBadge}</span>
        </div>

        {/* Main 21st.dev Style Heading with Italic Accent */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          {t.home.heroTitle} <br />
          <span className="italic font-serif font-normal bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent underline decoration-emerald-500/40 underline-offset-8">
            {t.home.heroSubtitleHighlight}
          </span>
        </h1>

        {/* Concise subtitle without clutter */}
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {t.home.heroDescription}
        </p>

        {/* Action Buttons with 21st.dev Shimmer CTA */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => goTo('/monitor', 'monitor')}
            className="animate-shimmer h-11 flex items-center gap-2 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            <span>{t.home.btnLaunchMonitor}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={() => goTo('/analytics', 'analytics')}
            className="h-11 flex items-center gap-2 px-6 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] text-white font-semibold text-sm border border-white/10 shadow-sm transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>{t.home.btnViewAnalytics}</span>
          </button>

          <button
            onClick={() => goTo('/operations', 'operations')}
            className="h-11 flex items-center gap-2 px-5 rounded-full bg-transparent hover:bg-white/[0.04] text-slate-400 hover:text-white text-sm border border-white/[0.06] transition-all cursor-pointer"
          >
            <CpuIcon className="w-4 h-4 text-slate-500" />
            <span>{t.home.btnManagePipeline}</span>
          </button>
        </div>

        {/* Tech Stack Pills Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs font-mono text-slate-400">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider">{lang === 'th' ? 'สถาปัตยกรรมหลัก:' : 'Core Stack:'}</span>
          {['FastAPI 0.115', 'React 18', 'PostgreSQL 15', 'WebSocket Stream', 'TailwindCSS'].map((tech) => (
            <span key={tech} className="px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-300 text-[11px]">
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* 2. Sleek Metrics Row (Uniform Grid Heights) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
        <div className="glass-panel p-5 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[125px] relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.home.statOeeTitle}</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-1">
            {kpi ? `${kpi.plant_oee_pct.toFixed(1)}%` : '81.6%'}
          </div>
          <p className="text-[11px] text-emerald-400/90 font-mono truncate">{t.home.statOeeSubtitle}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[125px] relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.home.statOutputTitle}</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-1">
            {kpi ? kpi.total_produced.toLocaleString() : '2,300+'}
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {t.home.statOutputSubtitle(kpi?.total_good || 2250, kpi?.total_defects || 50)}
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[125px] relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.home.statMachinesTitle}</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-1">
            6 {lang === 'th' ? 'เครื่อง' : 'Units'}
          </div>
          <p className="text-[11px] text-slate-400 truncate">{t.home.statMachinesSubtitle}</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[125px] relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t.home.statDbTitle}</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono tracking-tight my-1">
            Port 5432
          </div>
          <p className="text-[11px] text-cyan-400 font-mono truncate">{t.home.statDbSubtitle}</p>
        </div>
      </section>

      {/* 3. 21st.dev Component Feature Showcase Cards */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/[0.08] pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <span>{t.home.guideTitle}</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {t.home.guideSubtitle}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {/* Card 1: Edge Telemetry */}
          <div className="glass-panel p-6 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[205px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  STEP 01
                </span>
                <span className="text-xs font-mono text-slate-500">2000ms / Cycle</span>
              </div>
              <h3 className="text-base font-bold text-white">{t.home.step1Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.home.step1Desc}</p>
            </div>
            <div className="mt-4 p-2.5 rounded-xl bg-black/50 border border-white/[0.08] flex items-center justify-between font-mono text-xs">
              <code className="text-emerald-400">python simulator.py</code>
              <button 
                onClick={() => handleCopy('python simulator.py', 'sim-step')}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedId === 'sim-step' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Card 2: Live Monitor */}
          <div className="glass-panel p-6 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[205px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  STEP 02
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live WebSocket
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{t.home.step2Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.home.step2Desc}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => goTo('/monitor', 'monitor')}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1.5 group cursor-pointer"
              >
                <span>{t.home.btnLaunchMonitor}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: OEE Analytics */}
          <div className="glass-panel p-6 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[205px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  STEP 03
                </span>
                <span className="text-xs font-mono text-purple-300">Line • Bar • Matrix</span>
              </div>
              <h3 className="text-base font-bold text-white">{t.home.step3Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.home.step3Desc}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => goTo('/analytics', 'analytics')}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold inline-flex items-center gap-1.5 group cursor-pointer"
              >
                <span>{t.home.btnViewAnalytics}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 4: Operations */}
          <div className="glass-panel p-6 rounded-2xl card-hover-glow flex flex-col justify-between min-h-[205px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  STEP 04
                </span>
                <span className="text-xs font-mono text-slate-500">Postgres Upsert</span>
              </div>
              <h3 className="text-base font-bold text-white">{t.home.step4Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.home.step4Desc}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => goTo('/operations', 'operations')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 group cursor-pointer"
              >
                <span>{t.home.btnManagePipeline}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OEE Mathematical Principles (Concise Glass Cards) */}
      <section className="glass-panel rounded-2xl p-6 sm:p-7 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-purple-400" />
            <span>{t.home.oeeSectionTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.home.oeeSectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between min-h-[160px] space-y-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                {t.home.pillarAvailabilityTitle}
              </span>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1.5">
                {t.home.pillarAvailabilityFormula}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.home.pillarAvailabilityDesc}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between min-h-[160px] space-y-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                {t.home.pillarPerformanceTitle}
              </span>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1.5">
                {t.home.pillarPerformanceFormula}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.home.pillarPerformanceDesc}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col justify-between min-h-[160px] space-y-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                {t.home.pillarQualityTitle}
              </span>
              <div className="text-xs font-mono font-bold text-slate-200 mt-1.5">
                {t.home.pillarQualityFormula}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.home.pillarQualityDesc}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="font-semibold">{t.home.oeeFormulaSummary}</span>
          <span className="text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            {t.home.oeeBenchmarkNotice}
          </span>
        </div>
      </section>

      {/* 5. Terminal Runbook in 21st.dev Code Box Style */}
      <section className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4.5 h-4.5 text-emerald-400" />
            <span className="font-bold text-sm tracking-tight text-white">{t.home.runbookTitle}</span>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
            PowerShell / Bash
          </span>
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          {t.home.runbookSubtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-mono">
          {terminalCommands.map((c) => {
            const isCopied = copiedId === c.id;
            return (
              <div key={c.id} className="p-4 rounded-xl bg-black/60 border border-white/[0.08] flex flex-col justify-between min-h-[110px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">{c.title}</span>
                  <button
                    onClick={() => handleCopy(c.cmd, c.id)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? t.common.copied : t.common.copy}</span>
                  </button>
                </div>
                <div className="text-emerald-400 font-bold select-all bg-black/80 p-2 rounded-lg border border-white/[0.05]">
                  {c.cmd}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
