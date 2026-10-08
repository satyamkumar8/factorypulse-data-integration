import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ExecutionLog } from '../types';
import { audioAlert } from '../utils/audioAlert';

export const OperationsPage: React.FC = () => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlResult, setEtlResult] = useState<{ message: string; success: boolean } | null>(null);
  const [resetResult, setResetResult] = useState<{ message: string; success: boolean } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs?limit=25');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTriggerEtl = async () => {
    try {
      setEtlRunning(true);
      setEtlResult(null);
      const res = await fetch('/api/etl/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEtlResult({
          message: `ETL succeeded: ${data.rows_affected} rows in ${data.duration_sec}s`,
          success: true,
        });
        audioAlert.playAlarm('success');
        fetchLogs();
      } else {
        setEtlResult({
          message: data.detail ? `ETL error: ${data.detail}` : 'ETL error',
          success: false,
        });
        audioAlert.playAlarm('defect');
      }
    } catch {
      setEtlResult({ message: 'ETL execution failed', success: false });
    } finally {
      setEtlRunning(false);
    }
  };

  const handleResetLogs = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setResetResult({ message: 'Logs reset successfully', success: true });
        audioAlert.playAlarm('success');
        setIsResetModalOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setResetResult({ message: data.detail || 'Failed to reset logs', success: false });
        audioAlert.playAlarm('defect');
      }
    } catch {
      setResetResult({ message: 'Failed to reset logs', success: false });
      audioAlert.playAlarm('defect');
    } finally {
      setResetting(false);
      setTimeout(() => setResetResult(null), 6000);
    }
  };

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto px-4 lg:px-8 py-6 pb-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <span>Operations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
            Manage ETL pipeline and view execution logs
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
            title="Refresh logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={logs.length === 0 && !loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-mono font-semibold transition-all disabled:opacity-40 cursor-pointer"
            title="Clear and reset execution audit logs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Logs</span>
          </button>
        </div>
      </div>

      {/* ETL Trigger and DB Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* ETL Trigger */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Run ETL Pipeline</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Trigger the batch ETL to process telemetry and generate OEE summaries.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTriggerEtl}
                disabled={etlRunning}
                className="animate-shimmer h-10 flex items-center justify-center gap-2 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                {etlRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{etlRunning ? 'Running ETL...' : 'Run ETL'}</span>
              </button>
            </div>
          </div>

          {/* ETL Result */}
          {etlResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
                etlResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {etlResult.success ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
                )}
                <span>{etlResult.message}</span>
              </div>
              <button onClick={() => setEtlResult(null)} className="font-bold opacity-60 hover:opacity-100 px-1.5 cursor-pointer">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* DB Status */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-3.5">
          <div className="flex items-center space-x-2.5 text-white font-bold text-sm">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>PostgreSQL 15 (Data Mart)</span>
          </div>
          <div className="space-y-2.5 text-xs font-mono my-auto py-1">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">DB Name</span>
              <span className="font-bold text-slate-200">mfg_warehouse</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">Port</span>
              <span className="font-bold text-slate-200">localhost:5432</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">Tables</span>
              <span className="font-bold text-slate-200">3 Tables</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
              <span className="font-bold">Status</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Logs */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Execution Logs</h2>
            <p className="text-xs text-slate-500 font-mono">Recent pipeline runs</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
              {`Recent runs: ${logs.length}`}
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-mono font-medium transition-all shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                title="Clear logs from database table"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>Reset Logs</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-white/[0.08] rounded-xl bg-black/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/[0.02] text-slate-400 uppercase tracking-wider border-b border-white/[0.08]">
                <th className="py-3 px-3.5">Log ID</th>
                <th className="py-3 px-3.5">Pipeline</th>
                <th className="py-3 px-3.5">Start Time</th>
                <th className="py-3 px-3.5">End Time</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Rows</th>
                <th className="py-3 px-3.5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic">
                    {loading ? 'Loading logs...' : 'No logs available'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3.5 font-bold text-slate-200">#{log.log_id}</td>
                    <td className="py-2.5 px-3.5 text-slate-300 font-semibold">{log.pipeline_name}</td>
                    <td className="py-2.5 px-3.5 text-slate-400">{new Date(log.start_time).toLocaleString()}</td>
                    <td className="py-2.5 px-3.5 text-slate-400">{log.end_time ? new Date(log.end_time).toLocaleTimeString() : '—'}</td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-emerald-400">{log.rows_processed}</td>
                    <td className="py-2.5 px-3.5 text-slate-400">
                      {log.error_message ? <span className="text-red-400 font-bold">{log.error_message}</span> : 'None'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0c121e] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">Confirm Reset Logs</h3>
                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  This will delete all execution logs from the database. Are you sure?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetLogs}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
              >
                {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Result Alert */}
      {resetResult && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
            resetResult.success
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {resetResult.success ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
            )}
            <span>{resetResult.message}</span>
          </div>
          <button onClick={() => setResetResult(null)} className="font-bold opacity-60 hover:opacity-100 px-1.5 cursor-pointer">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default OperationsPage;
