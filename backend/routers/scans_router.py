"""
AgriSmart AI — Scan History & My Farm Router
Enforces strict user isolation, chronological scan tracking, crop health aggregation,
and the server-side OOD invariant: unsupported crops can NEVER be saved as disease diagnoses.
"""

import json
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel, Field

from database import get_db
from auth_utils import get_current_user

router = APIRouter(tags=["Scans & Farm"])


class SaveScanRequest(BaseModel):
    crop_family: str = Field(..., description="Crop family name (e.g. Tomato, Potato)")
    diagnostic_class: str = Field(..., description="Trained model class identifier")
    disease_name: str = Field(..., description="Disease condition name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence (0.0 to 1.0)")
    severity: Optional[str] = Field(default="Moderate", description="Severity assessment")
    is_supported_crop: bool = Field(default=True, description="Whether this scan belongs to the 9 supported crop families")
    ood_status: Optional[str] = Field(default="in_distribution", description="OOD gate status")
    guidance: Optional[List[str]] = Field(default=[], description="Actionable treatment/care guidance snapshot")
    image_path: Optional[str] = Field(default="", description="Lightweight relative image reference if available")


@router.post("/scans/save", status_code=status.HTTP_201_CREATED)
async def save_scan(req: SaveScanRequest, current_user: dict = Depends(get_current_user)):
    """
    Save a supported diagnosis to the authenticated farmer's persistent history.
    
    CRITICAL OOD SAFETY INVARIANT:
    If is_supported_crop is False, or the input was flagged as out-of-distribution,
    the server STRICTLY REFUSES to persist it as a disease diagnosis.
    """
    # 1. Server-side OOD invariant check
    ood_status_normalized = (req.ood_status or "in_distribution").strip().lower()
    if (
        not req.is_supported_crop 
        or ood_status_normalized in ["out_of_distribution", "ood", "unsupported"]
        or req.crop_family.lower() in ["unsupported crop", "unseen", "unknown", "tulsi", "wheat", "tractor"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Cannot save unsupported or out-of-distribution leaf scans as disease diagnoses. AgriSmart AI strictly refuses to create disease history entries for unsupported crops."
        )

    conn = get_db()
    cursor = conn.cursor()
    
    guidance_json = json.dumps(req.guidance or [])
    
    cursor.execute(
        """
        INSERT INTO scan_history (
            user_id, crop_family, diagnostic_class, disease_name, 
            confidence, severity, is_supported_crop, ood_status, 
            image_path, guidance
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            current_user["id"],
            req.crop_family.strip(),
            req.diagnostic_class.strip(),
            req.disease_name.strip(),
            float(req.confidence),
            req.severity.strip() if req.severity else "Moderate",
            1,
            "SUPPORTED",
            req.image_path or "",
            guidance_json
        )
    )
    conn.commit()
    scan_id = cursor.lastrowid
    conn.close()
    
    return {
        "success": True,
        "scan_id": scan_id,
        "message": "Diagnosis saved to My Farm successfully."
    }


@router.get("/scans/history")
async def get_scan_history(
    crop: Optional[str] = Query(None, description="Optional crop filter"),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve chronological scan history for the authenticated farmer.
    Enforces strict user isolation: User A cannot see User B's scans.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    if crop:
        cursor.execute(
            """
            SELECT id, user_id, scanned_at, crop_family, diagnostic_class, disease_name,
                   confidence, severity, is_supported_crop, ood_status, image_path, guidance, created_at
            FROM scan_history
            WHERE user_id = ? AND LOWER(crop_family) = LOWER(?)
            ORDER BY scanned_at DESC, id DESC
            """,
            (current_user["id"], crop.strip())
        )
    else:
        cursor.execute(
            """
            SELECT id, user_id, scanned_at, crop_family, diagnostic_class, disease_name,
                   confidence, severity, is_supported_crop, ood_status, image_path, guidance, created_at
            FROM scan_history
            WHERE user_id = ?
            ORDER BY scanned_at DESC, id DESC
            """,
            (current_user["id"],)
        )
        
    rows = cursor.fetchall()
    
    # Also calculate crop-wise count summary
    cursor.execute(
        """
        SELECT crop_family, COUNT(*) as scan_count
        FROM scan_history
        WHERE user_id = ?
        GROUP BY crop_family
        ORDER BY scan_count DESC
        """,
        (current_user["id"],)
    )
    summary_rows = cursor.fetchall()
    conn.close()
    
    scans = []
    for r in rows:
        try:
            guidance = json.loads(r["guidance"]) if r["guidance"] else []
        except Exception:
            guidance = []
        scans.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "scanned_at": str(r["scanned_at"]),
            "crop_family": r["crop_family"],
            "diagnostic_class": r["diagnostic_class"],
            "disease_name": r["disease_name"],
            "confidence": round(float(r["confidence"]), 4),
            "severity": r["severity"],
            "is_supported_crop": bool(r["is_supported_crop"]),
            "ood_status": r["ood_status"],
            "image_path": r["image_path"],
            "guidance": guidance,
        })
        
    crop_summary = {sr["crop_family"]: sr["scan_count"] for sr in summary_rows}
    
    return {
        "success": True,
        "total": len(scans),
        "scans": scans,
        "crop_summary": crop_summary
    }


@router.get("/scans/{scan_id}")
async def get_scan_detail(scan_id: int, current_user: dict = Depends(get_current_user)):
    """
    Retrieve single saved scan detail by ID.
    Enforces user ownership check: returns 404 if scan belongs to another user.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, user_id, scanned_at, crop_family, diagnostic_class, disease_name,
               confidence, severity, is_supported_crop, ood_status, image_path, guidance, created_at
        FROM scan_history
        WHERE id = ? AND user_id = ?
        """,
        (scan_id, current_user["id"])
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(
            status_code=404,
            detail="Scan record not found or access denied."
        )
        
    try:
        guidance = json.loads(row["guidance"]) if row["guidance"] else []
    except Exception:
        guidance = []
        
    return {
        "success": True,
        "scan": {
            "id": row["id"],
            "user_id": row["user_id"],
            "scanned_at": str(row["scanned_at"]),
            "crop_family": row["crop_family"],
            "diagnostic_class": row["diagnostic_class"],
            "disease_name": row["disease_name"],
            "confidence": round(float(row["confidence"]), 4),
            "severity": row["severity"],
            "is_supported_crop": bool(row["is_supported_crop"]),
            "ood_status": row["ood_status"],
            "image_path": row["image_path"],
            "guidance": guidance,
        }
    }


@router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a saved scan owned by the authenticated farmer."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM scan_history WHERE id = ? AND user_id = ?",
        (scan_id, current_user["id"])
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Scan record not found or access denied."
        )
        
    return {"success": True, "message": "Scan deleted successfully."}


@router.get("/farmer/overview")
async def get_farmer_overview(current_user: dict = Depends(get_current_user)):
    """
    Personalized My Farm Overview:
    - Farmer profile information
    - Recent Crop Health derived strictly from actual saved scans (NO fake data)
    - Recent saved diagnoses (latest 5)
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Fetch latest 5 scans
    cursor.execute(
        """
        SELECT id, scanned_at, crop_family, disease_name, confidence, severity, image_path
        FROM scan_history
        WHERE user_id = ?
        ORDER BY scanned_at DESC, id DESC
        LIMIT 5
        """,
        (current_user["id"],)
    )
    recent_rows = cursor.fetchall()
    
    # 2. Derive Recent Crop Health:
    # For each distinct crop family the user has scanned, find the latest diagnosis
    cursor.execute(
        """
        SELECT s.crop_family, s.disease_name, s.severity, s.scanned_at
        FROM scan_history s
        INNER JOIN (
            SELECT crop_family, MAX(id) as max_id
            FROM scan_history
            WHERE user_id = ?
            GROUP BY crop_family
        ) latest ON s.id = latest.max_id
        ORDER BY s.scanned_at DESC
        """,
        (current_user["id"],)
    )
    crop_health_rows = cursor.fetchall()
    
    # 3. Total scan count
    cursor.execute("SELECT COUNT(*) FROM scan_history WHERE user_id = ?", (current_user["id"],))
    total_scans = cursor.fetchone()[0]
    conn.close()
    
    recent_crop_health = []
    for ch in crop_health_rows:
        is_healthy = "healthy" in ch["disease_name"].lower()
        recent_crop_health.append({
            "crop": ch["crop_family"],
            "status": "Healthy" if is_healthy else "Attention",
            "condition": ch["disease_name"],
            "severity": ch["severity"],
            "latest_scan_date": str(ch["scanned_at"]),
            "badge_color": "emerald" if is_healthy else "amber",
            "description": "Status derived from the farmer's latest saved scans."
        })
        
    recent_scans = []
    for r in recent_rows:
        recent_scans.append({
            "id": r["id"],
            "scanned_at": str(r["scanned_at"]),
            "crop_family": r["crop_family"],
            "disease_name": r["disease_name"],
            "confidence": round(float(r["confidence"]), 4),
            "severity": r["severity"],
            "image_path": r["image_path"],
        })
        
    return {
        "success": True,
        "farmer": current_user,
        "total_scans": total_scans,
        "recent_crop_health": recent_crop_health,
        "recent_scans": recent_scans,
        "health_note": "Status derived from the farmer's latest saved scans."
    }
