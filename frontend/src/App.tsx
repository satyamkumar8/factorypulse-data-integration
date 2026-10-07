import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { MonitorPage } from './pages/MonitorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MachineHealth, TelemetryEvent, HourlyOEE, KPISummary } from './types';
import { LanguageProvider } from './context/LanguageContext';

const AppContent: React.FC = () => {
  const [machines, setMachines] = useState<MachineHealth[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<Set<number>>(new Set());
  const [activeUpdateKeys, setActiveUpdateKeys] = useState<Set<string>>(new Set());
  const [hoveredMachine, setHoveredMachine] = useState<string | null>(null);
  
  const [oeeData, setOeeData] = useState<HourlyOEE[]>([]);
  const [kpi, setKpi] = useState<KPISummary | null>(null);

  const selectedLine = 'ALL';
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all core data from FastAPI backend
  const fetchAllData = useCallback(async (overrideLine?: string) => {
    const activeLine = overrideLine !== undefined ? overrideLine : selectedLine;
    const lineParam = activeLine !== 'ALL' ? `?line_id=${activeLine}` : '';
    const telemetryLineParam = activeLine !== 'ALL' ? `&line_id=${activeLine}` : '';

    try {
      const [mRes, eRes, oRes, kRes] = await Promise.all([
        fetch(`/api/machines/status${lineParam}`),
        fetch(`/api/telemetry/recent?limit=50${telemetryLineParam}`),
        fetch('/api/oee/hourly'),
        fetch(`/api/kpi/summary${lineParam}`)
      ]);

      if (mRes.ok) setMachines(await mRes.json());
      if (eRes.ok) setEvents(await eRes.json());
      if (oRes.ok) setOeeData(await oRes.json());
      if (kRes.ok) setKpi(await kRes.json());
    } catch (err) {
      console.warn("Error fetching dashboard data:", err);
    }
  }, [selectedLine]);

  // Clear simulated telemetry feed
  const handleClearTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry', { method: 'DELETE' });
      if (res.ok) {
        setEvents([]);
        setNewEventIds(new Set());
        setActiveUpdateKeys(new Set());
        fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Clear aggregated OEE Data Mart
  const handleClearOee = async () => {
    try {
      const res = await fetch('/api/oee', { method: 'DELETE' });
      if (res.ok) {
        setOeeData([]);
        fetchAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // WebSocket Connection Management
  useEffect(() => {
    fetchAllData();

    let isMounted = true;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
        };

        ws.onmessage = (messageEvent) => {
          if (!isMounted) return;
          try {
            const payload = JSON.parse(messageEvent.data);
            
            if (payload.type === 'INITIAL_SNAPSHOT') {
              if (payload.machines) setMachines(payload.machines);
              if (payload.events) setEvents(payload.events);
              if (payload.kpi) setKpi(payload.kpi);
            } else if (payload.type === 'NEW_TELEMETRY') {
              const newItems: TelemetryEvent[] = payload.events || [];
              if (newItems.length > 0) {
                const ids = new Set(newItems.map(e => e.event_id));
                setNewEventIds(ids);
                setTimeout(() => setNewEventIds(new Set()), 2000);

                const machineKeys = new Set(newItems.map(e => `${e.line_id}_${e.machine_id}`));
                setActiveUpdateKeys(machineKeys);
                setTimeout(() => setActiveUpdateKeys(new Set()), 2500);

                setEvents((prev) => {
                  const existingIds = new Set(newItems.map(x => x.event_id));
                  const filteredPrev = prev.filter(x => !existingIds.has(x.event_id));
                  return [...newItems, ...filteredPrev].slice(0, 100);
                });
              }
            } else if (payload.type === 'MACHINES_UPDATE') {
              if (payload.machines) setMachines(payload.machines);
            } else if (payload.type === 'KPI_UPDATE') {
              if (payload.kpi && selectedLine === 'ALL') {
                setKpi(payload.kpi);
              }
            } else if (payload.type === 'TELEMETRY_CLEARED') {
              setEvents([]);
              setNewEventIds(new Set());
              setActiveUpdateKeys(new Set());
              fetchAllData();
            } else if (payload.type === 'OEE_CLEARED') {
              setOeeData([]);
              fetchAllData();
            }
          } catch (e) {
            console.error("Error parsing WS message:", e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    const intervalOee = setInterval(() => {
      fetch('/api/oee/hourly')
        .then(res => res.json())
        .then(data => setOeeData(data))
        .catch(() => {});
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalOee);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchAllData, selectedLine]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Minimal Top Navbar */}
      <Navbar />

      {/* Main Routed Content */}
      <main className="flex-1 w-full pb-10">
        <Routes>
          <Route path="/" element={<HomePage kpi={kpi} />} />
          <Route
            path="/monitor"
            element={
              <MonitorPage
                machines={machines}
                events={events}
                newEventIds={newEventIds}
                activeUpdateKeys={activeUpdateKeys}
                hoveredMachine={hoveredMachine}
                onHoverMachine={setHoveredMachine}
                selectedMachineFilter={selectedMachineFilter}
                onSelectMachine={setSelectedMachineFilter}
                selectedLine={selectedLine}
                kpi={kpi}
                isAlertDismissed={isAlertDismissed}
                onDismissAlert={() => setIsAlertDismissed(true)}
                onClearTelemetry={handleClearTelemetry}
              />
            }
          />
          <Route
            path="/analytics"
            element={
              <AnalyticsPage
                oeeData={oeeData}
                selectedLine={selectedLine}
                onClearOee={handleClearOee}
                onRefreshOee={() => fetchAllData()}
              />
            }
          />
          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-white/[0.08] bg-[#070b14] px-6 py-4 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300">FactoryPulse</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Manufacturing Data Integration Platform</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          PostgreSQL 15 · FastAPI · Apache Superset · React
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
