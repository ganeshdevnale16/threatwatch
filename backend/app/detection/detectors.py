"""Per-source state and the four web-attack detectors.

Everything here works on request *metadata* only and is read-only: it observes a
copy of the traffic and produces alerts. It can never act on the website.
"""
from __future__ import annotations

import statistics
from collections import deque
from dataclasses import dataclass, field

from .signatures import scan_text, score_hits


def _interval_cv(ts: list[float]) -> float:
    """Coefficient of variation of the gaps between sorted timestamps (lower = more regular)."""
    if len(ts) < 3:
        return 1.0
    gaps = [b - a for a, b in zip(ts, ts[1:]) if b > a]
    if len(gaps) < 2:
        return 1.0
    m = statistics.fmean(gaps)
    if m <= 0:
        return 1.0
    return statistics.pstdev(gaps) / m


MITRE = {
    "ddos_flood": "T1498 — Network Denial of Service",
    "path_scanning": "T1595 — Active Scanning",
    "injection_probe": "T1190 — Exploit Public-Facing Application",
    "scraper_beacon": "T1071.001 — Application Layer Protocol: Web",
}

ACTION = {
    "ddos_flood": "Confirm the source against your CDN/WAF rate-limit logs; consider a temporary "
                  "rate limit or challenge for the offending range. Do not block automatically.",
    "path_scanning": "Review the probed paths; ensure the sensitive ones return 404 and are not "
                     "actually served. Consider adding the source to a watchlist.",
    "injection_probe": "Inspect the matched requests and confirm the endpoint is parameterised / "
                       "sanitised. Check whether any probe returned 200 with unexpected length.",
    "scraper_beacon": "Decide whether this automated client is permitted (monitoring, partner) or "
                      "an unwanted scraper; apply robots / rate policy as appropriate.",
}


@dataclass
class Entry:
    ts: float
    method: str
    path: str
    query: str
    status: int
    ua: str


@dataclass
class SrcState:
    ip: str
    events: deque = field(default_factory=deque)   # Entry, within the short window
    beacon_ts: deque = field(default_factory=deque)  # timestamps, within the longer beacon look-back
    last_ts: float = 0.0
    last_ua: str = ""
    # injection evidence accumulates across the short window
    inj_score: float = 0.0
    inj_samples: list = field(default_factory=list)
    inj_signals: set = field(default_factory=set)

    def add(self, e: Entry, window_start: float, beacon_cutoff: float) -> None:
        self.events.append(e)
        self.beacon_ts.append(e.ts)
        self.last_ts = e.ts
        self.last_ua = e.ua
        while self.events and self.events[0].ts < window_start:
            self.events.popleft()
        while self.beacon_ts and self.beacon_ts[0] < beacon_cutoff:
            self.beacon_ts.popleft()

    # ---- derived views -------------------------------------------------
    def count(self) -> int:
        return len(self.events)

    def distinct_paths(self) -> int:
        return len({e.path for e in self.events})

    def notfound_ratio(self) -> float:
        n = self.count()
        if not n:
            return 0.0
        return sum(1 for e in self.events if e.status == 404) / n

    def error_ratio(self) -> float:
        # Only genuine server errors. status 0 = "unknown" (edge middleware runs
        # before the response), which must NOT count as an error or ordinary
        # browsing would look like origin exhaustion.
        known = [e for e in self.events if e.status]
        if not known:
            return 0.0
        return sum(1 for e in known if e.status >= 500) / len(known)

    def interval_cv(self) -> float:
        ts = sorted(e.ts for e in self.events)
        if len(ts) < 3:
            return 1.0
        gaps = [b - a for a, b in zip(ts, ts[1:]) if b > a]
        if len(gaps) < 2:
            return 1.0
        m = statistics.fmean(gaps)
        if m <= 0:
            return 1.0
        return statistics.pstdev(gaps) / m

    def span_s(self) -> float:
        if not self.events:
            return 0.0
        return self.events[-1].ts - self.events[0].ts


@dataclass
class Candidate:
    threat_class: str
    subtype: str
    score: float
    entity: str
    features: dict
    thresholds: dict
    samples: list
    signals: list
    window_start: float
    window_end: float

    @property
    def mitre(self) -> str:
        return MITRE[self.threat_class]

    @property
    def action(self) -> str:
        return ACTION[self.threat_class]


# --------------------------------------------------------------------------
# Detectors. Each returns a Candidate or None for a single source IP.
# --------------------------------------------------------------------------
def detect_flood(st: SrcState, cfg: dict, ws: float, we: float) -> Candidate | None:
    f = cfg["detection"]["flood"]
    n = st.count()
    if n < f["min_requests"]:
        return None
    err = st.error_ratio()
    over_rate = n >= f["ip_req_threshold"]
    over_err = err >= f["error_ratio_warn"] and n >= f["min_requests"]
    if not (over_rate or over_err):
        return None
    # score grows with how far over threshold we are, plus the error signal
    rate_term = min(1.0, n / (f["ip_req_threshold"] * 1.5))
    err_term = min(1.0, err / max(0.01, f["error_ratio_warn"]))
    score = round(min(0.99, 0.55 + 0.35 * rate_term + 0.10 * err_term), 4)
    subtype = "origin-exhaustion" if over_err else "request-flood"
    signals = []
    if over_rate:
        signals.append(f"{n} requests from one source in {int(we - ws)}s")
    if over_err:
        signals.append(f"{err:.0%} of responses were 5xx/timeout")
    return Candidate(
        "ddos_flood", subtype, score, st.ip,
        {"requests": n, "error_ratio": round(err, 3), "req_per_s": round(n / max(1.0, we - ws), 2)},
        {"ip_req_threshold": f["ip_req_threshold"], "error_ratio_warn": f["error_ratio_warn"]},
        [f"{e.method} {e.path}" for e in list(st.events)[-3:]], signals, ws, we,
    )


