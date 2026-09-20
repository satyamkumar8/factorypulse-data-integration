import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Terminal, 
  Check, 
  Copy,
  Trash2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { ExecutionLog } from '../types';
import { audioAlert } from '../utils/audioAlert';
import { useLanguage } from '../context/LanguageContext';

interface OperationsPageProps {
  onRefreshAll: () => void;
}

export const OperationsPage: React.FC<OperationsPageProps> = ({ onRefreshAll }) => {
  const { t, lang } = useLanguage();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [etlRunning, setEtlRunning] = useState<boolean>(false);
  const [etlResult, setEtlResult] = useState<{ message: string; success: boolean } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetResult, setResetResult] = useState<{ message: string; success: boolean } | null>(null);
  const [seedingHistory, setSeedingHistory] = useState<boolean>(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs?limit=25');
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
          message: t.nav.etlSuccessToast(data.rows_affected, data.duration_sec),
          success: true
        });
        audioAlert.playAlarm('success');
        fetchLogs();
        onRefreshAll();
      } else {
        setEtlResult({
          message: data.detail ? `${t.nav.etlErrorToast}: ${data.detail}` : t.nav.etlErrorToast,
          success: false
        });
        audioAlert.playAlarm('defect');
      }
    } catch {
      setEtlResult({
        message: t.nav.etlErrorToast,
        success: false
      });
    } finally {
      setEtlRunning(false);
    }
  };

  const handleSeedHistory = async () => {
    try {
      setSeedingHistory(true);
      setEtlResult(null);
      const res = await fetch('/api/demo/seed-history?hours=8', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setEtlResult({
          message: lang === 'th' 
            ? `จำลองประวัติ 8 ชั่วโมงสำเร็จ: สร้าง ${data.events_generated} สัญญาณ และประมวลผล ${data.etl_summary?.rows_affected || 54} รายการเข้า Data Mart เรียบร้อย`
            : `Demo history seeded: created ${data.events_generated} events across 8 hours`,
          success: true
        });
        audioAlert.playAlarm('success');
        fetchLogs();
        onRefreshAll();
      } else {
        setEtlResult({
          message: data.detail || 'Failed to seed history',
          success: false
        });
        audioAlert.playAlarm('defect');
      }
    } catch {
      setEtlResult({
        message: 'Failed to seed history',
        success: false
      });
    } finally {
      setSeedingHistory(false);
    }
  };

  const handleResetLogs = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setResetResult({
          message: t.operations.resetSuccessToast,
          success: true
        });
        audioAlert.playAlarm('success');
        setIsResetModalOpen(false);
        onRefreshAll();
      } else {
        const data = await res.json().catch(() => ({}));
        setResetResult({
          message: data.detail || t.operations.resetErrorToast,
          success: false
        });
        audioAlert.playAlarm('defect');
      }
    } catch {
      setResetResult({
        message: t.operations.resetErrorToast,
        success: false
      });
      audioAlert.playAlarm('defect');
    } finally {
      setResetting(false);
      setTimeout(() => setResetResult(null), 6000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const runbookCommands = [
    {
      id: 'cmd-sim',
      title: lang === 'th' ? '1. เครื่องจำลองสัญญาณเซนเซอร์ Edge Telemetry' : '1. IoT Edge Sensor Telemetry Simulator',
      desc: lang === 'th' ? 'จำลองโหนด PLC จำนวน 6 เครื่องส่งสัญญาณข้อมูลทุก 2 วินาที' : 'Simulates 6 shopfloor PLC nodes streaming events every 2 seconds.',
      cmd: 'python simulator.py'
    },
    {
      id: 'cmd-stream',
      title: lang === 'th' ? '2. สตรีมมอนิเตอร์ตรวจจับความผิดปกติแบบเรียลไทม์' : '2. Real-time Stream Anomaly Monitor',
      desc: lang === 'th' ? 'เฝ้าระวังความผิดปกติ ตรวจจับของเสียต่อเนื่อง และตรวจคุณภาพข้อมูล' : 'Monitors raw streams, detects consecutive defects, and flags anomaly incidents.',
      cmd: 'python stream_monitor.py'
    },
    {
      id: 'cmd-etl',
      title: lang === 'th' ? '3. ไปป์ไลน์คำนวณและสรุปผล OEE รายชั่วโมง' : '3. Hourly OEE Batch Aggregation Pipeline',
      desc: lang === 'th' ? 'ดึงข้อมูลดิบ คำนวณ A / P / Q และ Upsert เข้าตาราง Data Mart' : 'Extracts telemetry, computes Availability, Performance, and Quality, and upserts to Data Mart.',
      cmd: 'python batch_etl.py'
    },
    {
      id: 'cmd-analysis',
      title: lang === 'th' ? '4. รายงานสรุปดัชนีชี้วัดโรงงานผ่าน Terminal' : '4. Executive Summary CLI Report',
      desc: lang === 'th' ? 'สร้างตารางสรุปผล OEE และสถิติภาพรวมโรงงานแบบ ASCII จาก Data Mart' : 'Generates ASCII dashboard table summary of plant KPIs from the Data Mart.',
      cmd: 'python run_analysis.py'
    }
  ];

  return (
    <div className="space-y-6 max-w-[1750px] mx-auto px-4 lg:px-8 py-6 pb-14">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            <span>{t.operations.pageTitle}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
            {t.operations.pageSubtitle}
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
            <span>{t.operations.btnRefreshLogs}</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={logs.length === 0 && !loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-mono font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            title="Clear and reset execution audit logs"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{t.operations.btnResetLogs}</span>
          </button>
        </div>
      </div>

      {/* Grid: ETL Action Trigger & Infrastructure Status (Balanced Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* ETL Pipeline Trigger Box */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {t.operations.cardEtlTitle}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {t.operations.cardEtlSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleSeedHistory}
                disabled={seedingHistory || etlRunning}
                className="h-10 flex items-center justify-center gap-1.5 px-4 rounded-full bg-purple-500/15 hover:bg-purple-500/25 active:scale-[0.98] border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 font-bold text-xs shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all disabled:opacity-50 cursor-pointer"
                title="Populate 8 hours of historical telemetry & compute OEE"
              >
                {seedingHistory ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>{seedingHistory ? (lang === 'th' ? 'กำลังสร้างประวัติ...' : 'Seeding...') : (lang === 'th' ? '⚡ จำลองประวัติ 8 ชม.' : '⚡ Seed 8h History')}</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerEtl}
                disabled={etlRunning || seedingHistory}
                className="animate-shimmer h-10 flex items-center justify-center gap-2 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                {etlRunning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{etlRunning ? t.operations.btnExecutingEtl : t.operations.btnTriggerEtl}</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-slate-400 leading-relaxed font-mono">
            <p>{t.operations.etlExplainer}</p>
          </div>

          {/* Feedback Result Alert */}
          {etlResult && (
            <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
              etlResult.success 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {etlResult.success ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
                )}
                <span>{etlResult.message}</span>
              </div>
              <button onClick={() => setEtlResult(null)} className="font-bold opacity-60 hover:opacity-100 px-1.5 cursor-pointer">✕</button>
            </div>
          )}

          {/* Reset Feedback Alert */}
          {resetResult && (
            <div className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between animate-fadeIn ${
              resetResult.success 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {resetResult.success ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0" />
                )}
                <span>{resetResult.message}</span>
              </div>
              <button onClick={() => setResetResult(null)} className="font-bold opacity-60 hover:opacity-100 px-1.5 cursor-pointer">✕</button>
            </div>
          )}
        </div>

        {/* Database & Infrastructure Status */}
        <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-3.5">
          <div className="flex items-center space-x-2.5 text-white font-bold text-sm">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>{t.operations.dbCardTitle}</span>
          </div>
          <div className="space-y-2.5 text-xs font-mono my-auto py-1">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">{t.operations.dbName}</span>
              <span className="font-bold text-slate-200">mfg_warehouse</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">{t.operations.dbPort}</span>
              <span className="font-bold text-slate-200">localhost:5432</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between">
              <span className="text-slate-500">{t.operations.dbTables}</span>
              <span className="font-bold text-slate-200">3 {lang === 'th' ? 'ตาราง' : 'Tables'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
              <span className="font-bold">{t.operations.dbState}</span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
                {t.operations.dbActive}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Logs Audit Trail Table */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t.operations.logsSectionTitle}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              {t.operations.logsSectionSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
              {t.operations.recentRunsCount(logs.length)}
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-mono font-medium transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                title="Clear logs from database table"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>{t.operations.btnResetLogs}</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-white/[0.08] rounded-xl bg-black/40">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/[0.02] text-slate-400 uppercase tracking-wider border-b border-white/[0.08]">
                <th className="py-3 px-3.5">{t.operations.colLogId}</th>
                <th className="py-3 px-3.5">{t.operations.colPipeline}</th>
                <th className="py-3 px-3.5">{t.operations.colStartTime}</th>
                <th className="py-3 px-3.5">{t.operations.colEndTime}</th>
                <th className="py-3 px-3.5">{t.operations.colStatus}</th>
                <th className="py-3 px-3.5 text-right">{t.operations.colRowsUpserted}</th>
                <th className="py-3 px-3.5">{t.operations.colErrorDetails}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic">
                    {loading ? t.operations.loadingLogs : t.operations.noLogs}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3.5 font-bold text-slate-200">
                      #{log.log_id}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-300 font-semibold">
                      {log.pipeline_name}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400">
                      {new Date(log.start_time).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400">
                      {log.end_time ? new Date(log.end_time).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-emerald-400">
                      {log.rows_processed}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400">
                      {log.error_message ? (
                        <span className="text-red-400 font-bold">{log.error_message}</span>
                      ) : (
                        <span className="text-slate-600">{lang === 'th' ? 'ไม่มี' : 'None'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal CLI Runbook Reference */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-base">
          <Terminal className="w-5 h-5 text-slate-400" />
          <span>{t.operations.runbookTitle}</span>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          {t.operations.runbookSubtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {runbookCommands.map((item) => {
            const isCopied = copiedCmd === item.id;
            return (
              <div 
                key={item.id} 
                className="p-4 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-white/20 transition-all shadow-md space-y-3 group"
              >
                {/* Title & Desc */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-white tracking-wide">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed pl-5.5">
                    {item.desc}
                  </p>
                </div>

                {/* Code Snippet Box with Inline Copy Button */}
                <div className="flex items-center justify-between gap-2 p-2 px-3 rounded-lg bg-black/80 border border-white/[0.08] group-hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono text-emerald-400 select-all">
                    <span className="text-slate-500 select-none font-bold">$</span>
                    <span>{item.cmd}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.cmd, item.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-all cursor-pointer flex-shrink-0 ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10'
                    }`}
                    title="Copy command to clipboard"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? t.common.copied : t.common.copy}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Reset Logs */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0c121e] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col space-y-5">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.operations.confirmResetTitle}
                </h3>
                <p className="text-xs text-slate-400 font-mono leading-relaxed">
                  {t.operations.confirmResetDesc}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] font-mono text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Table:</span>
                <span className="text-emerald-400 font-semibold">pipeline_execution_logs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Records:</span>
                <span className="text-rose-400 font-bold">{logs.length} runs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sequence Action:</span>
                <span className="text-sky-400 font-semibold">RESTART IDENTITY (Start at #1)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer"
              >
                {t.operations.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleResetLogs}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs font-mono font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
              >
                {resetting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{resetting ? t.operations.loadingLogs : t.operations.btnConfirmReset}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
