"""Standalone detection self-test — no FastAPI/network needed.

    python tests/selftest.py

Feeds synthetic traffic for each attack type through the engine and asserts the
right threat class is raised (and that benign traffic stays quiet).
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_config
from app.detection.engine import Engine


def ev(ts, ip, path="/", query="", status=200, method="GET", ua="Mozilla/5.0"):
    return {"ts": ts, "ip": ip, "method": method, "path": path, "query": query,
            "status": status, "ua": ua}


def run():
    cfg = get_config()
    base = time.time()
    results = {}

    # 1) request flood from one IP
    e = Engine(cfg)
    evs = [ev(base + i * 0.1, "203.0.113.9", path=f"/page/{i%5}") for i in range(200)]
    alerts = e.ingest("site_a", "A", evs)
    results["flood"] = {a["threat_class"] for a in alerts}

    # 2) path scanning: many distinct paths, mostly 404, plus a sensitive hit
    e = Engine(cfg)
    evs = [ev(base + i * 0.5, "198.51.100.7", path=f"/admin/try{i}", status=404) for i in range(40)]
    evs.append(ev(base + 21, "198.51.100.7", path="/.env", status=404))
    alerts = e.ingest("site_a", "A", evs)
    results["scan"] = {a["threat_class"] for a in alerts}

    # 3) injection probe
    e = Engine(cfg)
    evs = [
        ev(base, "192.0.2.5", path="/search", query="q=1' UNION SELECT password FROM users--"),
        ev(base + 1, "192.0.2.5", path="/item", query="id=../../../../etc/passwd"),
        ev(base + 2, "192.0.2.5", path="/c", query="x=<script>alert(1)</script>"),
    ]
    alerts = e.ingest("site_a", "A", evs)
    results["injection"] = {a["threat_class"] for a in alerts}

    # 4) scraper beacon: very regular check-ins over a long span
    e = Engine(cfg)
    evs = [ev(base + i * 10.0, "203.0.113.50", path="/api/price", ua="python-requests/2.31")
           for i in range(20)]
    alerts = e.ingest("site_a", "A", evs)
    results["beacon"] = {a["threat_class"] for a in alerts}

    # 5) benign traffic should stay quiet
    e = Engine(cfg)
    import random
    rng = random.Random(1)
    evs = []
    for i in range(80):
        ip = f"10.0.0.{rng.randint(1, 40)}"
        evs.append(ev(base + i * 0.7 + rng.random(), ip,
                      path=rng.choice(["/", "/about", "/products", "/cart", "/blog/x"]),
                      status=rng.choice([200, 200, 200, 304])))
    alerts = e.ingest("site_a", "A", evs)
    results["benign"] = {a["threat_class"] for a in alerts}

    # ---- assertions ----
    checks = [
        ("flood raises ddos_flood", "ddos_flood" in results["flood"]),
        ("scan raises path_scanning", "path_scanning" in results["scan"]),
        ("injection raises injection_probe", "injection_probe" in results["injection"]),
        ("beacon raises scraper_beacon", "scraper_beacon" in results["beacon"]),
        ("benign stays quiet", len(results["benign"]) == 0),
    ]
    ok = True
    for name, passed in checks:
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        ok = ok and passed
    print("\nraised per scenario:", {k: sorted(v) for k, v in results.items()})
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(run())
