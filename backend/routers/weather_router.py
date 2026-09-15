"""
AgriSmart AI — Weather Intelligence Router
Live weather data from Open-Meteo (free, no API key required).
"""

import requests
from typing import Optional
from fastapi import APIRouter, Query
from datetime import datetime, timedelta

router = APIRouter()

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_CURRENT_URL = "https://api.open-meteo.com/v1/forecast"

# Default to Ahmedabad, Gujarat (farming region context)
DEFAULT_LAT = 23.0225
DEFAULT_LON = 72.5714

WMO_CODES = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Heavy Thunderstorm",
}

def get_weather_description(code: int) -> str:
    return WMO_CODES.get(code if code is not None else 0, "Partly Cloudy")

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

@router.get("/weather/search")
async def search_location(query: str = Query(..., min_length=2)):
    """Search city / location coordinates via Open-Meteo Geocoding API."""
    try:
        response = requests.get(GEOCODING_URL, params={"name": query, "count": 5, "language": "en", "format": "json"}, timeout=5)
        response.raise_for_status()
        data = response.json()
        results = []
        for item in data.get("results", []):
            admin1 = item.get("admin1") or ""
            display_name = f"{item.get('name')}, {admin1} ({item.get('country')})".replace(",  ", ", ").replace(" ()", "")
            results.append({
                "name": item.get("name"),
                "country": item.get("country"),
                "admin1": admin1,
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "display_name": display_name,
            })
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "results": [], "error": str(e)}


@router.get("/weather/reverse")
async def reverse_geocode(lat: float = Query(...), lon: float = Query(...)):
    """Reverse geocode latitude & longitude to City Name."""
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        response = requests.get(url, timeout=5)
        if response.ok:
            data = response.json()
            city = data.get("city") or data.get("locality") or "Live Location"
            state = data.get("principalSubdivision") or ""
            country = data.get("countryName") or ""
            display_name = f"{city}{f', {state}' if state else ''}{f' ({country})' if country else ''}"
            return {
                "success": True,
                "city": city,
                "state": state,
                "country": country,
                "display_name": display_name
            }
    except Exception:
        pass

    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
        headers = {"User-Agent": "AgriSmartAI/1.0"}
        response = requests.get(url, headers=headers, timeout=5)
        if response.ok:
            data = response.json()
            addr = data.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("state_district") or "Live Location"
            state = addr.get("state") or ""
            country = addr.get("country") or ""
            display_name = f"{city}{f', {state}' if state else ''}{f' ({country})' if country else ''}"
            return {
                "success": True,
                "city": city,
                "state": state,
                "country": country,
                "display_name": display_name
            }
    except Exception:
        pass

    return {"success": True, "city": "Live Field Location", "display_name": f"{lat:.4f}° N, {lon:.4f}° E"}


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


def fetch_wttr_fallback(lat: float, lon: float):
    """Fallback weather provider using wttr.in JSON format."""
    try:
        url = f"https://wttr.in/{lat},{lon}?format=j1"
        res = requests.get(url, timeout=5)
        if res.ok:
            data = res.json()
            curr = data.get("current_condition", [{}])[0]
            temp = float(curr.get("temp_C", 25))
            humidity = int(curr.get("humidity", 65))
            precip = float(curr.get("precipMM", 0.0))
            wind = float(curr.get("windspeedKmph", 10))
            wind_dir = curr.get("winddir16Point", "N")
            cond = curr.get("weatherDesc", [{}])[0].get("value", "Partly Cloudy")
            return {
                "temperature": temp,
                "feels_like": float(curr.get("FeelsLikeC", temp)),
                "humidity": humidity,
                "precipitation": precip,
                "rain": precip,
                "wind_speed": wind,
                "wind_direction": wind_dir,
                "weather_code": 2,
                "condition": cond,
                "cloud_cover": int(curr.get("cloudcover", 50)),
                "surface_pressure": float(curr.get("pressure", 1013)),
            }
    except Exception:
        pass
    return None