def detect_scan(st: SrcState, cfg: dict, ws: float, we: float) -> Candidate | None:
    s = cfg["detection"]["scan"]
    n = st.count()
    if n < s["min_requests"]:
        return None
    sensitive = {p.lower() for p in s["sensitive_paths"]}
    sens_hits = [e for e in st.events if any(e.path.lower().startswith(p) for p in sensitive)]
    distinct = st.distinct_paths()
    nf = st.notfound_ratio()
    # Fraction of events whose status we actually know. Edge middleware forwards
    # status 0 (unknown), so when status is mostly unavailable we fall back to
    # distinct-path volume alone (at a higher bar) instead of the 404 ratio.
    known = (sum(1 for e in st.events if e.status) / n) if n else 0.0
    if known >= 0.3:
        broad_scan = distinct >= s["distinct_paths_threshold"] and nf >= s["notfound_ratio_warn"]
    else:
        broad_scan = distinct >= int(s["distinct_paths_threshold"] * 1.2)
    targeted = len(sens_hits) >= 1
    if not (broad_scan or targeted):
        return None
    score = 0.55
    signals = []
    if broad_scan:
        score += 0.30 * min(1.0, distinct / (s["distinct_paths_threshold"] * 2))
        signals.append(f"{distinct} distinct paths"
                       + (f", {nf:.0%} returned 404" if known >= 0.3 else " (status not observed at edge)"))
    if targeted:
        score += 0.35
        names = sorted({e.path for e in sens_hits})[:4]
        signals.append("probed sensitive paths: " + ", ".join(names))
    score = round(min(0.99, score), 4)
    subtype = "sensitive-path-probe" if targeted else "endpoint-enumeration"
    samples = [f"{e.method} {e.path} -> {e.status}" for e in (sens_hits or list(st.events))[-4:]]
    return Candidate(
        "path_scanning", subtype, score, st.ip,
        {"distinct_paths": distinct, "notfound_ratio": round(nf, 3),
         "sensitive_hits": len(sens_hits), "requests": n},
        {"distinct_paths_threshold": s["distinct_paths_threshold"], "notfound_ratio_warn": s["notfound_ratio_warn"]},
        samples, signals, ws, we,
    )


def detect_injection(st: SrcState, cfg: dict, ws: float, we: float) -> Candidate | None:
    inj = cfg["detection"]["injection"]
    if st.inj_score < inj["min_confidence"]:
        return None
    kinds = sorted({s.split(":")[0] for s in st.inj_signals})
    subtype = "/".join(kinds) if kinds else "generic"
    return Candidate(
        "injection_probe", subtype, round(min(0.99, st.inj_score), 4), st.ip,
        {"payloads_seen": len(st.inj_samples), "kinds": kinds},
        {"min_confidence": inj["min_confidence"]},
        st.inj_samples[-4:], sorted(st.inj_signals), ws, we,
    )


def detect_beacon(st: SrcState, cfg: dict, ws: float, we: float) -> Candidate | None:
    b = cfg["detection"]["beacon"]
    ts = sorted(st.beacon_ts)
    n = len(ts)
    span = (ts[-1] - ts[0]) if n >= 2 else 0.0
    if n < b["min_events"] or span < b["min_span_s"]:
        return None
    cv = _interval_cv(ts)
    if cv > b["interval_cv_max"]:
        return None
    # highly regular + sustained; UA that looks automated bumps the score
    ua = (st.last_ua or "").lower()
    bot = any(k in ua for k in ("bot", "crawl", "spider", "python", "curl", "scrapy", "http-client")) or not ua
    score = round(min(0.98, 0.70 + 0.20 * (1 - cv / b["interval_cv_max"]) + (0.08 if bot else 0.0)), 4)
    gap = span / max(1, n - 1)
    return Candidate(
        "scraper_beacon", "automated-client" if bot else "regular-poller", score, st.ip,
        {"events": n, "interval_cv": round(cv, 3), "interval_mean_s": round(gap, 1), "bot_ua": bot},
        {"interval_cv_max": b["interval_cv_max"], "min_events": b["min_events"]},
        [f"{e.method} {e.path}" for e in list(st.events)[-3:]],
        [f"check-in every ~{gap:.0f}s with {cv:.0%} variation"], ws, we,
    )


DETECTORS = {
    "flood_detector": detect_flood,
    "scan_detector": detect_scan,
    "injection_detector": detect_injection,
    "beacon_detector": detect_beacon,
}

DETECTOR_FOR_CLASS = {
    "ddos_flood": "flood_detector",
    "path_scanning": "scan_detector",
    "injection_probe": "injection_detector",
    "scraper_beacon": "beacon_detector",
}


def update_injection(st: SrcState, e: Entry) -> None:
    """Accumulate injection evidence as each request arrives."""
    hits = scan_text(e.path) + scan_text(e.query)
    if not hits:
        return
    sc = score_hits(hits)
    # keep the strongest observed confidence for this source in the window
    st.inj_score = max(st.inj_score, sc)
    sample = f"{e.method} {e.path}" + (f"?{e.query}" if e.query else "")
    st.inj_samples.append(sample[:200])
    for h in hits:
        st.inj_signals.add(f"{h.kind}:{h.label}")
