"""
AgriSmart AI — Production Backend Server Entrypoint
Starts standalone FastAPI backend on dynamic $PORT for Railway / Render / Docker.
"""

import os
import sys
from pathlib import Path
import uvicorn

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "model"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"[INFO] Starting AgriSmart AI production backend on 0.0.0.0:{port}...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
