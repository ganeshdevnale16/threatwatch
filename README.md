# ThreatWatch

A passive web-attack detection platform. You connect a **real website**; its
traffic is mirrored to ThreatWatch, which detects attacks and shows them —
with severity, confidence, evidence and a plain-English AI explanation — on a
live dashboard. It only ever *observes* a copy of the traffic and never sends
anything back to the site.

This repo contains everything to run it end to end:

| Folder | What it is |
|---|---|
| `backend/`   | Python detection API (FastAPI) + attack simulator |
| `website/`   | A real sample site (Next.js) with the monitoring agent, ready for Vercel |
| `dashboard/` | The React dashboard (Deloitte-style green / black / white theme) |

> **Theme & naming.** The UI uses a Deloitte-style palette (signature green
> `#86BC25`, black, white). It is **not** affiliated with or endorsed by
> Deloitte; the product is named ThreatWatch so it never poses as a real firm.

---

## How it works

```
                 real HTTP requests (visitors + attacks)
                          │
                          ▼
        ┌──────────────────────────────────┐
        │  Your website on Vercel           │
        │  middleware.ts  ── monitoring ───┐ │
        └──────────────────────────────────┘ │
                                              │ request metadata only
                                              │ (POST /api/ingest, ingest key)
                                              ▼
        ┌──────────────────────────────────────────────┐
        │  ThreatWatch backend (read-only enclave)       │
        │  ingest → windowed detection → alerts          │
        │    • DDoS / request flood                      │
        │    • path scanning / enumeration               │
        │    • injection probes (SQLi / XSS / traversal) │
        │    • scraper / bot beaconing                   │
        │  assurance: per-detector trust score           │
        │  SQLite store · REST + WebSocket               │
        │  AI explainer (OpenAI / Anthropic / local)     │
        └──────────────────────────────────────────────┘
                                              │
                                              ▼
                          React dashboard (live)
```

The detector sees **metadata only** — method, path, query string, source IP,
user-agent, timing. No request bodies, no cookies, no response content.

---

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- (For deploy) a free Vercel account

---

## 1. Run the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env               # optional
python run.py                      # http://127.0.0.1:8000
```

Verify the detection logic at any time (no server needed):

```bash
python tests/selftest.py
```

## 2. Run the dashboard

```bash
cd dashboard
npm install
npm run dev                        # http://localhost:5173
```

Open **http://localhost:5173**. The status dot turns green when it reaches the
backend. (In dev, Vite proxies `/api` and `/ws` to `:8000`.)

## 3. Connect your website

In the dashboard go to **Integrations → Add a website**. You get a `site_id`
and an **ingest key**, plus an *Agent setup* panel with the two environment
variables to copy.

## 4. Wire up the sample site (locally first)

```bash
cd website
npm install
cp .env.example .env.local
# paste the two values from the dashboard's Agent-setup panel:
#   TW_INGEST_URL=http://localhost:8000
#   TW_INGEST_KEY=twk_...
npm run dev                        # http://localhost:3000
```

Click around http://localhost:3000 — within a couple of seconds the dashboard
shows the site under *Integrations* with a rising event count. (Normal browsing
stays quiet; only attack patterns raise alerts.)

## 5. Simulate attacks

Point the simulator at the running site. It makes **real HTTP requests**, which
the site's agent forwards to the detector:

```bash
cd backend
source .venv/bin/activate
python simulate_attack.py --target http://localhost:3000 --scenario all --spoof-ip
```

Watch the dashboard: floods, path scans, injection probes and scraper beacons
appear as alerts. Open any alert for its evidence, a decision trace, the
recommended action, and an **Explain this alert** button.

Individual scenarios: `--scenario flood | bruteforce | scan | inject | beacon`.
`--spoof-ip` varies the source IP — honoured by `next dev` locally, ignored by
Vercel in production (where a single-source attack is the realistic case).

> Only run the simulator against a site you own or are authorised to test.

---

## 6. Deploy the sample site to Vercel

```bash
cd website
npm i -g vercel        # if you don't have it
vercel                 # first run: link/create the project
```

Then set the two environment variables (Vercel dashboard → your project →
**Settings → Environment Variables**, or via CLI):

```bash
vercel env add TW_INGEST_URL     # your PUBLIC backend URL, e.g. https://api.example.com
vercel env add TW_INGEST_KEY     # the ingest key from the dashboard
vercel --prod                    # deploy to production
```

Your backend must be reachable from Vercel (a public URL, not `localhost`).
Add your dashboard's origin to `backend/config.yaml → api.allowed_origins`, and
deploy the backend wherever you host Python (Render, Fly.io, Railway, a VM…).
Then run the simulator against your `*.vercel.app` URL, or just browse it.

---

## AI model settings

**Settings → AI models.** Add any number of models and pick a default; the
default writes alert explanations. Three provider types:

- **OpenAI** — model like `gpt-4o-mini`, your API key.
- **Anthropic** — model like `claude-sonnet-4-5`, your API key.
- **Local / OpenAI-compatible** — set a base URL (Ollama `http://localhost:11434/v1`,
  LM Studio, vLLM, OpenRouter…).

Use **Test** to check connectivity. With no model configured, explanations fall
back to a built-in offline template, so the feature always works. Keys are
stored in the backend database and shown masked.

---

## What gets detected

| Threat | Signal | MITRE |
|---|---|---|
| **DDoS / flood** | request rate per source or site-wide; 5xx error-rate spike | T1498 |
| **Path scanning** | one source touching many distinct paths / sensitive paths (`/.env`, `/wp-login.php`, …) | T1595 |
| **Injection probe** | SQLi / XSS / traversal / RCE signatures in path + query (double-decoded) | T1190 |
| **Scraper beacon** | sustained, highly regular automated check-ins | T1071 |

**Assurance.** Each detector carries a trust score (0–100). Mark alerts as
false positives and the score falls; a low score is shown on the dashboard and
stamped into every alert that detector raises, so an analyst knows how much to
rely on it.

All thresholds live in `backend/config.yaml` and are fingerprinted into each
alert's decision trace, so tuning is auditable.

---

## Project layout

```
threatwatch/
├── backend/
│   ├── app/
│   │   ├── api.py              FastAPI: ingest, alerts, integrations, models, WS
│   │   ├── config.py           config + detection fingerprint
│   │   ├── store.py            SQLite: integrations, alerts, feedback, models
│   │   ├── assurance.py        per-detector trust score
│   │   ├── detection/          signatures, detectors, streaming engine
│   │   └── ai/                 providers (openai/anthropic/local) + explainer
│   ├── config.yaml             thresholds & settings
│   ├── run.py                  start the API
│   ├── simulate_attack.py      drive real attack traffic at your site
│   └── tests/selftest.py       offline detection check
├── website/                    Next.js sample site + middleware agent (Vercel)
└── dashboard/                  React + Vite dashboard (Deloitte theme)
```

---

## Security notes

- The detector is **receive-only**: it never calls back to monitored sites.
- Only request **metadata** is forwarded — no bodies, cookies or responses. The
  AI explainer additionally pseudonymises source IPs before any model call.
- Ingest keys authenticate each site; treat them as secrets and rotate by
  removing and re-adding the integration.
- This is a prototype: run the backend behind auth/TLS before exposing it, and
  don't commit `backend/data/` or `.env` files (already git-ignored).
```
