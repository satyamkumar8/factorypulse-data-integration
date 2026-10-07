import React from 'react';
import { AlertBanner } from '../components/AlertBanner';
import { KpiOverview } from '../components/KpiOverview';
import { MachineHealthCards } from '../components/MachineHealthCards';
import { TelemetryTable } from '../components/TelemetryTable';
import { MachineHealth, TelemetryEvent, KPISummary } from '../types';

interface MonitorPageProps {
  machines: MachineHealth[];
  events: TelemetryEvent[];
  newEventIds: Set<number>;
  activeUpdateKeys: Set<string>;
  hoveredMachine: string | null;
  onHoverMachine: (machineKey: string | null) => void;
  selectedMachineFilter: string | null;
  onSelectMachine: (machineId: string | null) => void;
  selectedLine: string;
  kpi: KPISummary | null;
  isAlertDismissed: boolean;
  onDismissAlert: () => void;
  onClearTelemetry?: () => Promise<boolean> | void;
}

export const MonitorPage: React.FC<MonitorPageProps> = ({
  machines,
  events,
  newEventIds,
  activeUpdateKeys,
  hoveredMachine,
  onHoverMachine,
  selectedMachineFilter,
  onSelectMachine,
  selectedLine,
  kpi,
  isAlertDismissed,
  onDismissAlert,
  onClearTelemetry,
}) => {
  const filteredMachines = machines.filter(
    (m) => selectedLine === 'ALL' || m.line_id === selectedLine
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. Manufacturing KPI Summary Cards */}
      <KpiOverview kpi={kpi} />

      {/* 2. Operational Alerts Banner */}
      <AlertBanner
        machines={machines}
        isDismissed={isAlertDismissed}
        onDismiss={onDismissAlert}
      />

      {/* 3. Shopfloor Equipment Status Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
              Equipment Health Status
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-slate-400 border border-white/[0.08]">
              {filteredMachines.length} Units
            </span>
          </div>

          {selectedMachineFilter && (
            <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <span>Filtered: <strong>{selectedMachineFilter}</strong></span>
              <button
                onClick={() => onSelectMachine(null)}
                className="w-4 h-4 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 flex items-center justify-center text-[10px] cursor-pointer"
                title="Clear Filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <MachineHealthCards
          machines={filteredMachines}
          selectedMachineFilter={selectedMachineFilter}
          onSelectMachine={onSelectMachine}
          activeUpdateKeys={activeUpdateKeys}
          hoveredMachine={hoveredMachine}
          onHoverMachine={onHoverMachine}
          columns={3}
        />
      </section>

      {/* 4. Live Telemetry Events Stream */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
          <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
            Recent Telemetry Stream
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            WebSocket Ingested Events
          </span>
        </div>

        <TelemetryTable
          events={events}
          newEventIds={newEventIds}
          selectedLine={selectedLine}
          selectedMachineFilter={selectedMachineFilter}
          hoveredMachine={hoveredMachine}
          onHoverMachine={onHoverMachine}
          onSelectMachine={onSelectMachine}
          viewMode="table"
          onClearTelemetry={onClearTelemetry}
        />
      </section>
    </div>
  );
};

export default MonitorPage;
