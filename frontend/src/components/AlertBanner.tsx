import React from 'react';
import { AlertOctagon, X } from 'lucide-react';
import { MachineHealth } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface AlertBannerProps {
  machines: MachineHealth[];
  onDismiss: () => void;
  isDismissed: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  machines,
  onDismiss,
  isDismissed,
}) => {
  const { t } = useLanguage();
  if (isDismissed) return null;

  const breakdowns = machines.filter((m) => m.category === 'Unplanned Downtime');
  const defectAlerts = machines.filter((m) => m.defect_units > 0);

  if (breakdowns.length === 0 && defectAlerts.length === 0) return null;

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

  return (
    <div className="bg-red-950/40 border border-red-500/40 px-4.5 py-3 rounded-2xl shadow-[0_0_25px_rgba(239,68,68,0.15)] backdrop-blur-xl animate-pulse-fast">
      <div className="flex items-center justify-between gap-3 max-w-[1750px] mx-auto text-xs font-mono">
        <div className="flex items-center space-x-3 overflow-hidden">
          <AlertOctagon className="w-4.5 h-4.5 text-red-400 flex-shrink-0 animate-bounce" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold uppercase tracking-wider text-red-400">
              {t.monitor.alertCriticalHeader}
            </span>
            {breakdowns.map((b) => (
              <span key={`${b.line_id}_${b.machine_id}`} className="text-red-300 font-semibold flex items-center gap-1">
                {t.monitor.alertDowntimeItem(b.line_id, b.machine_id, getLocalizedStatusName(b.status_code, b.status_name), b.cycle_time_sec)}
              </span>
            ))}
            {defectAlerts.map((d) => (
              <span key={`def_${d.line_id}_${d.machine_id}`} className="text-amber-300 font-semibold flex items-center gap-1">
                {t.monitor.alertDefectItem(d.line_id, d.machine_id, d.defect_units)}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-white p-1.5 rounded-lg hover:bg-red-900/50 flex-shrink-0 transition-colors cursor-pointer"
          title={t.monitor.dismissAlert}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
