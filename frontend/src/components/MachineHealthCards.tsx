import React from 'react';
import { MachineHealth } from '../types';

type MachineHealthCardsProps = {
  machines: MachineHealth[];
  selectedMachineFilter: string | null;
  onSelectMachine: (machineId: string | null) => void;
  activeUpdateKeys: Set<string>;
  hoveredMachine: string | null;
  onHoverMachine: (machineKey: string | null) => void;
  columns?: 2 | 3;
};

export const MachineHealthCards: React.FC<MachineHealthCardsProps> = ({
  machines,
  selectedMachineFilter,
  onSelectMachine,
  activeUpdateKeys,
  hoveredMachine,
  onHoverMachine,
  columns = 3,
}) => {
  // Simplified: display a list of machines with basic status
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {machines.map((m) => {
        const machineKey = `${m.line_id}_${m.machine_id}`;
        const isSelected = selectedMachineFilter === machineKey;
        const isHovered = hoveredMachine === machineKey;
        const isUpdated = activeUpdateKeys.has(machineKey);
        const status = m.category;
        const badgeColor = status === 'Unplanned Downtime' ? 'bg-red-500/20 text-red-600' : 'bg-emerald-500/20 text-emerald-600';
        return (
          <div
            key={machineKey}
            onClick={() => onSelectMachine(isSelected ? null : machineKey)}
            onMouseEnter={() => onHoverMachine(machineKey)}
            onMouseLeave={() => onHoverMachine(null)}
            className={`p-3 rounded-xl border ${isSelected ? 'border-emerald-400' : 'border-white/10'} ${isHovered ? 'ring-1 ring-sky-400' : ''} ${isUpdated ? 'ring-2 ring-emerald-400' : ''}`}
          >
            <div className="font-semibold text-white">{m.machine_id}</div>
            <div className="text-sm text-slate-400">{m.line_id}</div>
            <div className={`mt-2 px-2 py-1 text-xs rounded ${badgeColor}`}>Status: {status}</div>
            <div className="mt-1 text-xs text-slate-500">Cycle: {m.cycle_time_sec}s</div>
          </div>
        );
      })}
    </div>
  );
};

export default MachineHealthCards;
