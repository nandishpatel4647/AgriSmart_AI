"""
AgriSmart AI — Farmer Authentication & Profile Router
Supports lightweight, zero-cloud sign up, login, profile management, and session verification.
"""

import re
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field

from database import get_db
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(tags=["Authentication"])


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Farmer's full name")
    email: str = Field(..., description="Email address or mobile identifier")
    password: str = Field(..., description="Password (minimum 8 characters)")
    location: Optional[str] = Field(default="", max_length=150, description="Village, District, or State")
    farm_size: Optional[str] = Field(default="", max_length=50, description="Farm size (e.g. 2.5 acres)")
    primary_crops: Optional[List[str]] = Field(default=[], description="List of primary crops cultivated")


class LoginRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Password")


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = Field(None, max_length=150)
    farm_size: Optional[str] = Field(None, max_length=50)
    primary_crops: Optional[List[str]] = None


def _clean_email(email: str) -> str:
    cleaned = email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")
    return cleaned


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest):
    """
    Register a new farmer account.
    Enforces minimum 8-character password, PBKDF2 hashing, and email uniqueness.
    """
    email = _clean_email(req.email)
    name = req.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long.")
    
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    conn = get_db()
    cursor = conn.cursor()
    
    # Check if email is already registered
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists. Please log in instead."
        )
    
    # Hash password safely
    pwd_hash = hash_password(req.password)
    crops_json = json.dumps(req.primary_crops or [])
    
    cursor.execute(
        """
        INSERT INTO users (name, email, password_hash, location, farm_size, primary_crops)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (name, email, pwd_hash, req.location or "", req.farm_size or "", crops_json)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    token = create_access_token({"sub": str(user_id), "email": email})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "location": req.location or "",
            "farm_size": req.farm_size or "",
            "primary_crops": req.primary_crops or []
        },
        "message": "Farmer account created successfully."
    }


@router.post("/auth/login")
async def login(req: LoginRequest):
    """
    Authenticate a farmer with email and password.
    Returns a signed JWT access token.
    """
    email = req.email.strip().lower()
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, password_hash, location, farm_size, primary_crops FROM users WHERE email = ?",
        (email,)
    )
    user_row = cursor.fetchone()
    conn.close()
    
    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Please verify your credentials."
        )
    
    try:
        primary_crops = json.loads(user_row["primary_crops"]) if user_row["primary_crops"] else []
    except Exception:
        primary_crops = []
        
    token = create_access_token({"sub": str(user_row["id"]), "email": user_row["email"]})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_row["id"],
            "name": user_row["name"],
            "email": user_row["email"],
            "location": user_row["location"] or "",
            "farm_size": user_row["farm_size"] or "",
            "primary_crops": primary_crops
        },
        "message": "Logged in successfully."
    }


@router.get("/auth/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Retrieve profile of the currently logged-in farmer."""
    return {
        "success": True,
        "user": current_user
    }


@router.put("/auth/profile")
async def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """Update farmer profile details (name, location, farm size, crops)."""
    conn = get_db()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if req.name is not None:
        updates.append("name = ?")
        params.append(req.name.strip())
    if req.location is not None:
        updates.append("location = ?")
        params.append(req.location.strip())
    if req.farm_size is not None:
        updates.append("farm_size = ?")
        params.append(req.farm_size.strip())
    if req.primary_crops is not None:
        updates.append("primary_crops = ?")
        params.append(json.dumps(req.primary_crops))
        
    if updates:
        updates.append("updated_at = CURRENT_TIMESTAMP")
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        params.append(current_user["id"])
        cursor.execute(query, tuple(params))
        conn.commit()
        
    # Re-fetch updated record
    cursor.execute(
        "SELECT id, name, email, location, farm_size, primary_crops, created_at FROM users WHERE id = ?",
        (current_user["id"],)
    )
    row = cursor.fetchone()
    conn.close()
    
    try:
        crops = json.loads(row["primary_crops"]) if row["primary_crops"] else []
    except Exception:
        crops = []
        
    return {
        "success": True,
        "user": {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "location": row["location"] or "",
            "farm_size": row["farm_size"] or "",
            "primary_crops": crops,
            "created_at": str(row["created_at"])
        },
        "message": "Farmer profile updated successfully."
    }


@router.post("/auth/logout")
async def logout():
    """Confirms client session termination."""
    return {"success": True, "message": "Successfully logged out."}
