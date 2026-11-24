"""Pluggable AI providers for alert explanation.

Three provider types, all configured from the dashboard Settings page:
  - openai     : api.openai.com (or any OpenAI-compatible host via base_url)
  - anthropic  : api.anthropic.com Messages API
  - local      : an OpenAI-compatible endpoint you run yourself (Ollama, LM Studio,
                 vLLM, LocalAI, OpenRouter, ...), configured with base_url

Only this module makes outbound AI calls, and only to explain a finished alert.
It is never on the detection path.
"""
from __future__ import annotations

import requests

TIMEOUT = 30


class ProviderError(RuntimeError):
    pass


def call_model(cfg: dict, system: str, user: str, max_tokens: int = 320) -> str:
    provider = (cfg.get("provider") or "").lower()
    if provider == "anthropic":
        return _anthropic(cfg, system, user, max_tokens)
    if provider in ("openai", "local"):
        return _openai_compatible(cfg, system, user, max_tokens)
    raise ProviderError(f"unknown provider: {provider!r}")


def _openai_compatible(cfg: dict, system: str, user: str, max_tokens: int) -> str:
    base = (cfg.get("base_url") or "https://api.openai.com/v1").rstrip("/")
    key = cfg.get("api_key") or ""
    if cfg.get("provider") == "local" and not cfg.get("base_url"):
        raise ProviderError("local provider needs a base_url (e.g. http://localhost:11434/v1)")
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    body = {
        "model": cfg["model"],
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    r = requests.post(f"{base}/chat/completions", json=body, headers=headers, timeout=TIMEOUT)
    if r.status_code >= 400:
        raise ProviderError(f"{r.status_code}: {r.text[:300]}")
    data = r.json()
    return data["choices"][0]["message"]["content"].strip()


def _anthropic(cfg: dict, system: str, user: str, max_tokens: int) -> str:
    base = (cfg.get("base_url") or "https://api.anthropic.com").rstrip("/")
    headers = {
        "Content-Type": "application/json",
        "x-api-key": cfg.get("api_key") or "",
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": cfg["model"],
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    r = requests.post(f"{base}/v1/messages", json=body, headers=headers, timeout=TIMEOUT)
    if r.status_code >= 400:
        raise ProviderError(f"{r.status_code}: {r.text[:300]}")
    data = r.json()
    parts = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    return "".join(parts).strip()


def probe(cfg: dict) -> dict:
    """Lightweight connectivity check used by the Settings 'Test' button."""
    try:
        text = call_model(cfg, "You are a connectivity test.", "Reply with the single word: ok", max_tokens=8)
        return {"ok": True, "reply": text[:60]}
    except Exception as e:  # noqa: BLE001 — surfaced verbatim to the UI
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}
