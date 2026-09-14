import random
import time
import asyncio
from datetime import datetime
from database import get_db

def _simulate_ndvi(geojson: str) -> float:
    """
    Simulates calculating NDVI from satellite imagery.
    In a real app, you would hit Agromonitoring API or Sentinel Hub with the GeoJSON polygon.
    Returns a value between 0.0 and 1.0.
    """
    # 20% chance of crop stress (NDVI < 0.4) for demonstration purposes
    if random.random() < 0.20:
        return round(random.uniform(0.2, 0.39), 2)
    return round(random.uniform(0.5, 0.85), 2)

async def check_all_farms_ndvi():
    """Background task to run weekly (simulated here to run instantly or periodically)."""
    while True:
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRON] Starting NDVI farm check...")
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, name, geojson FROM farms")
            farms = cursor.fetchall()
            
            alerts_generated = 0
            for farm in farms:
                ndvi = _simulate_ndvi(farm["geojson"])
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRON] Farm {farm['name']} (ID {farm['id']}) NDVI: {ndvi}")
                
                # If stressed, generate an alert
                if ndvi < 0.4:
                    msg = f"CRITICAL: Early crop stress detected. Average NDVI is critically low ({ndvi}). Potential water or nutrient deficiency."
                    cursor.execute(
                        "INSERT INTO alerts (farm_id, message, ndvi_value) VALUES (?, ?, ?)",
                        (farm["id"], msg, ndvi)
                    )
                    alerts_generated += 1
            
            conn.commit()
            conn.close()
            
            if alerts_generated > 0:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRON] Generated {alerts_generated} crop stress alerts.")
            
        except Exception as e:
            print(f"[WARN] [CRON] NDVI check failed: {e}")
            
        # In production this would be asyncio.sleep(7 * 24 * 3600) for a weekly cron
        # For hackathon/testing, we run it every 60 seconds
        await asyncio.sleep(60)

def start_cron():
    """Fire and forget the asyncio loop."""
    loop = asyncio.get_event_loop()
    loop.create_task(check_all_farms_ndvi())
