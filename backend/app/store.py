"""SQLite persistence: integrations, alerts, feedback, AI model configs, settings."""
from __future__ import annotations

import json
import secrets
import sqlite3
import threading
import time
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS integrations (
  site_id TEXT PRIMARY KEY, name TEXT, url TEXT, ingest_key TEXT UNIQUE,
  created_at REAL, last_event_at REAL, event_count INTEGER DEFAULT 0, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS alerts (
  alert_id TEXT PRIMARY KEY, seq INTEGER, site_id TEXT, ts TEXT, threat_class TEXT,
  severity TEXT, confidence REAL, detector TEXT, entity TEXT, body TEXT NOT NULL,
  feedback TEXT, feedback_note TEXT, feedback_at REAL, ai_explanation TEXT);
CREATE INDEX IF NOT EXISTS ix_alerts_seq ON alerts(seq);
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY, label TEXT, provider TEXT, model TEXT, api_key TEXT,
  base_url TEXT, is_default INTEGER DEFAULT 0, created_at REAL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
"""


class Store:
    def __init__(self, path: str | Path = ":memory:"):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            if str(path) != ":memory:":
                self._db.execute("PRAGMA journal_mode=WAL")
            self._db.executescript(_SCHEMA)
            self._db.commit()
        self._seq = self._max_alert_seq()

    # ---- integrations ----------------------------------------------------
    def create_integration(self, name: str, url: str = "") -> dict:
        site_id = "site_" + secrets.token_hex(4)
        key = "twk_" + secrets.token_urlsafe(24)
        with self._lock:
            self._db.execute(
                "INSERT INTO integrations(site_id,name,url,ingest_key,created_at) VALUES (?,?,?,?,?)",
                (site_id, name, url, key, time.time()))
            self._db.commit()
        return self.get_integration(site_id)

    def get_integration(self, site_id: str) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT * FROM integrations WHERE site_id=?", (site_id,)).fetchone()
        return dict(r) if r else None

    def integration_by_key(self, key: str) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT * FROM integrations WHERE ingest_key=?", (key,)).fetchone()
        return dict(r) if r else None

    def list_integrations(self) -> list[dict]:
        with self._lock:
            rows = self._db.execute("SELECT * FROM integrations ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def delete_integration(self, site_id: str) -> bool:
        with self._lock:
            cur = self._db.execute("DELETE FROM integrations WHERE site_id=?", (site_id,))
            self._db.commit()
        return cur.rowcount > 0

    def touch_integration(self, site_id: str, n: int, ts: float) -> None:
        with self._lock:
            self._db.execute(
                "UPDATE integrations SET last_event_at=?, event_count=event_count+? WHERE site_id=?",
                (ts, n, site_id))
            self._db.commit()

    # ---- alerts ----------------------------------------------------------
    def _max_alert_seq(self) -> int:
        with self._lock:
            r = self._db.execute("SELECT COALESCE(MAX(seq),0) FROM alerts").fetchone()
        return int(r[0])

    def add_alert(self, a: dict) -> None:
        self._seq += 1
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO alerts(alert_id,seq,site_id,ts,threat_class,severity,confidence,"
                "detector,entity,body) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (a["alert_id"], self._seq, a["site_id"], a["timestamp"], a["threat_class"], a["severity"],
                 a["confidence"], a["detector"], a["entity"], json.dumps(a)))
            self._db.commit()

    def _row_to_alert(self, r) -> dict:
        a = json.loads(r["body"])
        a["ai_explanation"] = r["ai_explanation"]
        a["feedback"] = ({"verdict": r["feedback"], "note": r["feedback_note"], "at": r["feedback_at"]}
                         if r["feedback"] else None)
        return a

    def list_alerts(self, site_id=None, severity=None, threat_class=None, limit=200, offset=0) -> list[dict]:
        q, args = "SELECT * FROM alerts WHERE 1=1", []
        for col, val in (("site_id", site_id), ("severity", severity), ("threat_class", threat_class)):
            if val:
                q += f" AND {col}=?"; args.append(val)
        q += " ORDER BY seq DESC LIMIT ? OFFSET ?"; args += [int(limit), int(offset)]
        with self._lock:
            rows = self._db.execute(q, args).fetchall()
        return [self._row_to_alert(r) for r in rows]

    def get_alert(self, alert_id: str) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT * FROM alerts WHERE alert_id=?", (alert_id,)).fetchone()
        return self._row_to_alert(r) if r else None

    def set_feedback(self, alert_id: str, verdict: str, note: str | None) -> bool:
        with self._lock:
            cur = self._db.execute(
                "UPDATE alerts SET feedback=?, feedback_note=?, feedback_at=? WHERE alert_id=?",
                (verdict, note, time.time(), alert_id))
            self._db.commit()
        return cur.rowcount > 0

    def set_explanation(self, alert_id: str, text: str) -> None:
        with self._lock:
            self._db.execute("UPDATE alerts SET ai_explanation=? WHERE alert_id=?", (text, alert_id))
            self._db.commit()

    def feedback_stats(self, detector: str) -> tuple[int, int]:
        with self._lock:
            r = self._db.execute(
                "SELECT COUNT(*), SUM(CASE WHEN feedback='false_positive' THEN 1 ELSE 0 END) "
                "FROM alerts WHERE detector=? AND feedback IS NOT NULL", (detector,)).fetchone()
        return int(r[0] or 0), int(r[1] or 0)

    def counts(self) -> dict:
        with self._lock:
            by_class = dict(self._db.execute("SELECT threat_class, COUNT(*) FROM alerts GROUP BY threat_class").fetchall())
            by_sev = dict(self._db.execute("SELECT severity, COUNT(*) FROM alerts GROUP BY severity").fetchall())
            total = self._db.execute("SELECT COUNT(*) FROM alerts").fetchone()[0]
        return {"total": total, "by_class": by_class, "by_severity": by_sev}

    # ---- AI models -------------------------------------------------------
    def add_model(self, label, provider, model, api_key="", base_url="", make_default=False) -> dict:
        mid = "model_" + secrets.token_hex(4)
        with self._lock:
            if make_default:
                self._db.execute("UPDATE models SET is_default=0")
            has_default = self._db.execute("SELECT COUNT(*) FROM models WHERE is_default=1").fetchone()[0]
            self._db.execute(
                "INSERT INTO models(id,label,provider,model,api_key,base_url,is_default,created_at) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (mid, label, provider, model, api_key, base_url,
                 1 if (make_default or not has_default) else 0, time.time()))
            self._db.commit()
        return self.get_model(mid)

    def get_model(self, mid: str) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT * FROM models WHERE id=?", (mid,)).fetchone()
        return dict(r) if r else None

    def list_models(self, redact=True) -> list[dict]:
        with self._lock:
            rows = self._db.execute("SELECT * FROM models ORDER BY created_at").fetchall()
        out = []
        for r in rows:
            d = dict(r)
            if redact:
                d["api_key"] = _mask(d.get("api_key", ""))
            out.append(d)
        return out

    def default_model(self) -> dict | None:
        with self._lock:
            r = self._db.execute("SELECT * FROM models WHERE is_default=1 LIMIT 1").fetchone()
        return dict(r) if r else None

    def set_default_model(self, mid: str) -> bool:
        with self._lock:
            exists = self._db.execute("SELECT 1 FROM models WHERE id=?", (mid,)).fetchone()
            if not exists:
                return False
            self._db.execute("UPDATE models SET is_default=0")
            self._db.execute("UPDATE models SET is_default=1 WHERE id=?", (mid,))
            self._db.commit()
        return True

    def delete_model(self, mid: str) -> bool:
        with self._lock:
            was_default = self._db.execute("SELECT is_default FROM models WHERE id=?", (mid,)).fetchone()
            cur = self._db.execute("DELETE FROM models WHERE id=?", (mid,))
            if was_default and was_default[0]:
                nxt = self._db.execute("SELECT id FROM models ORDER BY created_at LIMIT 1").fetchone()
                if nxt:
                    self._db.execute("UPDATE models SET is_default=1 WHERE id=?", (nxt[0],))
            self._db.commit()
        return cur.rowcount > 0


def _mask(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "••••"
    return key[:4] + "••••" + key[-4:]
