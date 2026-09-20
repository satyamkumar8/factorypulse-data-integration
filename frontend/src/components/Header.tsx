import React, { useState } from 'react';
import { 
  Factory, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Play, 
  FileText,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { audioAlert } from '../utils/audioAlert';

interface HeaderProps {
  wsConnected: boolean;
  selectedLine: string;
  onSelectLine: (line: string) => void;
  onRefreshAll: () => void;
  onOpenLogs: () => void;
  onOpenBreakdown: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsConnected,
  selectedLine,
  onSelectLine,
  onRefreshAll,
  onOpenLogs,
  onOpenBreakdown,
}) => {
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
        setEtlMessage(`ETL Done: ${data.rows_affected} rows in ${data.duration_sec}s`);
        audioAlert.playAlarm('success');
        onRefreshAll();
      } else {
        setEtlMessage(`ETL Failed: ${data.detail || 'Error'}`);
        audioAlert.playAlarm('defect');
      }
    } catch (err) {
      setEtlMessage('ETL Request Failed');
    } finally {
      setEtlRunning(false);
      setTimeout(() => setEtlMessage(null), 5000);
    }
  };

  return (
    <header className="bg-industrial-900 border-b border-industrial-800 sticky top-0 z-30 px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Factory className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Real-Time Line Telemetry & OEE Monitor
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded">
                Production Ready
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5 font-mono">
              <span className="flex items-center gap-1.5">
                {wsConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Live Stream Active</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400">Reconnecting Stream...</span>
                  </>
                )}
              </span>
              <span className="text-slate-600">|</span>
              <span>Sub-second Push Architecture</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Line Filter */}
          <div className="flex items-center bg-industrial-950 p-1 rounded-lg border border-industrial-800 text-xs">
            <span className="px-2 text-slate-400 font-medium">Filter:</span>
            {['ALL', 'LINE_01', 'LINE_02'].map((line) => (
              <button
                key={line}
                onClick={() => onSelectLine(line)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition-all ${
                  selectedLine === line
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-industrial-800'
                }`}
              >
                {line}
              </button>
            ))}
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? "Mute Audio Alarms" : "Enable Audio Alarms"}
            className={`p-2 rounded-lg border transition-colors ${
              soundOn 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30' 
                : 'bg-industrial-950 border-industrial-800 text-slate-400 hover:text-white hover:bg-industrial-850'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* OEE Breakdown Modal Trigger */}
          <button
            onClick={onOpenBreakdown}
            title="View OEE Pillars (A/P/Q) Breakdown"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-industrial-950 hover:bg-industrial-850 text-slate-200 border border-industrial-800 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">A/P/Q Breakdown</span>
          </button>

          {/* Execution Logs Button */}
          <button
            onClick={onOpenLogs}
            title="View Pipeline Execution Logs"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-industrial-950 hover:bg-industrial-850 text-slate-200 border border-industrial-800 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">ETL Logs</span>
          </button>

          {/* Manual Batch ETL Trigger */}
          <button
            onClick={handleTriggerEtl}
            disabled={etlRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition-all"
          >
            {etlRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{etlRunning ? "Running ETL..." : "Trigger Batch ETL"}</span>
          </button>

          {/* Force Refresh */}
          <button
            onClick={onRefreshAll}
            title="Refresh All Data"
            className="p-2 rounded-lg bg-industrial-950 hover:bg-industrial-850 text-slate-400 hover:text-white border border-industrial-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification toast if ETL ran */}
      {etlMessage && (
        <div className="mt-2 text-xs font-mono px-3 py-1.5 rounded bg-industrial-950 border border-emerald-500/40 text-emerald-300 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {etlMessage}
          </span>
          <button onClick={() => setEtlMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
    </header>
  );
};
