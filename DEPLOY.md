# ThreatWatch — deploy & run, step by step

Three pieces deploy from **one** GitHub repo:

- **backend/** → Render (Python API)
- **dashboard/** → Vercel (React admin UI)
- **website/** → Vercel (the monitored sample site)

Deploy them in this order — each step produces a value the next one needs.

---

## 0. Accounts & tools (once)

- A free account on **GitHub**, **Render** (render.com), **Vercel** (vercel.com).
- **git** installed. **Python 3.10+** installed (only needed to run the attack simulator).

---

## 1. Push the code to GitHub

In the `threatwatch/` folder (the one containing `backend/`, `website/`, `dashboard/`):

```bash
git init
git add .
git commit -m "ThreatWatch platform"
git branch -M main
git remote add origin https://github.com/<you>/threatwatch.git
git push -u origin main
```

(Or in VS Code: **Source Control → Publish to GitHub**.)

---

## 2. Deploy the BACKEND on Render  → gives TW_INGEST_URL

1. render.com → **New → Blueprint** → pick your repo → **Apply**.
   (It reads `render.yaml` and builds only `backend/`.)
2. Wait for the deploy to finish. Copy the service URL, e.g.
   `https://threatwatch-backend.onrender.com`.
3. Test it: open `<that URL>/api/health` — you should see `{"status":"ok",...}`.

**That URL is your `TW_INGEST_URL`.**

> No Blueprint? New → Web Service → repo → Root Directory `backend`,
> Build `pip install -r requirements.txt`, Start `python run.py`.

---

## 3. Deploy the DASHBOARD on Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. **Root Directory → `dashboard`** (Framework auto-detects as Vite).
3. **Environment Variables** → add:
   `VITE_API_BASE` = your Render URL from step 2.
4. **Deploy.** Copy the result, e.g. `https://threatwatch-dashboard.vercel.app`.
5. Go back to **Render → your service → Environment** and set
   `ALLOWED_ORIGINS` = your dashboard URL, then save (it redeploys).
   *(Without this the browser blocks the dashboard with a CORS error.)*

Open the dashboard URL — the status dot turns green when it reaches the backend.

---

## 4. Add your website in the dashboard  → gives TW_INGEST_KEY

1. In the dashboard: **Integrations → Add a website** (name it, add the URL).
2. The **Agent setup** panel shows the two values — keep them handy:
   - `TW_INGEST_URL` = your Render URL
   - `TW_INGEST_KEY` = `twk_...`  (generated now, for this site)

---

## 5. Deploy the WEBSITE on Vercel (second project, same repo)

1. Vercel → **Add New → Project** → import the **same** repo again.
2. **Root Directory → `website`** (Framework auto-detects as Next.js).
3. **Environment Variables** → add both:
   - `TW_INGEST_URL` = Render URL
   - `TW_INGEST_KEY` = the key from step 4
4. **Deploy.** Copy the result, e.g. `https://your-site.vercel.app`.

---

## 6. Run it / test it

Browse the deployed site — the dashboard's *Integrations* event count rises.
Then drive some attacks (from the `backend/` folder):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install requests
python simulate_attack.py --target https://your-site.vercel.app --scenario all
```

Watch the dashboard — flood, path-scan, injection and beacon alerts appear
within a second or two. Click an alert for its evidence and the **Explain** button.

Single scenarios: `--scenario flood | bruteforce | scan | inject | beacon`.

---

## Alternative: run everything locally (no cloud)

Three terminals:

```bash
# 1 — backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python run.py          # :8000

# 2 — dashboard
cd dashboard && npm install && npm run dev                # :5173

# 3 — website
cd website && npm install
cp .env.example .env.local        # TW_INGEST_URL=http://localhost:8000 + key from dashboard
npm run dev                                               # :3000
```

Add the site in the dashboard (→ key), put it in `website/.env.local`, restart
the website, then run the simulator against `http://localhost:3000`.

---

## Notes

- **Order matters:** backend → dashboard → add site (key) → website.
- Change the backend URL later? Redeploy the dashboard (its `VITE_API_BASE` is
  baked in at build time) and update the website's env var.
- **Render free tier** sleeps after ~15 min idle (first request wakes it, ~30 s)
  and its SQLite data resets on redeploy — fine for a demo. Ask if you want
  persistent storage (free Render Postgres) instead.
- **AI explanations:** Settings → AI models → add OpenAI / Anthropic / local and
  set a default. Until then, alerts use the built-in offline explanation.
