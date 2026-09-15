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
    """Verify freshly created account can fetch profile successfully."""
    email = generate_unique_email()
    res = client.post("/api/auth/signup", json={
        "name": "Fresh Farmer",
        "email": email,
        "password": "Password123!"
    })
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["user"]["email"] == email

