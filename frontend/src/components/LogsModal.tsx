import React, { useEffect, useState } from 'react';
import { X, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ExecutionLog } from '../types';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs?limit=15');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-industrial-900 border border-industrial-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-industrial-800 flex items-center justify-between bg-industrial-950">
          <div className="flex items-center space-x-2.5">
            <FileText className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Batch ETL Pipeline Execution Logs
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Audit trail from database table `pipeline_execution_logs`
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-industrial-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 italic">
              No execution logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <div
                  key={log.log_id}
                  className="p-3 rounded-lg border border-industrial-800 bg-industrial-950 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      #{log.log_id} - {log.pipeline_name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {log.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px]">
                    <span>Start: {new Date(log.start_time).toLocaleString()}</span>
                    {log.end_time && <span>End: {new Date(log.end_time).toLocaleTimeString()}</span>}
                    <span className="text-emerald-400 font-semibold">
                      Rows Upserted: {log.rows_processed}
                    </span>
                  </div>
                  {log.error_message && (
                    <div className="mt-1 p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] overflow-x-auto">
                      {log.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-industrial-800 bg-industrial-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
