import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from . import database as db
    from . import alerts as alerts_engine
    from .schemas import (
        MachineHealth,
        TelemetryEvent,
        HourlyOEE,
        KPISummary,
        ExecutionLog,
        ETLResponse,
        MachinePredictiveHealth,
        OperationalAlert
    )
except ImportError:
    import database as db
    import alerts as alerts_engine
    from schemas import (
        MachineHealth,
        TelemetryEvent,
        HourlyOEE,
        KPISummary,
        ExecutionLog,
        ETLResponse,
        MachinePredictiveHealth,
        OperationalAlert
    )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("factorypulse_backend")

# ----------------------------------------------------
# WebSocket Connection Manager
# ----------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending message to websocket: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

# ----------------------------------------------------
# Background Real-Time Broadcaster Task
# ----------------------------------------------------
async def telemetry_broadcaster():
    logger.info("Starting background telemetry broadcaster...")
    last_event_id = 0
    try:
        last_event_id = db.get_max_event_id()
    except Exception as e:
        logger.error(f"Error getting initial max event_id: {e}")

    while True:
        try:
            # Check if table was truncated or reset
            current_max = db.get_max_event_id()
            if current_max < last_event_id:
                last_event_id = 0

            # Check for new telemetry events since last_event_id
            new_events = db.get_new_telemetry_events(after_id=last_event_id, limit=50)
            if new_events:
                last_event_id = max(e["event_id"] for e in new_events)
                logger.info(f"Broadcasting {len(new_events)} new telemetry event(s) to {len(manager.active_connections)} client(s)")
                
                # Broadcast new telemetry events
                await manager.broadcast({
                    "type": "NEW_TELEMETRY",
                    "events": new_events
                })

                # Refresh machine health status & KPI summary
                try:
                    machines = db.get_latest_machines()
                    kpi = db.get_kpi_summary()
                    ml_health = db.get_predictive_health_summary()
                    await manager.broadcast({
                        "type": "MACHINES_UPDATE",
                        "machines": machines
                    })
                    await manager.broadcast({
                        "type": "KPI_UPDATE",
                        "kpi": kpi
                    })
                    await manager.broadcast({
                        "type": "ML_HEALTH_UPDATE",
                        "health_summary": ml_health
                    })
                except Exception as ex:
                    logger.error(f"Error updating machines/kpi/ml in broadcast: {ex}")

        except Exception as e:
            logger.error(f"Error in telemetry broadcaster loop: {e}")

        await asyncio.sleep(1.0)

# ----------------------------------------------------
# Lifespan Context Manager
# ----------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background broadcaster task
    broadcast_task = asyncio.create_task(telemetry_broadcaster())
    yield
    # Cancel task on shutdown
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass

