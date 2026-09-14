"""
AgriSmart AI — Simulated IoT Router
Background service generating plausible sensor data.
EXPLICITLY LABELED AS SIMULATED — not real hardware data.
"""

import math
import random
import time
from datetime import datetime, timedelta
from fastapi import APIRouter

router = APIRouter()

# Simulation parameters — realistic diurnal patterns
_sim_start = time.time()


def _simulate_sensor_reading() -> dict:
    """
    Generate plausible simulated sensor readings with diurnal patterns.
    
    CLEARLY LABELED AS SIMULATED DATA.
    """
    elapsed = time.time() - _sim_start
    hour_of_day = (datetime.now().hour + datetime.now().minute / 60)
    
    # Temperature: peaks at ~14:00, lowest at ~04:00
    temp_base = 28.0
    temp_diurnal = 6.0 * math.sin(math.pi * (hour_of_day - 4) / 12)
    temp_noise = random.gauss(0, 0.5)
    temperature = round(temp_base + temp_diurnal + temp_noise, 1)
    
    # Humidity: inverse of temperature generally
    humidity_base = 65.0
    humidity_diurnal = -15.0 * math.sin(math.pi * (hour_of_day - 4) / 12)
    humidity_noise = random.gauss(0, 2)
    humidity = round(max(20, min(98, humidity_base + humidity_diurnal + humidity_noise)), 1)
    
    # Soil moisture: slowly decreases, jumps up after "irrigation events"
    moisture_decay = 0.5 * math.sin(elapsed / 3600)  # Slow oscillation
    soil_moisture = round(max(15, min(85, 45 + moisture_decay * 20 + random.gauss(0, 2))), 1)
    
    # Soil pH: relatively stable with minor fluctuation
    soil_ph = round(6.5 + random.gauss(0, 0.1), 2)
    soil_ph = max(4.5, min(8.5, soil_ph))
    
    # Light intensity (lux): follows sun pattern
    if 6 <= hour_of_day <= 18:
        light = 500 + 800 * math.sin(math.pi * (hour_of_day - 6) / 12)
        light += random.gauss(0, 50)
    else:
        light = random.gauss(5, 2)
    light = round(max(0, light), 0)
    
    # Rainfall sensor (mm/hr): occasional random rain events
    rainfall = 0.0
    if random.random() < 0.05:  # 5% chance per reading
        rainfall = round(random.uniform(0.5, 8.0), 1)
    
    # Wind speed (km/h)
    wind = round(max(0, 8 + 4 * math.sin(hour_of_day / 3) + random.gauss(0, 2)), 1)
    
    return {
        "temperature_c": temperature,
        "humidity_pct": humidity,
        "soil_moisture_pct": soil_moisture,
        "soil_ph": soil_ph,
        "light_lux": light,
        "rainfall_mm_hr": rainfall,
        "wind_speed_kmh": wind,
    }


@router.get("/iot")
async def get_sensor_data_base():
    return await get_sensor_data()


@router.get("/iot/sensors")
async def get_sensor_data():
    """
    Get current simulated sensor readings.
    
    ⚠️ SIMULATED DATA — This is not from real hardware sensors.
    Generated using realistic diurnal patterns for demonstration purposes.
    """
    reading = _simulate_sensor_reading()
    
    return {
        "success": True,
        "⚠️ NOTICE": "SIMULATED IoT DATA — Not from real sensors",
        "data_type": "simulated",
        "soil_moisture": round(reading["soil_moisture_pct"]),
        "temperature": reading["temperature_c"],
        "humidity": reading["humidity_pct"],
        "nitrogen": 45,
        "phosphorus": 32,
        "potassium": 28,
        "reading": reading,
        "timestamp": datetime.now().isoformat(),
        "sensor_labels": {
            "temperature_c": "Air Temperature (°C)",
            "humidity_pct": "Relative Humidity (%)",
            "soil_moisture_pct": "Soil Moisture (%)",
            "soil_ph": "Soil pH",
            "light_lux": "Light Intensity (lux)",
            "rainfall_mm_hr": "Rainfall (mm/hr)",
            "wind_speed_kmh": "Wind Speed (km/h)",
        },
        "simulation_info": {
            "description": "Sensor data is simulated using realistic diurnal patterns",
            "hardware_required": "ESP32 / Raspberry Pi with soil moisture, DHT22, rain, pH sensors",
            "pattern": "Temperature and humidity follow natural day/night cycles",
        },
    }


@router.get("/iot/history")
async def get_sensor_history(hours: int = 6):
    """Get simulated sensor history for the past N hours."""
    hours = min(hours, 24)  # Cap at 24h
    
    history = []
    now = datetime.now()
    
    for i in range(hours * 4):  # 4 readings per hour (every 15 min)
        timestamp = now - timedelta(minutes=15 * (hours * 4 - i - 1))
        
        # Simulate for that time
        hour = timestamp.hour + timestamp.minute / 60
        temp = 28.0 + 6.0 * math.sin(math.pi * (hour - 4) / 12) + random.gauss(0, 0.3)
        humidity = 65.0 - 15.0 * math.sin(math.pi * (hour - 4) / 12) + random.gauss(0, 1.5)
        moisture = 45 + random.gauss(0, 3)
        
        history.append({
            "timestamp": timestamp.isoformat(),
            "temperature_c": round(temp, 1),
            "humidity_pct": round(max(20, min(98, humidity)), 1),
            "soil_moisture_pct": round(max(15, min(85, moisture)), 1),
        })
    
    return {
        "success": True,
        "⚠️ NOTICE": "SIMULATED IoT DATA — Not from real sensors",
        "data_type": "simulated",
        "period_hours": hours,
        "readings_count": len(history),
        "history": history,
    }
