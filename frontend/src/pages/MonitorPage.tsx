import React, { useState } from 'react';
import { LayoutGrid, SplitSquareVertical, Table2 } from 'lucide-react';
import { AlertBanner } from '../components/AlertBanner';
import { KpiOverview } from '../components/KpiOverview';
import { MachineHealthCards } from '../components/MachineHealthCards';
import { TelemetryTable } from '../components/TelemetryTable';
import { MachineHealth, TelemetryEvent, KPISummary } from '../types';
import { useLanguage } from '../context/LanguageContext';

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
  const { lang } = useLanguage();
  const [viewMode, setViewMode] = useState<'matrix' | 'split' | 'table'>('matrix');

  const filteredMachines = machines.filter(
    (m) => selectedLine === 'ALL' || m.line_id === selectedLine
  );

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {/* 1. Spacious Executive KPI Glass Metric Cards */}
      <KpiOverview kpi={kpi} />

      {/* 2. Alert Banner for shopfloor incidents (if any) */}
      <AlertBanner
        machines={machines}
        isDismissed={isAlertDismissed}
        onDismiss={onDismissAlert}
      />

      {/* 3. Single Unified Command Toolbar (No Subheader Soup!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        {/* Left: Operational Title + Unit count + Filter chip */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-base font-bold tracking-tight text-white font-mono">
              {lang === 'th' ? 'ศูนย์ติดตามสถานะเครื่องจักร (Shopfloor Fleet)' : 'Shopfloor Fleet Matrix'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.06] text-slate-400 border border-white/[0.08]">
              {filteredMachines.length} {lang === 'th' ? 'เครื่องจักร' : 'Units'}
            </span>
          </div>

          <span className="text-slate-600 hidden md:inline">•</span>

          {/* Scope Indicator */}
          <span className="text-xs font-mono text-slate-400 hidden md:inline">
            {selectedLine === 'ALL' ? (lang === 'th' ? 'ทุกสายการผลิต' : 'All Production Lines') : selectedLine}
          </span>

          {/* Integrated Active Filter Chip */}
          {selectedMachineFilter && (
            <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium animate-fadeIn">
              <span>{lang === 'th' ? 'กรองเฉพาะ:' : 'Filter:'} <strong>{selectedMachineFilter}</strong></span>
              <button
                onClick={() => onSelectMachine(null)}
                className="w-4 h-4 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                title="Clear Filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Right: Modern 3-Way View Switcher */}
        <div className="flex items-center bg-white/[0.04] p-0.5 rounded-full border border-white/10 text-xs font-mono h-8.5">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'matrix'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'มุมมองกว้าง (Studio)' : 'Fleet Studio'}</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'แยก 2 ฝั่ง (Split)' : 'Split Rail'}</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white/15 text-white font-bold border border-white/20 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ตารางเต็ม (Table)' : 'Data Table'}</span>
          </button>
        </div>
      </div>

      {/* 4. Core Workspace Area by View Mode */}
      {viewMode === 'matrix' && (
        /* Fleet Studio Mode: Full Width Spacious Cards (~440px) + Live Telemetry Dock */
        <div className="space-y-7">
          <MachineHealthCards
            machines={filteredMachines}
            selectedMachineFilter={selectedMachineFilter}
            onSelectMachine={onSelectMachine}
            activeUpdateKeys={activeUpdateKeys}
            hoveredMachine={hoveredMachine}
            onHoverMachine={onHoverMachine}
            columns={3}
          />

          <div className="pt-2">
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
          </div>
        </div>
      )}

      {viewMode === 'split' && (
        /* Balanced Split Rail Mode: Left 7 cols (2-cols cards) + Right 5 cols (Stream Feed) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <MachineHealthCards
              machines={filteredMachines}
              selectedMachineFilter={selectedMachineFilter}
              onSelectMachine={onSelectMachine}
              activeUpdateKeys={activeUpdateKeys}
              hoveredMachine={hoveredMachine}
              onHoverMachine={onHoverMachine}
              columns={2}
            />
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-16">
            <TelemetryTable
              events={events}
              newEventIds={newEventIds}
              selectedLine={selectedLine}
              selectedMachineFilter={selectedMachineFilter}
              hoveredMachine={hoveredMachine}
              onHoverMachine={onHoverMachine}
              onSelectMachine={onSelectMachine}
              viewMode="split"
              onClearTelemetry={onClearTelemetry}
            />
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        /* Full Data Table Explorer Mode */
        <div className="space-y-6">
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
        </div>
      )}
    </div>
  );
};
