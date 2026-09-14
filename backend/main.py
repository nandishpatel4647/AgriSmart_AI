"""
AgriSmart AI — FastAPI Backend
Main application entry point.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Add model and backend directories to path for imports
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "model"))

load_dotenv(PROJECT_ROOT / ".env")

# Import routers
try:
    from backend.routers import (
        predict_router, weather_router, irrigation_router, sustainability_router, 
        assistant_router, iot_router, farm_router, crop_router, auth_router, scans_router
    )
except ImportError:
    from routers import (
        predict_router, weather_router, irrigation_router, sustainability_router, 
        assistant_router, iot_router, farm_router, crop_router, auth_router, scans_router
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload model on startup for fast inference and start cron jobs."""
    print("[INFO] Loading ML model...")
    try:
        from predict import _load_model
        _load_model()
        print("[INFO] Model loaded successfully")
    except Exception as e:
        print(f"[WARN] Could not preload model: {e}")
        print("[INFO] Model will be loaded on first prediction request")
        
    print("[INFO] Starting NDVI background checks...")
    try:
        from ndvi_service import start_cron
        start_cron()
    except Exception as e:
        print(f"[WARN] Failed to start NDVI cron: {e}")
        
    yield
    print("[INFO] Shutting down AgriSmart AI backend")


app = FastAPI(
    title="AgriSmart AI",
    description="Intelligent Agriculture for a Sustainable Future — API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all frontend origins for hackathon resilience
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for serving uploaded images and report assets
uploads_dir = PROJECT_ROOT / "data" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# Include routers
app.include_router(predict_router.router, prefix="/api", tags=["Prediction"])
app.include_router(weather_router.router, prefix="/api", tags=["Weather"])
app.include_router(irrigation_router.router, prefix="/api", tags=["Irrigation"])
app.include_router(sustainability_router.router, prefix="/api", tags=["Sustainability"])
app.include_router(assistant_router.router, prefix="/api", tags=["Assistant"])
app.include_router(iot_router.router, prefix="/api", tags=["IoT"])
app.include_router(farm_router.router, prefix="/api", tags=["FarmMapping"])
app.include_router(crop_router.router, prefix="/api", tags=["CropRotation"])
app.include_router(auth_router.router, prefix="/api", tags=["Authentication"])
app.include_router(scans_router.router, prefix="/api", tags=["Scans & Farm"])


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "AgriSmart AI"}


@app.post("/api/advisor")
async def get_advisory(data: dict):
    """
    Agentic Advisor — cross-references all data sources into a unified action plan.
    
    Expects a JSON body with optional fields:
    - prediction: disease detection results
    - weather: weather data
    - irrigation: irrigation recommendation
    - sustainability: sustainability score
    - sensor_data: IoT sensor readings
    """
    from advisor import generate_advisory
    advisory = generate_advisory(
        prediction=data.get("prediction"),
        weather=data.get("weather"),
        irrigation=data.get("irrigation"),
        sustainability=data.get("sustainability"),
        sensor_data=data.get("sensor_data"),
    )
    return {"success": True, "advisory": advisory}


@app.get("/api/status")
async def status():
    """Return system status and available features."""
    import torch
    
    model_loaded = False
    try:
        from predict import _model_cache
        model_loaded = _model_cache["model"] is not None
    except:
        pass
    
    return {
        "status": "operational",
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "model_loaded": model_loaded,
        "features": {
            "disease_detection": True,
            "weather_intelligence": True,
            "smart_irrigation": True,
            "sustainability_score": True,
            "farmer_assistant": bool(os.getenv("GEMINI_API_KEY")),
            "simulated_iot": True,
        }
    }
