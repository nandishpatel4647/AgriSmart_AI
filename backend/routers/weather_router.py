"""
AgriSmart AI — Weather Intelligence Router
Live weather data from Open-Meteo (free, no API key required).
"""

import requests
from fastapi import APIRouter, Query
from datetime import datetime, timedelta

router = APIRouter()

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_CURRENT_URL = "https://api.open-meteo.com/v1/forecast"

# Default to Ahmedabad, Gujarat (farming region context)
DEFAULT_LAT = 23.0225
DEFAULT_LON = 72.5714

# Disease risk rules based on weather conditions
DISEASE_RISK_RULES = {
    "fungal_risk": {
        "condition": "High humidity (>80%) + moderate temperature (15-30°C)",
        "message": "⚠️ Elevated fungal disease risk — monitor crops closely for leaf spots and blight",
    },
    "late_blight_risk": {
        "condition": "Cool nights (<15°C) + wet conditions + moderate days (15-25°C)",
        "message": "🔴 Late blight conditions detected — inspect potato and tomato crops immediately",
    },
    "heat_stress": {
        "condition": "Temperature > 38°C",
        "message": "🌡️ Heat stress likely — ensure adequate irrigation and shade for sensitive crops",
    },
    "frost_risk": {
        "condition": "Temperature < 2°C",
        "message": "❄️ Frost risk — protect sensitive crops with covers",
    },
}


def _assess_disease_risk(current_weather: dict, daily_weather: dict = None) -> list:
    """Generate actionable weather-disease risk alerts."""
    alerts = []
    
    temp = current_weather.get("temperature_2m", 25)
    humidity = current_weather.get("relative_humidity_2m", 50)
    wind = current_weather.get("wind_speed_10m", 0)
    rain = current_weather.get("rain", 0)
    
    # Fungal disease risk
    if humidity > 80 and 15 <= temp <= 30:
        alerts.append({
            "type": "fungal_risk",
            "severity": "high" if humidity > 90 else "moderate",
            "message": "Elevated fungal disease risk — high humidity with moderate temperatures favors leaf spot, blight, and mold development",
            "action": "Monitor crops closely, consider preventive fungicide application, improve air circulation",
        })
    
    # Late blight specific risk
    if humidity > 85 and 10 <= temp <= 25 and rain > 0:
        alerts.append({
            "type": "late_blight_risk",
            "severity": "high",
            "message": "Late blight conditions — cool, wet weather is ideal for Phytophthora infestans",
            "action": "Inspect tomato and potato crops immediately, apply protective fungicide before rain events",
        })
    
    # Heat stress
    if temp > 38:
        alerts.append({
            "type": "heat_stress",
            "severity": "high" if temp > 42 else "moderate",
            "message": f"Heat stress risk at {temp}°C — crops may wilt and fruit set may fail",
            "action": "Increase irrigation frequency, apply mulch, consider shade cloth for sensitive crops",
        })
    
    # Frost risk
    if temp < 2:
        alerts.append({
            "type": "frost_risk",
            "severity": "high",
            "message": f"Frost risk at {temp}°C — tender crops may be damaged",
            "action": "Cover sensitive crops, apply water to soil before frost (releases heat), harvest ripe produce",
        })
    
    # Drought stress
    if humidity < 30 and rain == 0 and temp > 30:
        alerts.append({
            "type": "drought_stress",
            "severity": "moderate",
            "message": "Dry, hot conditions — increased water demand and spider mite risk",
            "action": "Increase irrigation, monitor for spider mites and other dry-weather pests",
        })
    
    # Good conditions
    if not alerts:
        alerts.append({
            "type": "favorable",
            "severity": "low",
            "message": "Weather conditions are generally favorable for crop growth",
            "action": "Continue regular monitoring and care schedule",
        })
    
    return alerts


def _generate_irrigation_advice(current: dict, daily: dict = None) -> dict:
    """Generate weather-based irrigation advice."""
    rain = current.get("rain", 0)
    humidity = current.get("relative_humidity_2m", 50)
    temp = current.get("temperature_2m", 25)
    
    # Check forecast rain
    rain_forecast = 0
    if daily and "precipitation_sum" in daily:
        rain_forecast = sum(daily["precipitation_sum"][:2])  # Next 2 days
    
    if rain > 5 or rain_forecast > 10:
        return {
            "recommendation": "delay",
            "message": f"Delay irrigation — {'current rainfall' if rain > 5 else 'rain expected'} ({rain_forecast:.0f}mm in next 48h)",
            "confidence": "high",
        }
    elif humidity > 85:
        return {
            "recommendation": "reduce",
            "message": "Reduce irrigation — soil is likely still moist due to high humidity",
            "confidence": "moderate",
        }
    elif temp > 35 and humidity < 40:
        return {
            "recommendation": "increase",
            "message": f"Increase irrigation — hot ({temp}°C) and dry ({humidity}%) conditions will increase water demand",
            "confidence": "high",
        }
    else:
        return {
            "recommendation": "normal",
            "message": "Maintain standard irrigation schedule",
            "confidence": "moderate",
        }


@router.get("/weather")
async def get_weather(
    lat: float = Query(DEFAULT_LAT, description="Latitude"),
    lon: float = Query(DEFAULT_LON, description="Longitude"),
):
    """
    Get current weather, forecast, and disease risk assessment.
    Data source: Open-Meteo (free, no API key required).
    """
    try:
        # Fetch current + forecast data
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weather_code,cloud_cover",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max",
            "hourly": "temperature_2m,relative_humidity_2m,rain",
            "timezone": "auto",
            "forecast_days": 7,
            "forecast_hours": 24,
        }
        
        response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        current = data.get("current", {})
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})
        
        # Disease risk assessment
        disease_risks = _assess_disease_risk(current, daily)
        
        # Irrigation advice
        irrigation_advice = _generate_irrigation_advice(current, daily)
        
        # Format forecast
        forecast = []
        if daily.get("time"):
            for i in range(min(7, len(daily["time"]))):
                forecast.append({
                    "date": daily["time"][i],
                    "temp_max": daily.get("temperature_2m_max", [None])[i],
                    "temp_min": daily.get("temperature_2m_min", [None])[i],
                    "precipitation": daily.get("precipitation_sum", [0])[i],
                    "rain_probability": daily.get("precipitation_probability_max", [0])[i],
                    "weather_code": daily.get("weather_code", [0])[i],
                    "wind_max": daily.get("wind_speed_10m_max", [0])[i],
                })
        
        return {
            "success": True,
            "data_source": "Open-Meteo (open-meteo.com) — Free weather API",
            "location": {"latitude": lat, "longitude": lon},
            "current": {
                "temperature": current.get("temperature_2m"),
                "humidity": current.get("relative_humidity_2m"),
                "rain": current.get("rain"),
                "wind_speed": current.get("wind_speed_10m"),
                "weather_code": current.get("weather_code"),
                "cloud_cover": current.get("cloud_cover"),
            },
            "forecast": forecast,
            "disease_risks": disease_risks,
            "irrigation_advice": irrigation_advice,
            "timestamp": datetime.now().isoformat(),
        }
    
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Weather API unavailable: {str(e)}",
            "fallback": True,
            "message": "Weather data temporarily unavailable — showing offline guidance",
            "disease_risks": [{
                "type": "unknown",
                "severity": "unknown",
                "message": "Cannot assess disease risk without current weather data",
                "action": "Monitor crops manually and check weather from another source",
            }],
        }
