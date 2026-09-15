import random
import time
import asyncio
from datetime import datetime
from database import get_db

def _simulate_indices(geojson: str) -> dict:
    """
    Simulates calculating satellite multi-spectral indices (NDVI, NDWI, NDRE) from satellite imagery.
    In a production app, this connects to Sentinel-2 / Agromonitoring REST API.
    Returns scores between 0.0 and 1.0.
    """
    is_stressed = random.random() < 0.25
    if is_stressed:
        ndvi = round(random.uniform(0.20, 0.39), 2)
        ndwi = round(random.uniform(0.15, 0.35), 2)  # Low water moisture
        ndre = round(random.uniform(0.25, 0.42), 2)  # Low nitrogen/chlorophyll
    else:
        ndvi = round(random.uniform(0.60, 0.88), 2)
        ndwi = round(random.uniform(0.55, 0.82), 2)
        ndre = round(random.uniform(0.58, 0.85), 2)
    
    return {"ndvi": ndvi, "ndwi": ndwi, "ndre": ndre}

async def check_all_farms_ndvi():
    """Background task to monitor farm satellite health indices periodically."""
    while True:
        try:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRON] Starting Multi-Spectral Satellite Farm Check (NDVI/NDWI/NDRE)...")
            conn = get_db()
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, name, geojson FROM farms")
            farms = cursor.fetchall()
            
            alerts_generated = 0
            for farm in farms:
                indices = _simulate_indices(farm["geojson"])
                ndvi = indices["ndvi"]
                ndwi = indices["ndwi"]
                ndre = indices["ndre"]
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] [CRON] Farm {farm['name']} (ID {farm['id']}) -- NDVI: {ndvi}, NDWI: {ndwi}, NDRE: {ndre}")
                
                # Generate specific diagnostic alert depending on primary deficit
                if ndvi < 0.40:
                    if ndwi < 0.35:
                        msg = f"WATER DEFICIT ALERT: Critical crop water stress detected on {farm['name']}. NDWI is {ndwi} & NDVI is {ndvi}. Immediate irrigation recommended."
                    elif ndre < 0.40:
                        msg = f"NUTRIENT DEFICIENCY: Low chlorophyll & nitrogen detected on {farm['name']}. NDRE is {ndre} & NDVI is {ndvi}. Soil top-dressing advised."
                    else:
                        msg = f"CRITICAL CROP STRESS: Low vegetative health detected on {farm['name']}. NDVI is {ndvi}. Inspect plot for potential disease or pest activity."
                    
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
            print(f"[WARN] [CRON] Satellite index check failed: {e}")
            
        await asyncio.sleep(60)

def start_cron():
    """Fire and forget the asyncio loop."""
    loop = asyncio.get_event_loop()
    loop.create_task(check_all_farms_ndvi())

