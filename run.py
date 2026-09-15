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

    try:
        from dotenv import load_dotenv
        load_dotenv(PROJECT_ROOT / ".env")
    except Exception:
        pass
    
    backend_port = int(os.getenv("BACKEND_PORT", "8005"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "3005"))
    
    # Port conflict checks
    if is_port_in_use(backend_port):
        print(f"  [NOTE] Port {backend_port} is already in use.")
        if wait_for_http(f"http://127.0.0.1:{backend_port}/api/health", timeout=2.0):
            print(f"  [OK] Existing AgriSmart backend is responding on port {backend_port}.")
            backend_proc = None
        else:
            print(f"  [ERROR] Port {backend_port} is occupied by an unresponsive process.")
            sys.exit(1)
    else:
        print(f"[2/4] Starting FastAPI Backend on http://127.0.0.1:{backend_port} ...")
        backend_cmd = [
            sys.executable, "-m", "uvicorn", "backend.main:app",
            "--host", "0.0.0.0", "--port", str(backend_port)
        ]
        backend_proc = subprocess.Popen(backend_cmd, cwd=str(PROJECT_ROOT))
        
        # Wait for backend to be ready
        if wait_for_http(f"http://127.0.0.1:{backend_port}/api/health", timeout=60.0):
            print(f"  [OK] Backend healthy and ready at http://127.0.0.1:{backend_port}")
        else:
            print(f"  [ERROR] Backend failed to start within 60 seconds.")
            kill_proc_tree(backend_proc)
            sys.exit(1)
    
    if is_port_in_use(frontend_port):
        print(f"  [NOTE] Port {frontend_port} is already in use.")
        if wait_for_http(f"http://localhost:{frontend_port}", timeout=2.0):
            print(f"  [OK] Existing AgriSmart frontend is responding on port {frontend_port}.")
            frontend_proc = None
        else:
            print(f"  [ERROR] Port {frontend_port} is occupied by an unresponsive process.")
            if backend_proc:
                kill_proc_tree(backend_proc)
            sys.exit(1)
    else:
        print(f"[3/4] Starting Next.js Frontend on http://localhost:{frontend_port} ...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        frontend_env = os.environ.copy()
        frontend_env["PORT"] = str(frontend_port)
        frontend_env["BACKEND_PORT"] = str(backend_port)
        frontend_proc = subprocess.Popen([npm_cmd, "run", "dev", "--", "-p", str(frontend_port)], cwd=str(FRONTEND_DIR), env=frontend_env)
        
        # Wait for frontend to be ready
        if wait_for_http(f"http://127.0.0.1:{frontend_port}", timeout=90.0):
            print(f"  [OK] Frontend healthy and ready at http://localhost:{frontend_port}")
        else:
            print(f"  [ERROR] Frontend failed to start within 90 seconds.")
            if backend_proc:
                kill_proc_tree(backend_proc)
            kill_proc_tree(frontend_proc)
            sys.exit(1)
    
    print("\n" + "=" * 70)
    print("  [4/4] ALL SERVICES OPERATIONAL")
    print("=" * 70)
    print(f"  Frontend Dashboard: http://localhost:{frontend_port}")
    print(f"  Disease Detect UI:  http://localhost:{frontend_port}/detect")
    print(f"  Weather Page:       http://localhost:{frontend_port}/weather")
    print(f"  AI Assistant:       http://localhost:{frontend_port}/assistant")
    print(f"  Scan History:       http://localhost:{frontend_port}/history")
    print(f"  Satellite Map:      http://localhost:{frontend_port}/map")
    print(f"  Crop Rotation:      http://localhost:{frontend_port}/rotation")
    print(f"  IoT Telemetry:      http://localhost:{frontend_port}/telemetry")
    print(f"  API Interactive UI: http://localhost:{backend_port}/docs")
    print(f"  Backend Health:     http://localhost:{backend_port}/api/health")
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

from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "model"))

if __name__ == "__main__":
    if "PORT" in os.environ and os.environ.get("PORT") != "8000":
        import uvicorn
        port = int(os.environ.get("PORT", 8000))
        print(f"[INFO] Starting AgriSmart AI standalone backend on 0.0.0.0:{port}")
        uvicorn.run("backend.main:app", host="0.0.0.0", port=port)
    else:
        main()
