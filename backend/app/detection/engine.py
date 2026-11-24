"""Streaming detection engine.

Feed it HTTP request events (from any number of integrated sites) and it returns
newly-raised alerts. It holds a short sliding window of per-source state in memory;
nothing is ever sent back to the websites.
"""
from __future__ import annotations

import time
from collections import Counter, deque
from datetime import datetime, timezone

from ..config import config_hash
from .detectors import (DETECTOR_FOR_CLASS, DETECTORS, Entry, SrcState,
                        update_injection)
from .severity import severity_for


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat().replace("+00:00", "Z")


class SiteState:
    def __init__(self) -> None:
        self.sources: dict[str, SrcState] = {}
        self.site_window: deque = deque()     # (ts, status) for distributed-flood view
        self.cooldowns: dict[tuple, float] = {}
        self.total_events = 0
        self.status_counts: Counter = Counter()


class Engine:
    def __init__(self, cfg: dict, assurance=None, on_alert=None):
        self.cfg = cfg
        self.d = cfg["detection"]
        self.window_s = float(self.d["window_s"])
        self.idle_evict_s = float(self.d["idle_evict_s"])
        self.beacon_lookback_s = float(self.d["beacon"]["lookback_s"])
        self.cooldown_s = float(self.d["cooldown_s"])
        self.cfg_hash = config_hash(cfg)
        self.assurance = assurance
        self.on_alert = on_alert
        self.sites: dict[str, SiteState] = {}
        self.max_ts = 0.0
        self._seq = 0

    def _site(self, site_id: str) -> SiteState:
        if site_id not in self.sites:
            self.sites[site_id] = SiteState()
        return self.sites[site_id]

    def _next_id(self) -> str:
        self._seq += 1
        return f"alert-{int(time.time())}-{self._seq:06d}"

    def _cooled(self, ss: SiteState, key: tuple, now: float) -> bool:
        last = ss.cooldowns.get(key)
        if last is not None and (now - last) < self.cooldown_s:
            return True
        ss.cooldowns[key] = now
        return False

    def ingest(self, site_id: str, site_name: str, events: list[dict]) -> list[dict]:
        ss = self._site(site_id)
        alerts: list[dict] = []
        for ev in sorted(events, key=lambda e: e.get("ts", 0.0)):
            ts = float(ev.get("ts") or time.time())
            if ts > self.max_ts:
                self.max_ts = ts
            ws = ts - self.window_s
            ip = str(ev.get("ip") or "0.0.0.0")
            entry = Entry(ts, str(ev.get("method", "GET")), str(ev.get("path", "/")),
                          str(ev.get("query", "")), int(ev.get("status") or 0), str(ev.get("ua", "")))
            st = ss.sources.get(ip)
            if st is None:
                st = ss.sources[ip] = SrcState(ip)
            st.add(entry, ws, ts - self.beacon_lookback_s)
            update_injection(st, entry)
            ss.total_events += 1
            ss.status_counts[entry.status // 100 * 100 if entry.status else 0] += 1
            ss.site_window.append((ts, entry.status))
            while ss.site_window and ss.site_window[0][0] < ws:
                ss.site_window.popleft()

            for cand in self._run_detectors(st, ws, ts):
                a = self._emit(ss, site_id, site_name, cand, ts)
                if a:
                    alerts.append(a)

            site_alert = self._site_flood(ss, ws, ts)
            if site_alert:
                a = self._emit(ss, site_id, site_name, site_alert, ts, entity="site-wide")
                if a:
                    alerts.append(a)

        self._evict(ss)
        return alerts

    def _run_detectors(self, st: SrcState, ws: float, we: float):
        for fn in DETECTORS.values():
            cand = fn(st, self.cfg, ws, we)
            if cand:
                yield cand

    def _site_flood(self, ss: SiteState, ws: float, we: float):
        f = self.d["flood"]
        n = len(ss.site_window)
        if n < f["site_req_threshold"]:
            return None
        from .detectors import Candidate
        score = round(min(0.99, 0.80 + 0.19 * min(1.0, n / (f["site_req_threshold"] * 2))), 4)
        return Candidate(
            "ddos_flood", "distributed-flood", score, "site-wide",
            {"requests": n, "req_per_s": round(n / max(1.0, we - ws), 2)},
            {"site_req_threshold": f["site_req_threshold"]},
            [], [f"{n} requests site-wide in {int(we - ws)}s across many sources"], ws, we,
        )

    def _emit(self, ss, site_id, site_name, cand, now, entity=None):
        ent = entity or cand.entity
        key = (cand.threat_class, ent)
        if self._cooled(ss, key, now):
            return None
        detector = DETECTOR_FOR_CLASS[cand.threat_class]
        trust = self.assurance.score(detector) if self.assurance else None
        sev = severity_for(cand.score, self.cfg)
        alert = {
            "alert_id": self._next_id(),
            "site_id": site_id,
            "site_name": site_name,
            "timestamp": _iso(cand.window_end),
            "threat_class": cand.threat_class,
            "attack_subtype": cand.subtype,
            "severity": sev,
            "confidence": cand.score,
            "entity": ent,
            "detector": detector,
            "evidence": {
                "features": cand.features,
                "thresholds": cand.thresholds,
                "samples": cand.samples,
                "signals": cand.signals,
            },
            "trace": {
                "config_hash": self.cfg_hash,
                "window_start": round(cand.window_start, 3),
                "window_end": round(cand.window_end, 3),
                "raw_score": cand.score,
                "detector_trust_score": trust,
            },
            "mitre_attack": cand.mitre,
            "recommended_action": cand.action,
            "ai_explanation": None,
        }
        if self.assurance:
            self.assurance.observe_alert(detector, now)
        if self.on_alert:
            self.on_alert(alert)
        return alert

    def _evict(self, ss: SiteState) -> None:
        cutoff = self.max_ts - self.idle_evict_s
        dead = [ip for ip, st in ss.sources.items() if st.last_ts < cutoff]
        for ip in dead:
            del ss.sources[ip]
        # keep cooldown table from growing without bound
        ss.cooldowns = {k: v for k, v in ss.cooldowns.items() if v >= cutoff}

    # ---- live stats for the dashboard -----------------------------------
    def stats(self) -> dict:
        out = {"sites": {}, "total_events": 0, "active_sources": 0}
        for sid, ss in self.sites.items():
            srcs = ss.sources
            top = sorted(srcs.values(), key=lambda s: s.count(), reverse=True)[:8]
            win_events = sum(s.count() for s in srcs.values())
            out["sites"][sid] = {
                "total_events": ss.total_events,
                "window_events": win_events,
                "req_per_s": round(win_events / self.window_s, 2),
                "active_sources": len(srcs),
                "status_mix": dict(ss.status_counts),
                "top_talkers": [{"ip": s.ip, "requests": s.count()} for s in top],
            }
            out["total_events"] += ss.total_events
            out["active_sources"] += len(srcs)
        return out
