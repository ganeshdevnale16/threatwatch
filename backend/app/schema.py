"""Request/response and alert schemas (Pydantic v2)."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

ThreatClass = Literal["ddos_flood", "path_scanning", "injection_probe", "scraper_beacon"]
Severity = Literal["low", "medium", "high", "critical"]


class RequestEvent(BaseModel):
    """One HTTP request, as forwarded by a site's monitoring agent."""
    ts: float                              # epoch seconds (client or edge time)
    ip: str
    method: str = "GET"
    path: str = "/"
    query: str = ""
    status: int = 0
    ua: str = ""
    referer: str = ""
    latency_ms: float = 0.0
    bytes: int = 0
    country: str = ""


class IngestBatch(BaseModel):
    events: list[RequestEvent]


class Evidence(BaseModel):
    features: dict[str, Any]
    thresholds: dict[str, Any]
    samples: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)


class Trace(BaseModel):
    config_hash: str
    window_start: float
    window_end: float
    raw_score: float
    detector_trust_score: Optional[int] = None


class Alert(BaseModel):
    alert_id: str
    site_id: str
    site_name: str = ""
    timestamp: str
    threat_class: ThreatClass
    attack_subtype: Optional[str] = None
    severity: Severity
    confidence: float = Field(ge=0, le=1)
    entity: str                            # usually the source IP (or IP -> path)
    detector: str
    evidence: Evidence
    trace: Trace
    mitre_attack: str
    recommended_action: str
    ai_explanation: Optional[str] = None


class IntegrationIn(BaseModel):
    name: str
    url: str = ""


class FeedbackIn(BaseModel):
    verdict: Literal["true_positive", "false_positive"]
    note: Optional[str] = None


class ModelIn(BaseModel):
    label: str
    provider: Literal["openai", "azure", "anthropic", "local"]
    model: str                             # for azure this is the DEPLOYMENT name
    api_key: str = ""
    base_url: str = ""                     # local: OpenAI-compatible URL · azure: endpoint
    api_version: str = ""                  # azure only, e.g. 2024-06-01
    make_default: bool = False
