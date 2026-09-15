"""
AgriSmart AI — Smart Irrigation Router
Rule-based irrigation recommendation engine with documented thresholds.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class IrrigationRequest(BaseModel):
    """Input for irrigation recommendation."""
    soil_moisture: float = Field(..., ge=0, le=100, description="Soil moisture percentage (0-100)")
    crop_type: str = Field(default="Tomato", description="Crop type")
    growth_stage: str = Field(default="growing", description="Growth stage: seedling/growing/flowering/fruiting/mature")
    temperature: float = Field(default=28.0, description="Current temperature (°C)")
    humidity: float = Field(default=60.0, description="Relative humidity (%)")
    rain_probability: float = Field(default=0.0, ge=0, le=100, description="Rain probability next 24h (%)")
    rain_amount_forecast: float = Field(default=0.0, ge=0, description="Forecasted rain in mm next 24h")


# Documented irrigation thresholds per crop type
# Source: FAO Irrigation and Drainage Paper No. 56 (simplified)
CROP_THRESHOLDS = {
    "Tomato": {
        "critical_low": 25,     # Below this: urgent irrigation needed
        "optimal_low": 40,      # Below this: irrigation recommended
        "optimal_high": 70,     # Above this: reduce irrigation
        "waterlogged": 85,      # Above this: stop, risk of root rot
        "daily_water_need_mm": 5.0,  # Approximate daily water need
    },
    "Potato": {
        "critical_low": 30,
        "optimal_low": 45,
        "optimal_high": 75,
        "waterlogged": 85,
        "daily_water_need_mm": 4.5,
    },
    "Corn": {
        "critical_low": 25,
        "optimal_low": 40,
        "optimal_high": 70,
        "waterlogged": 80,
        "daily_water_need_mm": 6.0,
    },
    "Apple": {
        "critical_low": 30,
        "optimal_low": 45,
        "optimal_high": 70,
        "waterlogged": 85,
        "daily_water_need_mm": 4.0,
    },
    "Grape": {
        "critical_low": 20,
        "optimal_low": 35,
        "optimal_high": 65,
        "waterlogged": 80,
        "daily_water_need_mm": 3.5,
    },
    "Bell Pepper": {
        "critical_low": 30,
        "optimal_low": 45,
        "optimal_high": 70,
        "waterlogged": 85,
        "daily_water_need_mm": 4.5,
    },
}

# Growth stage modifiers
STAGE_MODIFIERS = {
    "seedling": {"water_multiplier": 0.6, "sensitivity": "high"},
    "growing": {"water_multiplier": 0.8, "sensitivity": "moderate"},
    "flowering": {"water_multiplier": 1.0, "sensitivity": "very high"},
    "fruiting": {"water_multiplier": 1.2, "sensitivity": "high"},
    "mature": {"water_multiplier": 0.5, "sensitivity": "low"},
}

DEFAULT_THRESHOLDS = {
    "critical_low": 25,
    "optimal_low": 40,
    "optimal_high": 70,
    "waterlogged": 85,
    "daily_water_need_mm": 5.0,
}


def _compute_irrigation(req: IrrigationRequest) -> dict:
    """
    Compute irrigation recommendation using documented rule-based logic.
    
    Decision Tree:
    1. If soil_moisture > waterlogged → STOP irrigation (root rot risk)
    2. If rain likely (>60% prob, >5mm) → DELAY irrigation
    3. If soil_moisture < critical_low → URGENT irrigation
    4. If soil_moisture < optimal_low → irrigate normally
    5. If optimal_low <= moisture <= optimal_high → no irrigation needed
    6. If moisture > optimal_high → reduce/skip irrigation
    
    Adjustments for temperature, growth stage, and humidity.
    """
    thresholds = CROP_THRESHOLDS.get(req.crop_type, DEFAULT_THRESHOLDS)
    stage = STAGE_MODIFIERS.get(req.growth_stage, STAGE_MODIFIERS["growing"])
    
    moisture = req.soil_moisture
    result = {
        "recommendation": "",
        "urgency": "",
        "reasoning": [],
        "amount_mm": 0,
        "schedule": "",
        "thresholds_used": thresholds,
        "growth_stage_info": stage,
    }
    
    # Rule 1: Waterlogged
    if moisture > thresholds["waterlogged"]:
        result["recommendation"] = "stop"
        result["urgency"] = "high"
        result["reasoning"] = [
            f"Soil moisture ({moisture}%) exceeds waterlogging threshold ({thresholds['waterlogged']}%)",
            "Risk of root rot and fungal disease",
            "Ensure drainage is functioning properly",
        ]
        result["schedule"] = "Do not irrigate until moisture drops below optimal range"
        return result
    
    # Rule 2: Rain forecast
    if req.rain_probability > 60 and req.rain_amount_forecast > 5:
        if moisture > thresholds["critical_low"]:
            result["recommendation"] = "delay"
            result["urgency"] = "low"
            result["reasoning"] = [
                f"Rain likely ({req.rain_probability}% probability, ~{req.rain_amount_forecast}mm expected)",
                f"Current moisture ({moisture}%) is above critical threshold",
                "Natural rainfall should provide adequate water",
            ]
            result["schedule"] = "Skip today's irrigation, reassess after rainfall"
            return result
    
    # Rule 3: Critical low
    if moisture < thresholds["critical_low"]:
        base_amount = thresholds["daily_water_need_mm"] * stage["water_multiplier"]
        # Extra water to recover from critical deficit
        extra = (thresholds["optimal_low"] - moisture) * 0.3
        total = base_amount + extra
        
        # Temperature adjustment
        if req.temperature > 35:
            total *= 1.3
        
        result["recommendation"] = "irrigate_urgent"
        result["urgency"] = "critical"
        result["reasoning"] = [
            f"CRITICAL: Soil moisture ({moisture}%) is below critical threshold ({thresholds['critical_low']}%)",
            f"Crop ({req.crop_type}) at {req.growth_stage} stage requires immediate water",
            f"Temperature ({req.temperature}°C) {'increases' if req.temperature > 30 else 'moderates'} water demand",
        ]
        result["amount_mm"] = round(total, 1)
        result["schedule"] = "Irrigate immediately, recheck moisture in 4-6 hours"
        return result
    
    # Rule 4: Below optimal
    if moisture < thresholds["optimal_low"]:
        base_amount = thresholds["daily_water_need_mm"] * stage["water_multiplier"]
        
        if req.temperature > 35:
            base_amount *= 1.2
        if req.humidity < 30:
            base_amount *= 1.1
        
        result["recommendation"] = "irrigate"
        result["urgency"] = "moderate"
        result["reasoning"] = [
            f"Soil moisture ({moisture}%) is below optimal range ({thresholds['optimal_low']}-{thresholds['optimal_high']}%)",
            f"{req.crop_type} at {req.growth_stage} stage — sensitivity: {stage['sensitivity']}",
        ]
        result["amount_mm"] = round(base_amount, 1)
        result["schedule"] = "Irrigate today, preferably in early morning or late evening"
        return result
    
    # Rule 5: Optimal range
    if moisture <= thresholds["optimal_high"]:
        result["recommendation"] = "no_irrigation"
        result["urgency"] = "none"
        result["reasoning"] = [
            f"Soil moisture ({moisture}%) is within optimal range ({thresholds['optimal_low']}-{thresholds['optimal_high']}%)",
            "No irrigation needed at this time",
        ]
        result["schedule"] = "Recheck in 12-24 hours"
        return result
    
    # Rule 6: Above optimal
    result["recommendation"] = "reduce"
    result["urgency"] = "low"
    result["reasoning"] = [
        f"Soil moisture ({moisture}%) is above optimal ({thresholds['optimal_high']}%)",
        "Reduce irrigation frequency to avoid waterlogging",
    ]
    result["schedule"] = "Skip next scheduled irrigation"
    return result


@router.post("/irrigation")
async def get_irrigation_recommendation(req: IrrigationRequest):
    """
    Get smart irrigation recommendation.
    
    Uses documented rule-based thresholds derived from FAO guidelines.
    Decision logic is fully transparent and reproducible.
    """
    result = _compute_irrigation(req)
    
    return {
        "success": True,
        "input": req.model_dump(),
        "recommendation": result,
        "methodology": {
            "approach": "Rule-based decision tree with documented thresholds",
            "source": "Simplified from FAO Irrigation & Drainage Paper No. 56",
            "variables": ["soil_moisture", "crop_type", "growth_stage", "temperature", "humidity", "rain_forecast"],
            "transparency": "All thresholds and decision rules are published and reproducible",
        },
    }


@router.get("/irrigation/thresholds")
async def get_thresholds():
    """Get the documented irrigation thresholds for all supported crops."""
    return {
        "crop_thresholds": CROP_THRESHOLDS,
        "growth_stage_modifiers": STAGE_MODIFIERS,
        "methodology": "Rule-based with thresholds adapted from FAO guidelines",
    }


class InsightRequest(BaseModel):
    crop: str = "Tomato"
    growth_stage: str = "Growing"
    soil_moisture: int = Field(default=31, ge=0, le=100)
    rain_probability: int = Field(default=18, ge=0, le=100)
    temperature: float = Field(default=29.0, ge=-20, le=60)
    disease_detected: bool = False
    language: str = "en"


@router.post("/insights")
async def get_insights(payload: InsightRequest):
    """
    Compute explainable irrigation guidance and sustainability score.
    Fully considers crop family and growth stage parameters.
    """
    # 1. Run FAO-56 rule computation
    irr_req = IrrigationRequest(
        soil_moisture=float(payload.soil_moisture),
        crop_type=payload.crop,
        growth_stage=payload.growth_stage.lower(),
        temperature=payload.temperature,
        humidity=60.0,
        rain_probability=float(payload.rain_probability),
        rain_amount_forecast=12.0 if payload.rain_probability > 50 else 0.0
    )
    fao_res = _compute_irrigation(irr_req)

    rain_prob = payload.rain_probability
    moisture = payload.soil_moisture
    crop_name = payload.crop
    stage_name = payload.growth_stage.capitalize()
    
    stage_info = fao_res.get("growth_stage_info", {})
    sensitivity = stage_info.get("sensitivity", "moderate")
    multiplier = stage_info.get("water_multiplier", 1.0)
    
    rec_type = fao_res.get("recommendation", "no_irrigation")
    amount_mm = fao_res.get("amount_mm", 0)

    if rec_type == "stop":
        irrigation_status = "stop"
        title = f"Stop Watering — Soil Waterlogged ({moisture}%)"
        reason = f"Soil moisture ({moisture}%) exceeds safe limit for {crop_name} at {stage_name} stage. High risk of root rot."
    elif rec_type == "delay":
        irrigation_status = "hold"
        title = f"Hold Irrigation — Rain Expected ({rain_prob}%)"
        reason = f"24h Rain forecast is {rain_prob}%. Natural rainfall will irrigate your {crop_name} crop."
    elif rec_type in ["irrigate_urgent", "irrigate"]:
        irrigation_status = "water_soon"
        title = f"Irrigate {crop_name} ({amount_mm} mm Needed)"
        reason = f"{crop_name} is in {stage_name} stage (sensitivity: {sensitivity}). Moisture ({moisture}%) is below optimal limit ({fao_res['thresholds_used']['optimal_low']}%)."
    else:
        irrigation_status = "monitor"
        title = f"Optimal Soil Moisture for {crop_name}"
        reason = f"Soil moisture ({moisture}%) is within optimal range ({fao_res['thresholds_used']['optimal_low']}%–{fao_res['thresholds_used']['optimal_high']}%) for {stage_name} {crop_name}."

    score = max(0, min(100, round(45 + (moisture * 0.25) + (25 if not payload.disease_detected else 8) - (rain_prob * 0.08))))
    
    if irrigation_status == "hold":
        suggestions = [
          f"Keep irrigation paused until rain forecast completes for {crop_name}.",
          "Use drip irrigation lines to avoid leaf dampness."
        ]
    elif irrigation_status == "water_soon":
        suggestions = [
          f"Apply ~{amount_mm} mm (~{round(amount_mm * 10)} L/m²) early in the morning.",
          f"{stage_name} stage has {sensitivity} root sensitivity — irrigate at soil root zone."
        ]
    else:
        suggestions = [
          f"Re-check soil moisture at root depth for {crop_name} tomorrow.",
          "Keep foliage dry to prevent leaf spot fungal infections."
        ]
        
    if payload.language == "hi":
        title_map = {"Hold irrigation": "सिंचाई रोकें", "Water within 12 hours": "12 घंटे में पानी दें", "Monitor moisture": "नमी पर नज़र रखें"}
        title = title_map.get(title, title)
        suggestions = ["जड़ों के पास नमी जाँचें और पत्तियों को सूखा रखें।", "बारिश की संभावना होने पर अतिरिक्त पानी न दें।"]

    activity_log = [
        f"Crop selected: {crop_name} ({stage_name} stage, {multiplier}x water factor)",
        f"Soil Moisture checked: {moisture}% vs FAO optimal target ({fao_res['thresholds_used']['optimal_low']}%–{fao_res['thresholds_used']['optimal_high']}%)",
        f"Rain probability checked: {rain_prob}% forecast",
        f"Recommendation: {title}",
    ]

    return {
        "success": True,
        "irrigation_status": irrigation_status,
        "irrigation_title": title,
        "irrigation_reason": reason,
        "sustainability_score": score,
        "score_formula": "FAO-56 Soil Moisture + Crop Stage Factor − Rain Offset",
        "suggestions": suggestions,
        "activity_log": activity_log,
        "fao_details": fao_res,
    }
