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
    host = os.environ.get("API_HOST", cfg["api"]["host"])
    port = int(os.environ.get("API_PORT", cfg["api"]["port"]))
    print(f"ThreatWatch API on http://{host}:{port}  (dashboard proxies /api and /ws here)")
    uvicorn.run("app.api:app", host=host, port=port, reload=False, log_level="info")
