"""
AgriSmart AI — Authentication & Security Utilities
Lightweight, zero-cloud, cryptographically secure authentication using
PBKDF2-HMAC-SHA256 (NIST-approved) and PyJWT tokens.
"""

import os
import hmac
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from database import get_db

# Secret key: loaded from environment or persistent local fallback
JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY", 
    "agrismart_secure_jwt_token_signing_key_sih_2026_minimum_32_bytes_long"
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 14  # Farmers in rural areas stay logged in for 14 days

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 16-byte random salt."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    salt = os.urandom(16)
    iterations = 100_000
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2:sha256:{iterations}${salt.hex()}${pwd_hash.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against stored PBKDF2-HMAC-SHA256 hash using constant-time compare."""
    if not hashed or not password:
        return False
    try:
        parts = hashed.split("$")
        if len(parts) != 3:
            return False
        algo_iter, salt_hex, hash_hex = parts
        _, _, iterations_str = algo_iter.split(":")
        iterations = int(iterations_str)
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)
        actual_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify the current authenticated user.
    Strictly derives user identity from validated token (never trusts user_id from client).
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in to access this feature.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, location, farm_size, primary_crops, created_at FROM users WHERE id = ?",
        (user_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(
            status_code=401,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        primary_crops = json.loads(row["primary_crops"]) if row["primary_crops"] else []
    except Exception:
        primary_crops = []
        
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "location": row["location"] or "",
        "farm_size": row["farm_size"] or "",
        "primary_crops": primary_crops,
        "created_at": str(row["created_at"])
    }


def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """Optional dependency that returns user dict if valid token is provided, else None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None
