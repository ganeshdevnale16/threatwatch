"""Start the ThreatWatch API.

    python run.py                 # http://127.0.0.1:8000
    API_PORT=9000 python run.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn

from app.config import get_config, load_env

if __name__ == "__main__":
    load_env()
    cfg = get_config()
    # Hosts (Render/Railway/Fly) inject $PORT and need 0.0.0.0 to be reachable.
    host = os.environ.get("API_HOST", "0.0.0.0")
    port = int(os.environ.get("PORT") or os.environ.get("API_PORT") or cfg["api"]["port"])
    print(f"ThreatWatch API on http://{host}:{port}  (dashboard proxies /api and /ws here)")
    uvicorn.run("app.api:app", host=host, port=port, reload=False, log_level="info")
