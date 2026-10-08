import React, { useState } from 'react';
import { TelemetryEvent } from '../types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(viewMode === 'split' ? 25 : 10);

  // Simple filter without localization
  const filteredEvents = events
    .filter((e) => {
      if (selectedLine !== 'ALL' && e.line_id !== selectedLine) return false;
      if (selectedMachineFilter && `${e.line_id}_${e.machine_id}` !== selectedMachineFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          String(e.event_id).includes(term) ||
          e.machine_id.toLowerCase().includes(term) ||
          e.status_name.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .slice(0, displayLimit);

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
    const headers = ['event_id', 'timestamp', 'line_id', 'machine_id', 'status_name', 'category', 'good_units', 'defect_units', 'cycle_time_sec'];
    const rows = events.map((e) =>
      [e.event_id, e.timestamp, e.line_id, e.machine_id, `"${e.status_name}"`, `"${e.category}"`, e.good_units, e.defect_units, e.cycle_time_sec].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telemetry_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 bg-[#0c121e] rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-lg font-bold">Telemetry Table</h3>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 rounded bg-black/30 text-sm text-white"
          />
          <select
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
            className="px-2 py-1 rounded bg-black/30 text-sm text-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button onClick={exportCSV} className="px-2 py-1 rounded bg-emerald-500/20 text-white text-sm">
            Export CSV
          </button>
          {onClearTelemetry && (
            <button
              onClick={async () => {
                await onClearTelemetry();
              }}
              className="px-2 py-1 rounded bg-rose-500/20 text-white text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="bg-white/5">
          <tr>
            <th className="p-2">ID</th>
            <th className="p-2">Time</th>
            <th className="p-2">Line</th>
            <th className="p-2">Machine</th>
            <th className="p-2">Status</th>
            <th className="p-2 text-right">Good</th>
            <th className="p-2 text-right">Defect</th>
            <th className="p-2 text-right">Cycle (s)</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvents.map((e) => (
            <tr key={e.event_id} className="border-b border-white/10 hover:bg-white/5 cursor-pointer">
              <td className="p-2">#{e.event_id}</td>
              <td className="p-2">{formatTimestamp(e.timestamp)}</td>
              <td className="p-2">{e.line_id}</td>
              <td className="p-2">{e.machine_id}</td>
              <td className="p-2">{e.status_name}</td>
              <td className="p-2 text-right">+{e.good_units}</td>
              <td className="p-2 text-right">-{e.defect_units}</td>
              <td className="p-2 text-right">{e.cycle_time_sec.toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TelemetryTable;
