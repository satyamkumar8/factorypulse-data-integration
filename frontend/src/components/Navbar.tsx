import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { 
  Factory, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ArrowRight,
  Home,
  Activity,
  BarChart3,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { audioAlert } from '../utils/audioAlert';
import { useLanguage } from '../context/LanguageContext';

export type PageTab = 'home' | 'monitor' | 'analytics' | 'operations';

interface NavbarProps {
  currentTab?: PageTab;
  onSelectTab?: (tab: PageTab) => void;
  wsConnected: boolean;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefreshAll: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  wsConnected,
  selectedLine,
  onSelectLine,
  onRefreshAll,
}) => {
  const { lang, setLang, t } = useLanguage();
  const [soundOn, setSoundOn] = useState(false);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlMessage, setEtlMessage] = useState<string | null>(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audioAlert.setSoundEnabled(next);
    if (next) {
      audioAlert.playAlarm('success');
    }
  };

  const handleTriggerEtl = async () => {
    try {
      setEtlRunning(true);
      setEtlMessage(null);
      const res = await fetch('/api/etl/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEtlMessage(t.nav.etlSuccessToast(data.rows_affected, data.duration_sec));
        audioAlert.playAlarm('success');
        onRefreshAll();
      } else {
        setEtlMessage(data.detail ? `${t.nav.etlErrorToast}: ${data.detail}` : t.nav.etlErrorToast);
        audioAlert.playAlarm('defect');
      }
    } catch {
      setEtlMessage(t.nav.etlErrorToast);
    } finally {
      setEtlRunning(false);
      setTimeout(() => setEtlMessage(null), 5000);
    }
  };

  const navItems = [
    { path: '/', label: t.nav.tabHome, icon: Home, end: true },
    { path: '/monitor', label: t.nav.tabMonitor, icon: Activity },
    { path: '/analytics', label: t.nav.tabAnalytics, icon: BarChart3 },
    { path: '/operations', label: t.nav.tabOperations, icon: Cpu },
  ];

  return (
    <header className="bg-[#050811]/85 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-2.5 transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1750px] mx-auto">
        {/* Brand Logo & Pill Navigation */}
        <div className="flex items-center space-x-5 lg:space-x-6">
          <Link 
            to="/"
            className="flex items-center space-x-3 cursor-pointer group select-none flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 group-hover:border-emerald-500/60 transition-all duration-200">
              <Factory className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white tracking-tight text-base lg:text-lg">
                FactoryPulse
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30">
                {t.nav.brandTag}
              </span>
            </div>
          </Link>

          {/* Desktop Rounded Pill Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.08] text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold shadow-xs border border-white/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Action Controls & Shimmer CTA (Organized Clusters) */}
        <div className="flex flex-wrap items-center justify-end gap-2 lg:gap-2.5">
          {/* Mobile Nav Tabs */}
          <div className="flex md:hidden items-center space-x-1 w-full overflow-x-auto pb-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap flex items-center justify-center gap-1 transition-all ${
                      isActive ? 'bg-white/15 text-white font-semibold' : 'text-slate-400'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-3 h-3 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Cluster 1: Bilingual Switcher & Line Filter */}
          <div className="flex items-center gap-1.5">
            {/* Minimalist Bilingual Toggle */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/[0.08] text-xs h-8">
              <button
                onClick={() => setLang('th')}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                  lang === 'th'
                    ? 'bg-white/15 text-emerald-400 font-bold border border-white/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>TH</span>
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white/15 text-emerald-400 font-bold border border-white/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>EN</span>
              </button>
            </div>

            {/* Line Filter Pill */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/[0.08] text-xs h-8">
              <span className="px-2 text-slate-500 text-[11px] hidden sm:inline">{t.nav.lineFilter}</span>
              {['ALL', 'LINE_01', 'LINE_02'].map((line) => (
                <button
                  key={line}
                  onClick={() => onSelectLine(line)}
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition-all duration-150 cursor-pointer ${
                    selectedLine === line
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {line === 'ALL' && lang === 'th' ? 'ALL' : line}
                </button>
              ))}
            </div>
          </div>

          {/* Cluster 2: Status Beacon & Quick Utilities */}
          <div className="flex items-center gap-1.5">
            {/* WebSocket Status Beacon */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono h-8">
              {wsConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-emerald-400 font-semibold">{t.nav.liveBeacon}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">{t.nav.connectingBeacon}</span>
                </>
              )}
            </div>

            {/* Audio Alarm Toggle */}
            <button
              onClick={toggleSound}
              title={soundOn ? t.nav.muteSound : t.nav.enableSound}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-150 cursor-pointer ${
                soundOn 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Refresh All Button */}
            <button
              onClick={onRefreshAll}
              title={t.nav.refreshAll}
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cluster 3: Primary Action CTA */}
          <button
            onClick={handleTriggerEtl}
            disabled={etlRunning}
            className="animate-shimmer h-8 flex items-center gap-1.5 px-4 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-200 cursor-pointer flex-shrink-0"
          >
            {etlRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>{t.nav.runEtl}</span>
            )}
            {!etlRunning && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {etlMessage && (
        <div className="mt-2.5 text-xs font-mono px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-xl animate-fadeIn max-w-[1750px] mx-auto">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {etlMessage}
          </span>
          <button onClick={() => setEtlMessage(null)} className="text-emerald-400 hover:text-white font-bold px-1.5 cursor-pointer">✕</button>
        </div>
      )}
    </header>
  );
};