@router.get("/weather")
async def get_weather(
    lat: Optional[float] = Query(None, description="Latitude"),
    lon: Optional[float] = Query(None, description="Longitude"),
    latitude: Optional[float] = Query(None, description="Latitude alias"),
    longitude: Optional[float] = Query(None, description="Longitude alias"),
):
    """
    Get live, accurate current weather, forecast, and disease risk assessment.
    Data source: Open-Meteo API + wttr.in fallback resilience.
    """
    actual_lat = latitude if latitude is not None else (lat if lat is not None else DEFAULT_LAT)
    actual_lon = longitude if longitude is not None else (lon if lon is not None else DEFAULT_LON)
    
    try:
        # Fetch enriched current + forecast parameters
        params = {
            "latitude": actual_lat,
            "longitude": actual_lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,surface_pressure",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,uv_index_max",
            "hourly": "temperature_2m,relative_humidity_2m,rain",
            "timezone": "auto",
            "forecast_days": 7,
            "forecast_hours": 24,
        }
        
        current = None
        daily = {}
        data_source = "Open-Meteo (open-meteo.com) — Live Weather API"
        
        try:
            response = requests.get(OPEN_METEO_URL, params=params, timeout=8)
            if response.ok:
                data = response.json()
                current_data = data.get("current", {})
                daily = data.get("daily", {})
                
                weather_code = current_data.get("weather_code", 0)
                current = {
                    "temperature": current_data.get("temperature_2m"),
                    "feels_like": current_data.get("apparent_temperature", current_data.get("temperature_2m")),
                    "humidity": current_data.get("relative_humidity_2m"),
                    "precipitation": current_data.get("precipitation", current_data.get("rain", 0.0)),
                    "rain": current_data.get("rain", 0.0),
                    "wind_speed": current_data.get("wind_speed_10m"),
                    "wind_direction": current_data.get("wind_direction_10m"),
                    "weather_code": weather_code,
                    "condition": get_weather_description(weather_code),
                    "cloud_cover": current_data.get("cloud_cover"),
                    "surface_pressure": current_data.get("surface_pressure"),
                }
        except Exception as e:
            print(f"[WARN] Open-Meteo API failed, using wttr.in fallback: {e}")
        
        # Fallback to wttr.in if Open-Meteo fails
        if not current:
            current = fetch_wttr_fallback(lat, lon)
            data_source = "wttr.in Weather API — Fallback Provider"
            
        if not current:
            raise requests.exceptions.RequestException("Both weather services failed")
        
        # Disease risk assessment
        disease_risks = _assess_disease_risk(current, daily)
        
        # Irrigation advice
        irrigation_advice = _generate_irrigation_advice(current, daily)
        
        # Format forecast
        forecast = []
        if daily.get("time"):
            for i in range(min(7, len(daily["time"]))):
                code = daily.get("weather_code", [0])[i]
                forecast.append({
                    "date": daily["time"][i],
                    "temp_max": daily.get("temperature_2m_max", [None])[i],
                    "temp_min": daily.get("temperature_2m_min", [None])[i],
                    "precipitation": daily.get("precipitation_sum", [0])[i],
                    "rain_probability": daily.get("precipitation_probability_max", [0])[i],
                    "uv_index": daily.get("uv_index_max", [0])[i],
                    "weather_code": code,
                    "condition": get_weather_description(code),
                    "wind_max": daily.get("wind_speed_10m_max", [0])[i],
                })
        
        return {
            "success": True,
            "source": "Open-Meteo",
            "source_url": "https://api.open-meteo.com/v1/forecast",
            "fetched_at": datetime.utcnow().isoformat(),
            "data_source": data_source,
            "latitude": actual_lat,
            "longitude": actual_lon,
            "timezone": "auto",
            "location": {"latitude": actual_lat, "longitude": actual_lon},
            "current": current,
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


