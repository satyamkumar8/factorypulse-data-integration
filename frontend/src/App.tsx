import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { MonitorPage } from './pages/MonitorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { OperationsPage } from './pages/OperationsPage';
import { MachineHealth, TelemetryEvent, HourlyOEE, KPISummary } from './types';
import { audioAlert } from './utils/audioAlert';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [machines, setMachines] = useState<MachineHealth[]>([]);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [newEventIds, setNewEventIds] = useState<Set<number>>(new Set());
  const [activeUpdateKeys, setActiveUpdateKeys] = useState<Set<string>>(new Set());
  const [hoveredMachine, setHoveredMachine] = useState<string | null>(null);
  
  const [oeeData, setOeeData] = useState<HourlyOEE[]>([]);
  const [kpi, setKpi] = useState<KPISummary | null>(null);

  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string | null>(null);
  
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all data (respecting selectedLine filter)
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

  // When line filter changes, refresh scoped data immediately
  const handleSelectLine = (line: string) => {
    setSelectedLine(line);
    setSelectedMachineFilter(null);
    fetchAllData(line);
  };

  // Clear simulated telemetry feed and reset sequence to #1
  const handleClearTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry', { method: 'DELETE' });
      if (res.ok) {
        setEvents([]);
        setNewEventIds(new Set());
        setActiveUpdateKeys(new Set());
        audioAlert.playAlarm('success');
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
        audioAlert.playAlarm('success');
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
          console.log("Connected to Real-Time Telemetry Stream via WebSocket");
          setWsConnected(true);
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
                // Highlight new rows in table
                const ids = new Set(newItems.map(e => e.event_id));
                setNewEventIds(ids);
                setTimeout(() => setNewEventIds(new Set()), 2500);

                // Highlight active machine card(s) that just ingested
                const machineKeys = new Set(newItems.map(e => `${e.line_id}_${e.machine_id}`));
                setActiveUpdateKeys(machineKeys);
                setTimeout(() => setActiveUpdateKeys(new Set()), 3500);

                // Prepend new events and maintain limit
                setEvents((prev) => {
                  const existingIds = new Set(newItems.map(x => x.event_id));
                  const filteredPrev = prev.filter(x => !existingIds.has(x.event_id));
                  return [...newItems, ...filteredPrev].slice(0, 100);
                });

                // Check for alerts to play sound
                const hasBreakdown = newItems.some(e => e.category === 'Unplanned Downtime');
                const hasDefect = newItems.some(e => e.defect_units > 0);
                if (hasBreakdown) {
                  audioAlert.playAlarm('breakdown');
                  setIsAlertDismissed(false);
                } else if (hasDefect) {
                  audioAlert.playAlarm('defect');
                }
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
          console.warn("WebSocket closed. Attempting reconnect in 3s...");
          setWsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.warn("WebSocket error:", err);
          ws.close();
        };
      } catch (e) {
        console.warn("Failed to initiate WebSocket:", e);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    // Fallback polling for OEE hourly data (every 15s)
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
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative">
      {/* Ambient Radial Lighting Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-emerald-500/[0.08] via-teal-500/[0.04] to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar
        wsConnected={wsConnected}
        selectedLine={selectedLine}
        onSelectLine={handleSelectLine}
        onRefreshAll={() => fetchAllData()}
      />

      {/* Main Routed Content Area */}
      <main className="flex-1 w-full pb-12">
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
          <Route
            path="/operations"
            element={
              <OperationsPage
                onRefreshAll={() => fetchAllData()}
              />
            }
          />
          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* 21st.dev Style Dark Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050811]/90 backdrop-blur-xl px-6 py-4 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-slate-300">{t.footer.appName}</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">{t.footer.techStack}</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          {t.footer.dbStatus}
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
