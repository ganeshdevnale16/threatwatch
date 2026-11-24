"""Map a detector's raw 0-1 score to a severity band."""
from __future__ import annotations


def severity_for(score: float, cfg: dict) -> str:
    s = cfg["severity"]
    if score >= 0.97:
        return "critical"
    if score >= s["high"]:
        return "high"
    if score >= s["medium"]:
        return "medium"
    return "low"