# ----------------------------------------------------
# FastAPI Application
# ----------------------------------------------------
app = FastAPI(
    title="FactoryPulse Manufacturing Operations & OEE API",
    description="FactoryPulse - Manufacturing Data Integration, OEE Analytics and Operations Intelligence API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# REST API Endpoints
# ----------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "factorypulse-backend", "version": "1.0.0"}

@app.get("/api/machines/status", response_model=List[MachineHealth])
def get_machines(line_id: Optional[str] = Query(None)):
    try:
        return db.get_latest_machines(line_id=line_id)
    except Exception as e:
        logger.error(f"Database error in get_machines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetry/recent", response_model=List[TelemetryEvent])
def get_recent(
    limit: int = Query(50, ge=1, le=200),
    line_id: Optional[str] = Query(None)
):
    try:
        return db.get_recent_telemetry(limit=limit, line_id=line_id)
    except Exception as e:
        logger.error(f"Database error in get_recent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/oee/hourly", response_model=List[HourlyOEE])
def get_oee():
    try:
        return db.get_hourly_oee()
    except Exception as e:
        logger.error(f"Database error in get_oee: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/kpi/summary", response_model=KPISummary)
def get_kpis(line_id: Optional[str] = Query(None)):
    try:
        return db.get_kpi_summary(line_id=line_id)
    except Exception as e:
        logger.error(f"Database error in get_kpis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs", response_model=List[ExecutionLog])
def get_execution_logs(limit: int = Query(10, ge=1, le=50)):
    try:
        return db.get_logs(limit=limit)
    except Exception as e:
        logger.error(f"Database error in get_execution_logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/logs")
@app.post("/api/logs/reset")
def reset_execution_logs():
    try:
        return db.clear_execution_logs()
    except Exception as e:
        logger.error(f"Database error in reset_execution_logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/telemetry")
@app.post("/api/telemetry/reset")
async def reset_telemetry():
    try:
        result = db.clear_telemetry_data()
        # Broadcast to all connected WebSockets to clear frontend state immediately
        await manager.broadcast({
            "type": "TELEMETRY_CLEARED"
        })
        try:
            machines = db.get_latest_machines()
            kpi = db.get_kpi_summary()
            await manager.broadcast({
                "type": "MACHINES_UPDATE",
                "machines": machines
            })
            await manager.broadcast({
                "type": "KPI_UPDATE",
                "kpi": kpi
            })
        except Exception:
            pass
        return result
    except Exception as e:
        logger.error(f"Database error in reset_telemetry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/oee")
@app.post("/api/oee/reset")
async def reset_oee_data():
    try:
        result = db.clear_oee_data()
        await manager.broadcast({
            "type": "OEE_CLEARED"
        })
        try:
            kpi = db.get_kpi_summary()
            await manager.broadcast({
                "type": "KPI_UPDATE",
                "kpi": kpi
            })
        except Exception:
            pass
        return result
    except Exception as e:
        logger.error(f"Database error in reset_oee_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/system/reset-all")
def reset_all_data():
    try:
        return db.clear_all_history()
    except Exception as e:
        logger.error(f"Database error in reset_all_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/etl/trigger", response_model=ETLResponse)
def trigger_etl():
    try:
        result = db.trigger_batch_etl_job()
        return result
    except Exception as e:
        logger.error(f"Error executing batch ETL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/demo/seed-history")
def seed_demo_history(hours: int = Query(8, ge=2, le=24)):
    try:
        return db.seed_historical_telemetry(hours_back=hours)
    except Exception as e:
        logger.error(f"Error seeding demo history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------
# Operational Alerts Endpoints
# ----------------------------------------------------
@app.get("/api/alerts", response_model=List[OperationalAlert])
def get_alerts(limit: int = Query(20, ge=1, le=100)):
    try:
        return alerts_engine.get_recent_alerts(db.engine, limit=limit)
    except Exception as e:
        logger.error(f"Database error in get_alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts/evaluate")
def evaluate_alerts():
    try:
        alerts = alerts_engine.evaluate_and_record_alerts(db.engine)
        return {"status": "SUCCESS", "alerts_generated": len(alerts), "alerts": alerts[:10]}
    except Exception as e:
        logger.error(f"Error evaluating alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts/{alert_id}/acknowledge")
def ack_alert(alert_id: int, user: str = Query("operator")):
    try:
        success = alerts_engine.acknowledge_alert(db.engine, alert_id=alert_id, user=user)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "SUCCESS", "alert_id": alert_id, "acknowledged_by": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------
# Industrial Data Science & ML Endpoints
# ----------------------------------------------------
@app.get("/api/ml/health-summary", response_model=List[MachinePredictiveHealth])
def get_ml_health_summary(line_id: Optional[str] = Query(None)):
    try:
        return db.get_predictive_health_summary(line_id=line_id)
    except Exception as e:
        logger.error(f"Database error in get_ml_health_summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ml/metadata")
def get_ml_metadata():
    import json
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "ml", "models", "model_metadata.json"),
        os.path.join(os.path.dirname(__file__), "ml", "models", "model_metadata.json"),
        "/ml/models/model_metadata.json"
    ]
    for meta_path in candidates:
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading model metadata: {e}")
    return {"status": "no_models", "message": "ML models have not been trained yet."}

@app.post("/api/ml/retrain")
def retrain_ml_models():
    try:
        from ml.train_models import run_training_pipeline
        success = run_training_pipeline()
        if success:
            return {"status": "success", "message": "Models retrained and serialized successfully."}
        else:
            raise HTTPException(status_code=400, detail="Insufficient telemetry data to train models.")
    except Exception as e:
        logger.error(f"Error retraining ML models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------------------
# WebSocket Endpoint
# ----------------------------------------------------
@app.websocket("/api/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot immediately upon connection
        try:
            machines = db.get_latest_machines()
            recent_events = db.get_recent_telemetry(limit=20)
            kpi = db.get_kpi_summary()
            ml_health = db.get_predictive_health_summary()
            await websocket.send_json({
                "type": "INITIAL_SNAPSHOT",
                "machines": machines,
                "events": recent_events,
                "kpi": kpi,
                "ml_health": ml_health
            })
        except Exception as e:
            logger.error(f"Error sending snapshot: {e}")

        # Keep listening for incoming client messages (e.g. ping/pong or filter requests)
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "PONG"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        manager.disconnect(websocket)
