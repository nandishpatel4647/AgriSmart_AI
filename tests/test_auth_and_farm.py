"""
Automated tests for AgriSmart AI Farmer Personalization, Authentication, My Farm & Scan History.
Covers:
- Detect First: Guest unauthenticated inference regression test
- Signup with PBKDF2 hashing & password min-length enforcement
- Login with JWT token issuance
- Protected routes requiring valid Bearer tokens
- Zero fake data: Empty state verification on fresh accounts
- Save diagnosis & Recent Crop Health status derivation
- OOD Safety Invariant: Server strictly rejects saving unsupported / OOD crops
- User Isolation: Farmer A cannot view, list, or delete Farmer B's scans
- Chronological scan history & crop-family filtering
- Detail viewing and scan deletion
"""

import sys
import uuid
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


def generate_unique_email():
    return f"farmer_{uuid.uuid4().hex[:8]}@testfarm.com"


# ==============================================================================
# 1. CRITICAL REGRESSION: GUEST DETECT REMAINS 100% INDEPENDENT
# ==============================================================================

def test_guest_predict_unaffected_by_auth():
    """Verify completely unauthenticated guest can call POST /api/predict without any token."""
    sample_images = list(TEST_DATA_DIR.rglob("*.jpg")) + list(TEST_DATA_DIR.rglob("*.JPG"))
    assert len(sample_images) > 0, "No test image found for inference"
    
    test_img = sample_images[0]
    with open(test_img, "rb") as f:
        # Zero auth headers supplied
        response = client.post(
            "/api/predict",
            files={"file": ("sample_leaf.jpg", f, "image/jpeg")}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "prediction" in data or "is_supported_crop" in data
    # Guest receives diagnosis, confidence, severity, guidance, voice advisory capability
    if data.get("is_supported_crop", True):
        assert "confidence" in data["prediction"]
        assert "disease" in data["prediction"]
        assert "severity" in data["prediction"]
        assert "guidance" in data["prediction"]


# ==============================================================================
# 2. SIGNUP & PASSWORD SECURITY
# ==============================================================================

def test_signup_success_and_sanitization():
    """Verify farmer signup creates account and returns token without exposing password hash."""
    email = generate_unique_email()
    response = client.post("/api/auth/signup", json={
        "name": "Ramesh Patel",
        "email": email,
        "password": "SecurePassword123!",
        "location": "Anand, Gujarat",
        "farm_size": "8 acres",
        "primary_crops": ["Tomato", "Potato"]
    })
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "token" in data and len(data["token"]) > 20
    assert "user" in data
    user = data["user"]
    assert user["name"] == "Ramesh Patel"
    assert user["email"] == email
    assert user["location"] == "Anand, Gujarat"
    assert user["farm_size"] == "8 acres"
    assert user["primary_crops"] == ["Tomato", "Potato"]
    # Passwords / hashes must NEVER be exposed
    assert "password" not in user
    assert "password_hash" not in user
    assert "salt" not in user


def test_signup_enforces_minimum_password_length():
    """Verify password shorter than 8 characters is strictly rejected with 400."""
    response = client.post("/api/auth/signup", json={
        "name": "Short Pass Farmer",
        "email": generate_unique_email(),
        "password": "12345"  # only 5 chars
    })
    assert response.status_code == 400
    assert "8 characters" in response.json()["detail"]


def test_signup_rejects_duplicate_email():
    """Verify registering with an already existing email returns 400."""
    email = generate_unique_email()
    # First signup
    res1 = client.post("/api/auth/signup", json={
        "name": "Farmer 1",
        "email": email,
        "password": "Password123!"
    })
    assert res1.status_code == 201

    # Second signup with same email
    res2 = client.post("/api/auth/signup", json={
        "name": "Farmer Duplicate",
        "email": email,
        "password": "Password123!"
    })
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


# ==============================================================================
# 3. LOGIN & AUTHENTICATION TOKENS
# ==============================================================================

def test_login_success_and_token_generation():
    """Verify login with valid credentials returns 200 and token."""
    email = generate_unique_email()
    client.post("/api/auth/signup", json={
        "name": "Login Test Farmer",
        "email": email,
        "password": "CorrectPassword123!"
    })

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": "CorrectPassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["email"] == email


def test_login_invalid_password_returns_401():
    """Verify login with wrong password returns 401."""
    email = generate_unique_email()
    client.post("/api/auth/signup", json={
        "name": "Wrong Pass Farmer",
        "email": email,
        "password": "RealPassword123!"
    })

    res = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword456!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


def test_login_nonexistent_email_returns_401():
    """Verify login with unknown email returns 401."""
    res = client.post("/api/auth/login", json={
        "email": "nonexistent_farmer_xyz@nowhere.com",
        "password": "AnyPassword123!"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


# ==============================================================================
# 4. PROTECTED ENDPOINTS & ME / PROFILE
# ==============================================================================

def test_protected_routes_require_bearer_token():
    """Verify protected endpoints return 401 when accessed without token."""
    assert client.get("/api/auth/me").status_code == 401
    assert client.put("/api/auth/profile", json={"name": "New Name"}).status_code == 401
    assert client.get("/api/farmer/overview").status_code == 401
    assert client.get("/api/scans/history").status_code == 401
    assert client.post("/api/scans/save", json={}).status_code == 401


def test_get_and_update_profile():
    """Verify farmer can retrieve and update their own profile."""
    email = generate_unique_email()
    signup_res = client.post("/api/auth/signup", json={
        "name": "Original Name",
        "email": email,
        "password": "Password123!",
        "location": "Vadodara"
    })
    token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # GET /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["user"]["name"] == "Original Name"

    # PUT /api/auth/profile
    update_res = client.put("/api/auth/profile", headers=headers, json={
        "name": "Updated Name",
        "location": "Ahmedabad, Gujarat",
        "farm_size": "15 acres",
        "primary_crops": ["Cotton", "Wheat"]
    })
    assert update_res.status_code == 200
    updated_user = update_res.json()["user"]
    assert updated_user["name"] == "Updated Name"
    assert updated_user["location"] == "Ahmedabad, Gujarat"
    assert updated_user["farm_size"] == "15 acres"


# ==============================================================================
# 5. NO FAKE DATA: FRESH ACCOUNT EMPTY STATE
# ==============================================================================

def test_fresh_account_empty_state():
    """Verify freshly created account has 0 scans and empty recent crop health."""
    email = generate_unique_email()
    res = client.post("/api/auth/signup", json={
        "name": "Fresh Farmer",
        "email": email,
        "password": "Password123!"
    })
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    overview_res = client.get("/api/farmer/overview", headers=headers)
    assert overview_res.status_code == 200
    data = overview_res.json()
    assert data["total_scans"] == 0
    assert data["recent_crop_health"] == []
    assert data["recent_scans"] == []

    history_res = client.get("/api/scans/history", headers=headers)
    assert history_res.status_code == 200
    assert history_res.json()["total"] == 0
    assert history_res.json()["scans"] == []


# ==============================================================================
# 6. SAVE SCAN & RECENT CROP HEALTH TERMINOLOGY
# ==============================================================================

def test_save_supported_crop_scan_and_recent_crop_health():
    """Verify saving a supported crop diagnosis updates recent crop health status."""
    email = generate_unique_email()
    signup_res = client.post("/api/auth/signup", json={
        "name": "Tomato Farmer",
        "email": email,
        "password": "Password123!"
    })
    token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    save_res = client.post("/api/scans/save", headers=headers, json={
        "crop_family": "Tomato",
        "diagnostic_class": "Tomato___Late_blight",
        "disease_name": "Late Blight",
        "confidence": 0.985,
        "severity": "High",
        "is_supported_crop": True,
        "ood_status": "in_distribution",
        "guidance": [
            "Apply copper-based fungicide to halt fungal sporulation.",
            "Prune infected bottom leaves to improve canopy ventilation."
        ]
    })
    assert save_res.status_code == 201
    save_data = save_res.json()
    assert save_data["success"] is True
    scan_id = save_data["scan_id"]

    # Verify overview updates Recent Crop Health (with strict terminology)
    overview_res = client.get("/api/farmer/overview", headers=headers)
    overview = overview_res.json()
    assert overview["total_scans"] == 1
    assert len(overview["recent_crop_health"]) == 1
    
    health_item = overview["recent_crop_health"][0]
    assert health_item["crop"] == "Tomato"
    assert health_item["status"] == "Attention"
    assert health_item["condition"] == "Late Blight"
    assert health_item["severity"] == "High"
    # STRICT TERMINOLOGY REQUIREMENT: Description must state "derived from the farmer's latest saved scans"
    assert "derived from" in health_item["description"].lower()


# ==============================================================================
# 7. CRITICAL OOD SAFETY INVARIANT: REJECT SAVING UNSUPPORTED / OOD CROPS
# ==============================================================================

def test_ood_safety_rejects_saving_unsupported_crop():
    """
    CRITICAL SERVER-SIDE INVARIANT:
    If is_supported_crop is False or ood_status is out_of_distribution,
    server must strictly reject saving as a disease diagnosis with HTTP 400.
    """
    email = generate_unique_email()
    signup_res = client.post("/api/auth/signup", json={
        "name": "OOD Safety Farmer",
        "email": email,
        "password": "Password123!"
    })
    token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Attempt to save with is_supported_crop = False
    bad_res_1 = client.post("/api/scans/save", headers=headers, json={
        "crop_family": "Tulsi",
        "diagnostic_class": "Tulsi___Unsupported",
        "disease_name": "Unsupported Crop",
        "confidence": 0.50,
        "severity": "Unknown",
        "is_supported_crop": False,
        "ood_status": "out_of_distribution",
        "guidance": []
    })
    assert bad_res_1.status_code == 400
    assert "unsupported" in bad_res_1.json()["detail"].lower()

    # 2. Attempt to save with ood_status = out_of_distribution even if claim True
    bad_res_2 = client.post("/api/scans/save", headers=headers, json={
        "crop_family": "Unknown Foliage",
        "diagnostic_class": "OpenSet_Foliage",
        "disease_name": "Unseen Foliage",
        "confidence": 0.40,
        "severity": "Unknown",
        "is_supported_crop": True,
        "ood_status": "out_of_distribution"
    })
    assert bad_res_2.status_code == 400
    assert "unsupported" in bad_res_2.json()["detail"].lower()

    # Verify nothing was saved in farm records
    history_res = client.get("/api/scans/history", headers=headers)
    assert history_res.json()["total"] == 0


# ==============================================================================
# 8. USER ISOLATION (FARMER A CANNOT ACCESS FARMER B'S SCANS)
# ==============================================================================

def test_user_isolation_strictly_enforced():
    """
    USER ISOLATION MANDATORY TEST:
    Farmer A creates a Tomato scan.
    Farmer B creates a Potato scan.
    Farmer A MUST NOT see Farmer B's scan.
    Farmer A MUST NOT be able to view Farmer B's scan by ID.
    Farmer A MUST NOT be able to delete Farmer B's scan.
    """
    # Create Farmer A
    res_a = client.post("/api/auth/signup", json={
        "name": "Farmer Alpha",
        "email": generate_unique_email(),
        "password": "Password123!"
    })
    token_a = res_a.json()["token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create Farmer B
    res_b = client.post("/api/auth/signup", json={
        "name": "Farmer Beta",
        "email": generate_unique_email(),
        "password": "Password123!"
    })
    token_b = res_b.json()["token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Farmer A saves Tomato scan
    res_scan_a = client.post("/api/scans/save", headers=headers_a, json={
        "crop_family": "Tomato",
        "diagnostic_class": "Tomato___Early_blight",
        "disease_name": "Early Blight",
        "confidence": 0.95,
        "severity": "Moderate",
        "is_supported_crop": True,
        "ood_status": "in_distribution",
        "guidance": ["Alpha guidance"]
    })
    scan_id_a = res_scan_a.json()["scan_id"]

    # Farmer B saves Potato scan
    res_scan_b = client.post("/api/scans/save", headers=headers_b, json={
        "crop_family": "Potato",
        "diagnostic_class": "Potato___Late_blight",
        "disease_name": "Late Blight",
        "confidence": 0.96,
        "severity": "Severe",
        "is_supported_crop": True,
        "ood_status": "in_distribution",
        "guidance": ["Beta guidance"]
    })
    scan_id_b = res_scan_b.json()["scan_id"]

    # 1. Farmer A's history only contains scan_a, NEVER scan_b
    hist_a = client.get("/api/scans/history", headers=headers_a).json()
    assert hist_a["total"] == 1
    assert hist_a["scans"][0]["id"] == scan_id_a
    assert hist_a["scans"][0]["crop_family"] == "Tomato"

    # 2. Farmer B's history only contains scan_b, NEVER scan_a
    hist_b = client.get("/api/scans/history", headers=headers_b).json()
    assert hist_b["total"] == 1
    assert hist_b["scans"][0]["id"] == scan_id_b
    assert hist_b["scans"][0]["crop_family"] == "Potato"

    # 3. Farmer A attempts to access Farmer B's scan detail -> MUST FAIL (404)
    detail_res = client.get(f"/api/scans/{scan_id_b}", headers=headers_a)
    assert detail_res.status_code == 404

    # 4. Farmer A attempts to delete Farmer B's scan -> MUST FAIL (404)
    delete_res = client.delete(f"/api/scans/{scan_id_b}", headers=headers_a)
    assert delete_res.status_code == 404

    # Confirm Farmer B's scan still exists unharmed
    detail_b = client.get(f"/api/scans/{scan_id_b}", headers=headers_b)
    assert detail_b.status_code == 200


# ==============================================================================
# 9. CHRONOLOGICAL HISTORY, FILTERING & DELETE
# ==============================================================================

def test_chronological_ordering_crop_filter_and_deletion():
    """Verify scans are sorted newest first, crop filtering works, and deletion succeeds."""
    email = generate_unique_email()
    res = client.post("/api/auth/signup", json={
        "name": "Multi Scan Farmer",
        "email": email,
        "password": "Password123!"
    })
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Save 1st scan: Apple
    client.post("/api/scans/save", headers=headers, json={
        "crop_family": "Apple",
        "diagnostic_class": "Apple___Apple_scab",
        "disease_name": "Apple Scab",
        "confidence": 0.92,
        "is_supported_crop": True,
        "ood_status": "in_distribution"
    })

    # Save 2nd scan: Grape
    res_grape = client.post("/api/scans/save", headers=headers, json={
        "crop_family": "Grape",
        "diagnostic_class": "Grape___Black_rot",
        "disease_name": "Black Rot",
        "confidence": 0.97,
        "is_supported_crop": True,
        "ood_status": "in_distribution"
    })
    grape_id = res_grape.json()["scan_id"]

    # 1. Chronological order: newest (Grape) should be first
    all_history = client.get("/api/scans/history", headers=headers).json()
    assert all_history["total"] == 2
    assert all_history["scans"][0]["crop_family"] == "Grape"
    assert all_history["scans"][1]["crop_family"] == "Apple"

    # 2. Crop filtering: ?crop=Apple
    apple_filter = client.get("/api/scans/history?crop=Apple", headers=headers).json()
    assert apple_filter["total"] == 1
    assert apple_filter["scans"][0]["crop_family"] == "Apple"

    # 3. Delete Grape scan
    del_res = client.delete(f"/api/scans/{grape_id}", headers=headers)
    assert del_res.status_code == 200

    # 4. Verify count decreases to 1
    after_del = client.get("/api/scans/history", headers=headers).json()
    assert after_del["total"] == 1
    assert after_del["scans"][0]["crop_family"] == "Apple"
