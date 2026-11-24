"""Continuous model assurance.

Each detector carries a trust score (0-100). It falls when analysts repeatedly
mark that detector's alerts as false positives. A low score is surfaced on the
dashboard and stamped into every alert that detector raises, so an analyst always
knows how much to rely on it. This watches the models; it never touches traffic.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

DETECTORS = ["flood_detector", "scan_detector", "injection_detector", "beacon_detector"]


class Assurance:
    def __init__(self, cfg: dict, feedback_fn=None):
        self.cfg = cfg["assurance"]
        self.feedback_fn = feedback_fn          # detector -> (total_labelled, false_positives)
        self.alert_times: dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

    def observe_alert(self, detector: str, ts: float) -> None:
        self.alert_times[detector].append(ts)

    def score(self, detector: str) -> int:
        trust = 100
        signals = self._signals(detector)
        trust -= signals["fp_penalty"]
        return max(0, min(100, int(round(trust))))

    def _signals(self, detector: str) -> dict:
        total, fp = 0, 0
        if self.feedback_fn:
            total, fp = self.feedback_fn(detector)
        fp_rate = (fp / total) if total else 0.0
        fp_penalty = 0.0
        if total >= self.cfg["min_feedback"] and fp_rate >= self.cfg["fp_rate_warn"]:
            # scale: at warn-rate lose ~20, climbing to ~45 as fp_rate -> 1
            fp_penalty = 20 + 25 * min(1.0, (fp_rate - self.cfg["fp_rate_warn"]) / (1 - self.cfg["fp_rate_warn"]))
        return {"labelled": total, "false_positives": fp, "fp_rate": round(fp_rate, 3),
                "fp_penalty": round(fp_penalty, 1)}

    def snapshot(self) -> dict:
        now = time.time()
        out = {}
        for det in DETECTORS:
            s = self._signals(det)
            recent = sum(1 for t in self.alert_times[det] if t >= now - 3600) if self.alert_times[det] else len(self.alert_times[det])
            out[det] = {
                "detector": det,
                "trust_score": self.score(det),
                "threshold": self.cfg["trust_alert_below"],
                "status": "degraded" if self.score(det) < self.cfg["trust_alert_below"] else "healthy",
                "alerts_recent": recent,
                "feedback": {"labelled": s["labelled"], "false_positives": s["false_positives"],
                             "fp_rate": s["fp_rate"]},
            }
        return out
