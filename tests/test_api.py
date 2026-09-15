"""
Integration tests for AgriSmart AI FastAPI backend endpoints.
Uses FastAPI TestClient to test all routes without needing an active server process.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "model"))

from backend.main import app

client = TestClient(app)
TEST_DATA_DIR = PROJECT_ROOT / "data" / "split" / "test"


def test_health_endpoint():
    """Verify GET /api/health returns 200 and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_status_endpoint():
    """Verify GET /api/status returns operational status and feature flags."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "features" in data
    assert data["features"]["disease_detection"] is True
    assert data["features"]["weather_intelligence"] is True
    assert data["features"]["smart_irrigation"] is True
    assert data["features"]["sustainability_score"] is True


def test_predict_endpoint_success():
    """Verify POST /api/predict correctly processes an image upload."""
    sample_images = list(TEST_DATA_DIR.rglob("*.jpg")) + list(TEST_DATA_DIR.rglob("*.JPG"))
    assert len(sample_images) > 0, "No test image found"
    
    test_img_path = sample_images[0]
    with open(test_img_path, "rb") as f:
        response = client.post(
            "/api/predict",
            files={"file": ("leaf.jpg", f, "image/jpeg")}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "prediction" in data
    pred = data["prediction"]
    assert "class_label" in pred
    assert "crop" in pred
    assert "disease" in pred
    assert "confidence" in pred
    assert "guidance" in pred
    assert "top_predictions" in pred
    assert len(pred["top_predictions"]) > 0
    assert "image_quality" in data


def test_predict_endpoint_invalid_file():
    """Verify POST /api/predict rejects non-image uploads."""
    response = client.post(
        "/api/predict",
        files={"file": ("document.txt", b"not an image", "text/plain")}
    )
    assert response.status_code == 400


def test_weather_endpoint():
    """Verify GET /api/weather returns weather data and disease risk evaluation."""
    response = client.get("/api/weather?lat=23.0225&lon=72.5714")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data or "fallback" in data
    assert "disease_risks" in data


def test_irrigation_recommendation():
    """Verify POST /api/irrigation generates valid recommendation."""
    payload = {
        "soil_moisture": 20.0,
        "crop_type": "Tomato",
        "growth_stage": "flowering",
        "temperature": 32.0,
        "humidity": 45.0,
        "rain_probability": 10.0,
        "rain_amount_forecast": 0.0
    }
    response = client.post("/api/irrigation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "recommendation" in data
    rec = data["recommendation"]
    assert rec["urgency"] in ["critical", "high", "moderate", "low", "none"]
    assert "amount_mm" in rec
    assert "reasoning" in rec


def test_irrigation_thresholds():
    """Verify GET /api/irrigation/thresholds returns documented thresholds."""
    response = client.get("/api/irrigation/thresholds")
    assert response.status_code == 200
    data = response.json()
    assert "crop_thresholds" in data
    assert "Tomato" in data["crop_thresholds"]
    assert "Potato" in data["crop_thresholds"]


def test_sustainability_calculation():
    """Verify POST /api/sustainability computes score with transparent formula."""
    payload = {
        "water_used_liters": 45.0,
        "water_recommended_liters": 50.0,
        "rainwater_harvested": True,
        "drip_irrigation": True,
        "pesticide_used": False,
        "organic_methods": True,
        "fertilizer_excess": False,
        "crop_rotation": True,
        "disease_detected": False,
        "is_healthy": True,
        "preventive_measures": True
    }
    response = client.post("/api/sustainability", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "sustainability" in data
    score = data["sustainability"]["total_score"]
    assert 0 <= score <= 100
    assert "band" in data["sustainability"]
    assert "components" in data["sustainability"]


def test_sustainability_formula():
    """Verify GET /api/sustainability/formula documents scoring mechanism."""
    response = client.get("/api/sustainability/formula")
    assert response.status_code == 200
    data = response.json()
    assert "formula" in data



def test_advisor_endpoint():
    """Verify POST /api/advisor generates unified advisory."""
    payload = {
        "prediction": {
            "crop": "Tomato",
            "disease": "Early Blight",
            "confidence": 0.95,
            "severity": "Moderate"
        },
        "weather": {
            "temperature": 28.0,
            "humidity": 82.0,
            "rain": 0.0
        },
        "irrigation": {
            "recommendation": "reduce",
            "urgency": "low"
        }
    }
    response = client.post("/api/advisor", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "advisory" in data
    assert len(data["advisory"]) > 0
