"""
AgriSmart AI — Production-Grade Local Development Launcher & Entry Point
Orchestrates FastAPI backend and Next.js frontend, or starts standalone backend if PORT is provided.
"""

import os
import sys
import time
import socket
import urllib.request
import subprocess
from pathlib import Path

# Fix Windows console cp1252 UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "frontend"


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a port is actively in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def wait_for_http(url: str, timeout: float = 30.0, step: float = 0.1) -> bool:
    """Poll an HTTP URL until it returns 200 OK or timeout expires."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "AgriSmart-Launcher"})
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(step)
    return False


def check_prerequisites() -> bool:
    """Verify essential files and libraries."""
    print("[1/4] Checking prerequisites...")
    
    # Model weights
    weights = PROJECT_ROOT / "model" / "weights" / "best_model.pth"
    if weights.exists():
        size_mb = weights.stat().st_size / (1024 * 1024)
        print(f"  [OK] ML model found: model/weights/best_model.pth ({size_mb:.1f} MB)")
    else:
        print("  [WARN] ML model weights not found at model/weights/best_model.pth")
    
    # Python packages
    try:
        import torch
        import fastapi
        import uvicorn
        from PIL import Image
        cuda_status = f"CUDA enabled ({torch.cuda.get_device_name(0)})" if torch.cuda.is_available() else "CPU mode"
        print(f"  [OK] Python dependencies verified: PyTorch {torch.__version__} [{cuda_status}]")
    except ImportError as e:
        print(f"  [ERROR] Missing Python package: {e}")
        print("          Run: pip install -r requirements.txt")
        return False
    
    # Node dependencies
    if not (FRONTEND_DIR / "node_modules").exists():
        print("  [INFO] Installing frontend node_modules...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=str(FRONTEND_DIR), check=True)
    print("  [OK] Frontend dependencies verified.")
    
    return True


def kill_proc_tree(proc: subprocess.Popen):
    """Cleanly terminate a process and all its children."""
    if proc is None or proc.poll() is not None:
        return
    
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        else:
            proc.terminate()
            proc.wait(timeout=3)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def main():
    print("=" * 70)
    print("  AgriSmart AI -- Intelligent Agriculture Development Server")
    print("=" * 70)
    
    if not check_prerequisites():
        sys.exit(1)
    
    # Port conflict checks
    if is_port_in_use(8000):
        print("  [NOTE] Port 8000 is already in use.")
        if wait_for_http("http://127.0.0.1:8000/api/health", timeout=2.0):
            print("  [OK] Existing AgriSmart backend is responding on port 8000.")
            backend_proc = None
        else:
            print("  [ERROR] Port 8000 is occupied by an unresponsive process.")
            sys.exit(1)
    else:
        print("[2/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn", "backend.main:app",
            "--host", "0.0.0.0", "--port", "8000"
        ]
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(PROJECT_ROOT))
        
        # Wait for backend to be ready
        if wait_for_http("http://127.0.0.1:8000/api/health", timeout=15.0):
            print("  [OK] Backend healthy and ready at http://127.0.0.1:8000")
        else:
            print("  [ERROR] Backend failed to start within 15 seconds.")
            kill_proc_tree(backend_proc)
            sys.exit(1)
    
    if is_port_in_use(3000):
        print("  [NOTE] Port 3000 is already in use.")
        if wait_for_http("http://localhost:3000", timeout=2.0):
            print("  [OK] Existing AgriSmart frontend is responding on port 3000.")
            frontend_proc = None
        else:
            print("  [ERROR] Port 3000 is occupied by an unresponsive process.")
            if backend_proc:
                kill_proc_tree(backend_proc)
            sys.exit(1)
    else:
        print("[3/4] Starting Next.js Frontend on http://localhost:3000 ...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=str(FRONTEND_DIR))
        
        # Wait for frontend to be ready
        if wait_for_http("http://127.0.0.1:3000", timeout=40.0):
            print("  [OK] Frontend healthy and ready at http://localhost:3000")
        else:
            print("  [ERROR] Frontend failed to start within 20 seconds.")
            if backend_proc:
                kill_proc_tree(backend_proc)
            kill_proc_tree(frontend_proc)
            sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  [4/4] ALL SERVICES OPERATIONAL")
    print("=" * 70)
    print("  Frontend Dashboard: http://localhost:3000")
    print("  Disease Detect UI:  http://localhost:3000/detect")
    print("  Weather Page:       http://localhost:3000/weather")
    print("  AI Assistant:       http://localhost:3000/assistant")
    print("  API Interactive UI: http://localhost:8000/docs")
    print("  Backend Health:     http://localhost:8000/api/health")
    print("=" * 70)
    print("  Press Ctrl+C to safely shut down all services")
    print("=" * 70 + "\n")
    
    try:
        while True:
            time.sleep(1.0)
            if backend_proc and backend_proc.poll() is not None:
                print(f"[WARN] Backend exited unexpectedly with code {backend_proc.poll()}")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"[WARN] Frontend exited unexpectedly with code {frontend_proc.poll()}")
                break
    except KeyboardInterrupt:
        print("\n[INFO] Gracefully shutting down AgriSmart AI services...")
    finally:
        if backend_proc:
            kill_proc_tree(backend_proc)
        if frontend_proc:
            kill_proc_tree(frontend_proc)
        print("[INFO] All services stopped cleanly.")


if __name__ == "__main__":
    if "PORT" in os.environ and os.environ.get("PORT") != "8000":
        import uvicorn
        port = int(os.environ.get("PORT", 8000))
        print(f"[INFO] Starting AgriSmart AI standalone backend on 0.0.0.0:{port}")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
    else:
        main()
