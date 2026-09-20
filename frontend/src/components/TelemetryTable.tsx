import React, { useState } from 'react';
import { 
  Radio, 
  Search, 
  Download,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { TelemetryEvent } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TelemetryTableProps {
  events: TelemetryEvent[];
  newEventIds: Set<number>;
  selectedLine: string;
  selectedMachineFilter: string | null;
  hoveredMachine: string | null;
  onHoverMachine: (machineKey: string | null) => void;
  onSelectMachine: (machineKey: string | null) => void;
  viewMode?: 'split' | 'table';
  onClearTelemetry?: () => Promise<boolean> | void;
}

const MACHINE_ACCENTS: Record<string, { tag: string; border: string }> = {
  CNC_A: { tag: 'text-sky-300 bg-sky-500/10 border-sky-500/30', border: 'border-sky-500/30' },
  CNC_B: { tag: 'text-pink-300 bg-pink-500/10 border-pink-500/30', border: 'border-pink-500/30' },
  ROBOT_ARM: { tag: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', border: 'border-emerald-500/30' },
};

export const TelemetryTable: React.FC<TelemetryTableProps> = ({
  events,
  newEventIds,
  selectedLine,
  selectedMachineFilter,
  hoveredMachine,
  onHoverMachine,
  onSelectMachine,
  viewMode = 'split',
  onClearTelemetry,
}) => {
  const { t, lang } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(viewMode === 'split' ? 25 : 10);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [clearToast, setClearToast] = useState<string | null>(null);

  const handleClearFeed = async () => {
    try {
      setClearing(true);
      if (onClearTelemetry) {
        await onClearTelemetry();
      } else {
        await fetch('/api/telemetry', { method: 'DELETE' });
      }
      setClearToast(t.monitor.clearTelemetrySuccess);
      setIsClearModalOpen(false);
    } catch {
      // ignore
    } finally {
      setClearing(false);
      setTimeout(() => setClearToast(null), 4000);
    }
  };

  const getLocalizedStatusName = (statusCode: number, fallbackName: string) => {
    switch (statusCode) {
      case 1: return t.common.statusNormal;
      case 2: return t.common.statusMaintenance;
      case 3: return t.common.statusJam;
      case 4: return t.common.statusFault;
      case 5: return t.common.statusNoMaterial;
      default: return fallbackName;
    }
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (selectedLine !== 'ALL' && e.line_id !== selectedLine) return false;
    if (selectedMachineFilter && `${e.line_id}_${e.machine_id}` !== selectedMachineFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = String(e.event_id).includes(term);
      const matchMachine = e.machine_id.toLowerCase().includes(term);
      const matchStatus = e.status_name.toLowerCase().includes(term);
      if (!matchId && !matchMachine && !matchStatus) return false;
    }
    return true;
  }).slice(0, displayLimit);

  const getStatusBadge = (category: string, name: string) => {
    if (category === 'Unplanned Downtime') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
          ● {name}
        </span>
      );
    }
    if (category === 'Planned Maintenance') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          ● {name}
        </span>
      );
    }
    if (category === 'Idle') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
          ● {name}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        ● {name}
      </span>
    );
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const exportCSV = () => {
    if (events.length === 0) return;
    const headers = ["event_id", "timestamp", "line_id", "machine_id", "status_name", "category", "good_units", "defect_units", "cycle_time_sec"];
    const rows = events.map(e => [
      e.event_id,
      e.timestamp,
      e.line_id,
      e.machine_id,
      `"${e.status_name}"`,
      `"${e.category}"`,
      e.good_units,
      e.defect_units,
      e.cycle_time_sec
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `telemetry_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col h-full shadow-xl">
      {/* Stream Terminal Header Controls */}
      <div className={`flex ${viewMode === 'split' ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-center justify-between gap-2.5'} mb-3.5 pb-3 border-b border-white/[0.08]`}>
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {viewMode === 'split' ? (lang === 'th' ? 'สตรีมข้อมูลดิบสด (Live Stream)' : 'Live Telemetry Stream') : t.monitor.tableTitle}
              </h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {filteredEvents.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              {viewMode === 'split' ? (lang === 'th' ? 'สตรีมย้อนหลังแบบ Sub-second' : 'Real-time WebSocket event feed') : t.monitor.tableSubtitle}
            </p>
          </div>
        </div>

        {/* Search, Limit & Export Toolbar */}
        <div className={`flex items-center gap-2 ${viewMode === 'split' ? 'w-full justify-between' : 'flex-wrap sm:flex-nowrap'}`}>
          <div className={`relative ${viewMode === 'split' ? 'flex-1 min-w-[100px]' : ''}`}>
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t.monitor.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`bg-black/50 border border-white/10 rounded-full pl-8 pr-7 h-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 ${
                viewMode === 'split' ? 'w-full' : 'w-32 sm:w-40'
              } transition-all`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
            className="bg-black/50 border border-white/10 rounded-full px-2.5 h-8 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500/60 cursor-pointer flex-shrink-0"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

          <button
            onClick={exportCSV}
            title={lang === 'th' ? "ส่งออกเป็น CSV" : "Export CSV"}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsClearModalOpen(true)}
            disabled={events.length === 0}
            title={t.monitor.btnClearTelemetry}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 text-xs font-sans font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)] flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className={viewMode === 'split' ? "hidden xl:inline" : "hidden sm:inline"}>{t.monitor.btnClearTelemetry}</span>
          </button>
        </div>
      </div>

      {/* Clear Toast Banner */}
      {clearToast && (
        <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <span>{clearToast}</span>
          <button onClick={() => setClearToast(null)} className="font-bold opacity-70 hover:opacity-100 px-1">✕</button>
        </div>
      )}

      {/* Active Filter Indicator */}
      {selectedMachineFilter && (
        <div className="mb-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono">
          <span className="text-emerald-300 font-medium">
            {t.monitor.showingRows(selectedMachineFilter)}
          </span>
          <button
            onClick={() => onSelectMachine(null)}
            className="text-emerald-400 hover:text-white font-bold cursor-pointer"
          >
            ✕ {lang === 'th' ? 'ล้างตัวกรอง' : 'Clear'}
          </button>
        </div>
      )}

      {/* Display Mode Switch: Split Stream View vs Full Table View */}
      {viewMode === 'split' ? (
        /* Split View: Real-Time Scrolling Card Stream */
        <div className="flex-1 overflow-y-auto max-h-[560px] space-y-2 pr-1 divide-y divide-white/[0.04]">
          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
              <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
              <p className="text-slate-400 font-medium">
                {events.length === 0 
                  ? (lang === 'th' ? 'ข้อมูลจำลองถูกล้างเรียบร้อยแล้ว' : 'Simulated telemetry cleared')
                  : t.monitor.noEvents}
              </p>
              <p className="text-[11px] text-slate-600 max-w-[260px]">
                {events.length === 0
                  ? (lang === 'th' ? 'เปิดรัน python simulator.py เพื่อเริ่มรับสัญญาณจำลองใหม่จาก ID #1' : 'Run python simulator.py to stream fresh events from ID #1')
                  : ''}
              </p>
            </div>
          ) : (
            filteredEvents.map((e, index) => {
              const machineKey = `${e.line_id}_${e.machine_id}`;
              const isNew = newEventIds.has(e.event_id);
              const hasDefect = e.defect_units > 0;
              const isJam = e.category === 'Unplanned Downtime';
              const isHovered = hoveredMachine === machineKey;
              const localizedStatus = getLocalizedStatusName(e.status_code, e.status_name);

              const accent = MACHINE_ACCENTS[e.machine_id] || {
                tag: 'text-slate-300 bg-white/5 border-white/10',
                border: 'border-white/10'
              };

              return (
                <div
                  key={e.event_id}
                  onMouseEnter={() => onHoverMachine(machineKey)}
                  onMouseLeave={() => onHoverMachine(null)}
                  onClick={() => onSelectMachine(selectedMachineFilter === machineKey ? null : machineKey)}
                  className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs font-mono space-y-1.5 ${
                    isNew 
                      ? (isJam ? 'bg-red-950/50 border-red-500/60 ring-1 ring-red-400' : 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-400') 
                      : isHovered 
                      ? 'bg-white/[0.08] border-sky-400/50' 
                      : 'bg-black/40 border-white/[0.06] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Event Top: ID, Time, Machine Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {index === 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                      <span className="font-bold text-slate-200">#{e.event_id}</span>
                      <span className="text-[10px] text-slate-500">{formatTimestamp(e.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">{e.line_id}</span>
                      <span className={`px-2 py-0.2 rounded-md border text-[10px] font-bold ${accent.tag}`}>
                        {e.machine_id}
                      </span>
                    </div>
                  </div>

                  {/* Event Bottom: Status, Output, Cycle */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                    <div>{getStatusBadge(e.category, localizedStatus)}</div>
                    <div className="flex items-center gap-2.5 text-[11px]">
                      <span className="text-emerald-400 font-bold">+{e.good_units}</span>
                      {hasDefect && (
                        <span className="text-red-400 font-bold">-{e.defect_units}</span>
                      )}
                      <span className="text-slate-400">{e.cycle_time_sec.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Full Table Mode: Traditional Wide Table View */
        <div className="overflow-x-auto flex-1 border border-white/[0.08] rounded-xl bg-black/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-slate-400 text-xs font-mono uppercase tracking-wider border-b border-white/[0.08]">
                <th className="py-3 px-3.5">{t.monitor.colEventId}</th>
                <th className="py-3 px-3.5">{t.monitor.colTime}</th>
                <th className="py-3 px-3.5">{t.monitor.colLine}</th>
                <th className="py-3 px-3.5">{t.monitor.colMachine}</th>
                <th className="py-3 px-3.5">{t.monitor.colStatus}</th>
                <th className="py-3 px-3.5 text-right">{t.monitor.colGood}</th>
                <th className="py-3 px-3.5 text-right">{t.monitor.colDefect}</th>
                <th className="py-3 px-3.5 text-right">{t.monitor.colCycle}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500 font-mono text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
                      <p className="text-slate-400 font-medium">
                        {events.length === 0 
                          ? (lang === 'th' ? 'ข้อมูลจำลองถูกล้างเรียบร้อยแล้ว' : 'Simulated telemetry has been cleared')
                          : t.monitor.noEvents}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {events.length === 0
                          ? (lang === 'th' ? 'เปิดรัน python simulator.py เพื่อเริ่มรับสัญญาณจำลองรอบใหม่จาก Event ID #1' : 'Run python simulator.py to stream fresh events starting from ID #1')
                          : ''}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e, index) => {
                  const machineKey = `${e.line_id}_${e.machine_id}`;
                  const isNew = newEventIds.has(e.event_id);
                  const hasDefect = e.defect_units > 0;
                  const isJam = e.category === 'Unplanned Downtime';
                  const isHovered = hoveredMachine === machineKey;
                  const isDimmed = hoveredMachine && !isHovered;
                  const localizedStatus = getLocalizedStatusName(e.status_code, e.status_name);

                  const accent = MACHINE_ACCENTS[e.machine_id] || {
                    tag: 'text-slate-300 bg-white/5 border-white/10',
                    border: 'border-white/10'
                  };

                  return (
                    <tr
                      key={e.event_id}
                      onMouseEnter={() => onHoverMachine(machineKey)}
                      onMouseLeave={() => onHoverMachine(null)}
                      onClick={() => onSelectMachine(selectedMachineFilter === machineKey ? null : machineKey)}
                      className={`cursor-pointer transition-all duration-150 ${
                        isNew 
                          ? (isJam ? 'bg-red-500/25 ring-1 ring-red-500' : 'bg-emerald-500/20 ring-1 ring-emerald-400') 
                          : isHovered 
                          ? 'bg-white/[0.08] ring-1 ring-sky-400/50' 
                          : 'hover:bg-white/[0.03]'
                      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                    >
                      <td className="py-3 px-3.5 font-semibold text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {index === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          )}
                          <span>#{e.event_id}</span>
                          {index === 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              {t.monitor.newBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400">
                        {formatTimestamp(e.timestamp)}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-300">
                        {e.line_id}
                      </td>
                      <td className="py-3 px-3.5 font-bold">
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold ${accent.tag}`}>
                          {e.machine_id}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        {getStatusBadge(e.category, localizedStatus)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-400 font-bold">
                        {e.good_units}
                      </td>
                      <td className={`py-3 px-3.5 text-right font-bold ${
                        hasDefect ? 'text-red-400' : 'text-slate-600'
                      }`}>
                        {e.defect_units}
                      </td>
                      <td className="py-3 px-3.5 text-right text-slate-300 font-semibold">
                        {e.cycle_time_sec.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stream Footer Sync Status */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>{t.monitor.showingCount(filteredEvents.length, events.length)}</span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
          {t.monitor.wsSyncedNotice}
        </span>
      </div>

      {/* Confirmation Modal for Clearing Simulated Telemetry */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0c121e] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.monitor.confirmClearTelemetryTitle}
                </h3>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  {t.monitor.confirmClearTelemetryDesc}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] text-slate-300 space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Target Table:</span>
                <span className="text-emerald-400 font-mono font-semibold">machine_telemetry</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Current Events:</span>
                <span className="text-rose-400 font-mono font-bold">{events.length} records</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Sequence Action:</span>
                <span className="text-sky-400 font-mono font-semibold">
                  {lang === 'th' ? 'RESTART IDENTITY (เริ่มใหม่ที่ ID #1)' : 'RESTART IDENTITY (Reset to ID #1)'}
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
                onClick={handleClearFeed}
                disabled={clearing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-sans font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{clearing ? (lang === 'th' ? 'กำลังล้าง...' : 'Clearing...') : t.monitor.btnConfirmClearTelemetry}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
