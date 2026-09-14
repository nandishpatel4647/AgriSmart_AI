from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import sqlite3
from typing import List, Optional
from database import get_db

router = APIRouter()

class FarmCreate(BaseModel):
    name: str
    geojson: str  # JSON string of the polygon

@router.post("/farms")
def create_farm(farm: FarmCreate):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO farms (name, geojson) VALUES (?, ?)", (farm.name, farm.geojson))
        farm_id = cursor.lastrowid
        conn.commit()
        return {"success": True, "farm_id": farm_id, "message": "Farm mapped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/farms")
def get_farms():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, geojson, created_at FROM farms ORDER BY created_at DESC")
        rows = cursor.fetchall()
        farms = []
        for row in rows:
            farms.append({
                "id": row["id"],
                "name": row["name"],
                "geojson": json.loads(row["geojson"]),
                "created_at": row["created_at"]
            })
        return {"success": True, "farms": farms}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/alerts")
def get_all_alerts():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.id, a.farm_id, a.message, a.ndvi_value, a.created_at, f.name as farm_name 
            FROM alerts a 
            JOIN farms f ON a.farm_id = f.id 
            ORDER BY a.created_at DESC LIMIT 50
        """)
        rows = cursor.fetchall()
        alerts = [dict(row) for row in rows]
        return {"success": True, "alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/farms/{farm_id}")
def delete_farm(farm_id: int):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM alerts WHERE farm_id = ?", (farm_id,))
        cursor.execute("DELETE FROM farms WHERE id = ?", (farm_id,))
        conn.commit()
        return {"success": True, "message": f"Farm {farm_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

