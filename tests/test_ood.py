"""
AgriSmart AI — Out-Of-Distribution (OOD) & Open-Set Test Suite
Tests rejection of unseen botanical species & non-plant objects,
while preserving high accuracy across all 9 supported crop families.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT / "model"))

from backend.main import app
from model.predict import predict, SUPPORTED_CROPS

client = TestClient(app)

PROJECT_ROOT = Path(__file__).parent.parent
TEST_SAMPLES_DIR = PROJECT_ROOT / "data" / "test_samples"
TEST_DATA_DIR = PROJECT_ROOT / "data" / "split" / "test"
FRONTEND_SAMPLES = PROJECT_ROOT / "frontend" / "public" / "samples"


def test_ood_tulsi_rejection():
    """Directive 7 & 15: Tulsi must be rejected as UNSEEN_SPECIES_DETECTED."""
    tulsi_path = TEST_SAMPLES_DIR / "tulsi_leaf.jpg"
    assert tulsi_path.exists(), "tulsi_leaf.jpg must exist in data/test_samples"
    
    result = predict(str(tulsi_path))
    assert result["is_supported_crop"] is False, "Tulsi must not be flagged as a supported crop"
    assert result["out_of_distribution"] is True, "Tulsi must be marked out_of_distribution"
    assert result["error_type"] == "UNSEEN_SPECIES_DETECTED"
    assert "not match any of the 9 supported crops" in result["message"]
    assert result["crop"] == "Unsupported Crop"


def test_ood_other_unseen_plants():
    """Directive 15: Mango, Neem, Rose must be rejected as OOD."""
    unseen_plants = ["mango_leaf.jpg", "neem_leaf.jpg", "rose_leaf.jpg"]
    for img_name in unseen_plants:
        p = TEST_SAMPLES_DIR / img_name
        if p.exists():
            res = predict(str(p))
            assert res["is_supported_crop"] is False, f"{img_name} should be rejected as OOD"
            assert res["error_type"] == "UNSEEN_SPECIES_DETECTED"


def test_ood_non_plant_rejection():
    """Directive 13 & 15: Mechanical tractor and non-plant objects must be rejected."""
    tractor_path = TEST_SAMPLES_DIR / "tractor_tool.jpg"
    if tractor_path.exists():
        res = predict(str(tractor_path))
        assert res["is_supported_crop"] is False
        assert res["error_type"] in ["NON_PLANT_IMAGE", "UNSEEN_SPECIES_DETECTED"]
        assert res["detected_properties"]["is_plant"] is False or res["error_type"] == "NON_PLANT_IMAGE"


@pytest.mark.parametrize("crop_family,class_folder", [
    ("Apple", "Apple___Apple_scab"),
    ("Cherry", "Cherry_(including_sour)___healthy"),
    ("Corn (Maize)", "Corn_(maize)___Common_rust_"),
    ("Grape", "Grape___Black_rot"),
    ("Peach", "Peach___Bacterial_spot"),
    ("Bell Pepper", "Pepper,_bell___Bacterial_spot"),
    ("Potato", "Potato___Early_blight"),
    ("Strawberry", "Strawberry___Leaf_scorch"),
    ("Tomato", "Tomato___Late_blight"),
])
def test_supported_crop_families_regression(crop_family, class_folder):
    """Directive 8 & 15: All 9 supported crop families must pass as is_supported_crop: True."""
    folder = TEST_DATA_DIR / class_folder
    assert folder.exists(), f"Test folder {class_folder} must exist"
    
    images = list(folder.glob("*.JPG")) + list(folder.glob("*.jpg"))
    assert len(images) > 0, f"No test images found in {class_folder}"
    
    test_img = images[0]
    result = predict(str(test_img))
    
    # Directive 8: Verify is_supported_crop = true & out_of_distribution = false
    assert result["is_supported_crop"] is True, f"{crop_family} ({class_folder}) must be accepted as supported"
    assert result["out_of_distribution"] is False
    assert result["crop"] in SUPPORTED_CROPS or result["crop"] in ["Apple", "Cherry", "Corn", "Grape", "Peach", "Bell Pepper", "Potato", "Strawberry", "Tomato"]
    assert result["cosine_similarity"] >= 0.58, f"{crop_family} cosine similarity must exceed calibrated threshold"
    assert result["confidence"] > 0.50

    # For benchmark conditions, verify exact disease classification
    if class_folder in ["Apple___Apple_scab", "Corn_(maize)___Common_rust_", "Grape___Black_rot", "Potato___Early_blight"]:
        assert result["class_label"] == class_folder



def test_api_ood_response_schema():
    """Directive 12: API response schema for OOD rejection."""
    tulsi_path = TEST_SAMPLES_DIR / "tulsi_leaf.jpg"
    with open(tulsi_path, "rb") as f:
        resp = client.post("/api/predict", files={"file": ("tulsi.jpg", f, "image/jpeg")})
        
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["is_supported_crop"] is False
    assert data["out_of_distribution"] is True
    assert data["error_type"] == "UNSEEN_SPECIES_DETECTED"
    assert "message" in data
    assert "detected_properties" in data
    assert "supported_crops" in data
    assert len(data["supported_crops"]) == 9
    assert "Tomato" in data["supported_crops"]


def test_api_supported_response_schema():
    """Directive 12: API response schema for supported crop."""
    tomato_path = FRONTEND_SAMPLES / "tomato_late_blight.jpg"
    with open(tomato_path, "rb") as f:
        resp = client.post("/api/predict", files={"file": ("tomato.jpg", f, "image/jpeg")})
        
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["is_supported_crop"] is True
    assert data["out_of_distribution"] is False
    assert "prediction" in data
    pred = data["prediction"]
    assert pred["crop"] == "Tomato"
    assert pred["disease"] == "Late Blight"
    assert pred["confidence"] > 0.80
    assert "guidance" in pred
    assert "gradcam" in data
    assert "supported_crops" in data
