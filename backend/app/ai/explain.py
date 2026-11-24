"""Explain a finished alert in plain English for an analyst.

Uses the default configured model if there is one, otherwise a built-in offline
template so the feature always works. Only redacted alert fields are sent out:
the source IP is pseudonymised and no raw query strings leave the enclave.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets

from .providers import call_model

_SALT = secrets.token_bytes(16)   # per-process: pseudonyms can't be linked across runs
_IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

CLASS_TEXT = {
    "ddos_flood": "a flood of requests aimed at overwhelming the site",
    "path_scanning": "one client probing many URLs, a pattern typical of reconnaissance / scanning",
    "injection_probe": "requests carrying SQL-injection, XSS or path-traversal style payloads in the URL",
    "scraper_beacon": "a client making very regular, automated requests, typical of a scraper or bot",
}

SYSTEM = ("You explain web-security alerts to a SOC analyst in plain English, in 4 sentences or fewer. "
          "Say what the evidence shows and what the analyst should check next. Do not invent facts beyond "
          "the data given. Never recommend automatic blocking — a human decides any action.")


def _pseudo(text: str) -> str:
    def rep(m):
        h = hmac.new(_SALT, m.group(0).encode(), hashlib.sha256).hexdigest()[:6]
        return f"host-{h}"
    return _IP.sub(rep, text or "")


def redact(alert: dict) -> dict:
    ev = alert["evidence"]
    return {
        "threat_class": alert["threat_class"],
        "attack_subtype": alert.get("attack_subtype"),
        "severity": alert["severity"],
        "confidence": alert["confidence"],
        "entity": _pseudo(alert["entity"]),
        "features": ev["features"],
        "signals": [_pseudo(s) for s in ev.get("signals", [])],
        "mitre_attack": alert["mitre_attack"],
        "detector_trust_score": alert["trace"].get("detector_trust_score"),
    }


def template_explanation(alert: dict) -> str:
    r = redact(alert)
    f = r["features"]
    what = CLASS_TEXT.get(r["threat_class"], r["threat_class"])
    lines = [f"The {alert['detector']} flagged {what} from {r['entity']} with "
             f"{r['confidence']:.0%} confidence ({r['severity']} severity)."]
    if r["threat_class"] == "ddos_flood":
        lines.append(f"It saw {f.get('requests')} requests (~{f.get('req_per_s')}/s)"
                     + (f", {f.get('error_ratio', 0):.0%} of them server errors." if 'error_ratio' in f else "."))
    elif r["threat_class"] == "path_scanning":
        lines.append(f"The source touched {f.get('distinct_paths')} distinct paths with "
                     f"{f.get('notfound_ratio', 0):.0%} returning 404, and hit {f.get('sensitive_hits', 0)} sensitive path(s).")
    elif r["threat_class"] == "injection_probe":
        lines.append(f"{f.get('payloads_seen')} suspicious request(s) matched: {', '.join(f.get('kinds', []))}.")
    else:
        lines.append(f"{f.get('events')} requests at a steady ~{f.get('interval_mean_s')}s interval "
                     f"(only {f.get('interval_cv', 0):.0%} variation).")
    if r["signals"]:
        lines.append("Evidence: " + "; ".join(r["signals"]) + ".")
    if r["detector_trust_score"] is not None and r["detector_trust_score"] < 70:
        lines.append(f"Note: this detector's trust score is {r['detector_trust_score']} — verify manually.")
    lines.append("This system only informs; an analyst decides any action.")
    return " ".join(lines)


def explain(alert: dict, model_cfg: dict | None) -> dict:
    if model_cfg:
        try:
            text = call_model(model_cfg, SYSTEM, f"Redacted alert: {redact(alert)}")
            return {"source": f"{model_cfg['provider']}:{model_cfg['model']}", "text": text}
        except Exception as e:  # noqa: BLE001 — never fail the analyst; fall back
            return {"source": "offline_template", "text": template_explanation(alert),
                    "note": f"AI model unavailable ({type(e).__name__}); used offline explanation"}
    return {"source": "offline_template", "text": template_explanation(alert)}
