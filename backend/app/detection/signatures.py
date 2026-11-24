"""Signature matching for injection-style probes in the URL path and query string.

We only ever see request *metadata* (method, path, query) — never request bodies
or decrypted payloads — so these patterns are deliberately conservative and each
carries a weight. A single weak hit does not raise an alert; the detector sums the
weights of everything matched in the window.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import unquote


@dataclass(frozen=True)
class Signature:
    sid: str
    label: str
    kind: str          # sqli | xss | traversal | rce | lfi
    weight: float
    pattern: re.Pattern


def _c(p: str) -> re.Pattern:
    return re.compile(p, re.IGNORECASE)


SIGNATURES: list[Signature] = [
    # SQL injection
    Signature("sqli-union", "UNION SELECT", "sqli", 0.65, _c(r"union\s+(all\s+)?select")),
    Signature("sqli-orand", "boolean tautology", "sqli", 0.45, _c(r"(or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+")),
    Signature("sqli-comment", "SQL comment terminator", "sqli", 0.30, _c(r"(--|#|/\*)\s*$")),
    Signature("sqli-sleep", "time-based payload", "sqli", 0.60, _c(r"(sleep|pg_sleep|waitfor\s+delay|benchmark)\s*\(")),
    Signature("sqli-stacked", "stacked query", "sqli", 0.40, _c(r";\s*(drop|insert|update|delete|select)\s")),
    # Cross-site scripting
    Signature("xss-script", "<script> tag", "xss", 0.60, _c(r"<\s*script")),
    Signature("xss-onerror", "event handler", "xss", 0.45, _c(r"on(error|load|mouseover|click)\s*=")),
    Signature("xss-js", "javascript: uri", "xss", 0.40, _c(r"javascript:")),
    Signature("xss-svg", "svg/img onload", "xss", 0.40, _c(r"<\s*(svg|img)[^>]*on\w+\s*=")),
    # Path traversal / local file inclusion
    Signature("trav-dotdot", "../ traversal", "traversal", 0.55, _c(r"(\.\./|\.\.\\|%2e%2e[/\\])")),
    Signature("lfi-etcpasswd", "/etc/passwd", "lfi", 0.70, _c(r"etc/passwd")),
    Signature("lfi-wrapper", "php:// wrapper", "lfi", 0.55, _c(r"(php|file|data|expect)://")),
    # Remote command execution
    Signature("rce-shell", "shell metacharacters", "rce", 0.45, _c(r"[;|`]\s*(cat|ls|id|whoami|curl|wget|nc)\b")),
    Signature("rce-subst", "command substitution", "rce", 0.50, _c(r"\$\(|\bexec\s*\(")),
]


def scan_text(raw: str) -> list[Signature]:
    """Return every signature that matches the (url-decoded) text."""
    if not raw:
        return []
    text = unquote(raw)
    # decode twice: attackers frequently double-encode to slip past naive filters
    text2 = unquote(text)
    hits: list[Signature] = []
    for sig in SIGNATURES:
        if sig.pattern.search(text) or (text2 != text and sig.pattern.search(text2)):
            hits.append(sig)
    return hits


def score_hits(hits: list[Signature]) -> float:
    """Combine signature weights into a 0-1 confidence (diminishing returns)."""
    if not hits:
        return 0.0
    # Probabilistic OR of independent weights: 1 - prod(1 - w)
    prod = 1.0
    for s in hits:
        prod *= (1.0 - min(0.95, s.weight))
    return round(1.0 - prod, 4)
