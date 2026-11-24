"""FastAPI application: ingest, alerts, integrations, AI models, assurance, live WebSocket."""
from __future__ import annotations

import asyncio
import json
import time
from contextlib import asynccontextmanager

from fastapi import (Depends, FastAPI, Header, HTTPException, Query, WebSocket,
                     WebSocketDisconnect)
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .ai.explain import explain
from .ai.providers import probe
from .assurance import Assurance
from .config import get_config, load_env, resolve
from .detection.engine import Engine
from .schema import (FeedbackIn, IngestBatch, IntegrationIn, ModelIn)
from .store import Store

load_env()
cfg = get_config()
store = Store(resolve(cfg["storage"]["sqlite_path"]))
assurance = Assurance(cfg, feedback_fn=store.feedback_stats)
engine = Engine(cfg, assurance=assurance)

_clients: set[WebSocket] = set()
_outbox: asyncio.Queue = asyncio.Queue(maxsize=5000)


def _publish(kind: str, data: dict) -> None:
    try:
        _outbox.put_nowait({"type": kind, "data": data})
    except asyncio.QueueFull:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    pump = asyncio.create_task(_pump())
    ticker = asyncio.create_task(_tick())
    yield
    pump.cancel()
    ticker.cancel()


async def _pump():
    while True:
        msg = await _outbox.get()
        text = json.dumps(msg, default=str)
        for ws in list(_clients):
            try:
                await ws.send_text(text)
            except Exception:
                _clients.discard(ws)


async def _tick():
    while True:
        await asyncio.sleep(2.0)
        _publish("stats", _full_stats())
        _publish("assurance", assurance.snapshot())


def _full_stats() -> dict:
    return {
        "version": __version__,
        "alerts": store.counts(),
        "live": engine.stats(),
        "integrations": [
            {"site_id": i["site_id"], "name": i["name"], "event_count": i["event_count"],
             "last_event_at": i["last_event_at"], "status": i["status"]}
            for i in store.list_integrations()
        ],
    }


app = FastAPI(title="ThreatWatch", version=__version__, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg["api"]["allowed_origins"],
    allow_methods=["*"], allow_headers=["*"],
)


# ---- health -------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "version": __version__, "integrations": len(store.list_integrations())}


# ---- ingest (called by each website's monitoring agent) -----------------
def _auth(x_ingest_key: str | None = Header(default=None)) -> dict:
    if not x_ingest_key:
        raise HTTPException(401, "missing X-Ingest-Key")
    site = store.integration_by_key(x_ingest_key)
    if not site:
        raise HTTPException(403, "invalid ingest key")
    if site["status"] != "active":
        raise HTTPException(403, "integration is paused")
    return site


@app.post("/api/ingest")
async def ingest(batch: IngestBatch, site=Depends(_auth)):
    events = [e.model_dump() for e in batch.events]
    alerts = engine.ingest(site["site_id"], site["name"], events)
    for a in alerts:
        store.add_alert(a)
        _publish("alert", a)
    if events:
        last_ts = max(e["ts"] for e in events)
        store.touch_integration(site["site_id"], len(events), last_ts)
    return {"accepted": len(events), "alerts": len(alerts)}


# ---- alerts -------------------------------------------------------------
@app.get("/api/alerts")
def list_alerts(site_id: str | None = None, severity: str | None = None,
                threat_class: str | None = None, limit: int = Query(200, le=2000), offset: int = 0):
    return store.list_alerts(site_id, severity, threat_class, limit, offset)


@app.get("/api/alerts/{alert_id}")
def get_alert(alert_id: str):
    a = store.get_alert(alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    return a


@app.post("/api/alerts/{alert_id}/feedback")
def feedback(alert_id: str, body: FeedbackIn):
    if not store.set_feedback(alert_id, body.verdict, body.note):
        raise HTTPException(404, "alert not found")
    return {"alert_id": alert_id, "verdict": body.verdict}


@app.post("/api/alerts/{alert_id}/explain")
def explain_alert(alert_id: str):
    a = store.get_alert(alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    model = store.default_model()  # full record (unredacted key) for the call
    res = explain(a, model)
    store.set_explanation(alert_id, res["text"])
    return res


# ---- integrations -------------------------------------------------------
@app.get("/api/integrations")
def list_integrations():
    out = []
    for i in store.list_integrations():
        d = dict(i)
        d["ingest_key"] = _mask(d["ingest_key"])
        out.append(d)
    return out


@app.post("/api/integrations")
def create_integration(body: IntegrationIn):
    if not body.name.strip():
        raise HTTPException(400, "name is required")
    return store.create_integration(body.name.strip(), body.url.strip())


@app.get("/api/integrations/{site_id}")
def get_integration(site_id: str):
    i = store.get_integration(site_id)
    if not i:
        raise HTTPException(404, "integration not found")
    return i  # full ingest_key, for the setup snippet


@app.delete("/api/integrations/{site_id}")
def delete_integration(site_id: str):
    if not store.delete_integration(site_id):
        raise HTTPException(404, "integration not found")
    return {"deleted": site_id}


# ---- AI models ----------------------------------------------------------
@app.get("/api/models")
def list_models():
    return store.list_models(redact=True)


@app.post("/api/models")
def add_model(body: ModelIn):
    if not body.model.strip():
        raise HTTPException(400, "model is required")
    m = store.add_model(body.label.strip() or body.model, body.provider, body.model.strip(),
                        body.api_key.strip(), body.base_url.strip(), body.make_default)
    m["api_key"] = _mask(m["api_key"])
    return m


@app.post("/api/models/{mid}/default")
def set_default(mid: str):
    if not store.set_default_model(mid):
        raise HTTPException(404, "model not found")
    return {"default": mid}


@app.post("/api/models/{mid}/test")
def test_model(mid: str):
    m = store.get_model(mid)
    if not m:
        raise HTTPException(404, "model not found")
    return probe(m)


@app.delete("/api/models/{mid}")
def delete_model(mid: str):
    if not store.delete_model(mid):
        raise HTTPException(404, "model not found")
    return {"deleted": mid}


# ---- stats + assurance --------------------------------------------------
@app.get("/api/stats")
def stats():
    return _full_stats()


@app.get("/api/assurance")
def assurance_status():
    return {"detectors": assurance.snapshot(),
            "settings": {k: cfg["assurance"][k] for k in ("trust_alert_below", "fp_rate_warn", "min_feedback")}}


# ---- live feed ----------------------------------------------------------
@app.websocket("/ws")
async def ws(socket: WebSocket):
    await socket.accept()
    _clients.add(socket)
    try:
        await socket.send_text(json.dumps({"type": "stats", "data": _full_stats()}, default=str))
        await socket.send_text(json.dumps({"type": "assurance", "data": assurance.snapshot()}, default=str))
        while True:
            await socket.receive_text()  # keep-alive; inbound ignored
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(socket)


def _mask(key: str) -> str:
    return key[:8] + "…" + key[-4:] if key and len(key) > 14 else "••••"
