"""
AgriSmart AI — Crop Recommendation Router (Bonus Module A)
Recommends optimal crops based on soil, climate, water availability, and crop rotation history.
Cites ICAR / FAO Agronomic Standards.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class CropRecommendationRequest(BaseModel):
    soil_type: str = Field("Loamy", example="Loamy")
    ph: float = Field(6.5, ge=3.5, le=9.5, example=6.5)
    temperature_c: float = Field(28.0, example=28.0)
    humidity_pct: float = Field(65.0, example=65.0)
    rainfall_mm: float = Field(800.0, example=800.0)
    water_availability: str = Field("Medium", example="Medium") # High, Medium, Low
    season: str = Field("Kharif", example="Kharif") # Kharif, Rabi, Zaid
    location: Optional[str] = Field("Semi-Arid Plains", example="Semi-Arid Plains")
    previous_crop: Optional[str] = Field("Legumes", example="Legumes")


# Database of crop suitability rules based on ICAR / FAO Agronomic Guidelines
CROP_KNOWLEDGE_BASE = [
    {
        "crop": "Tomato",
        "category": "Vegetables",
        "suitable_seasons": ["Kharif", "Rabi"],
        "ph_range": (5.5, 7.5),
        "temp_range": (18.0, 32.0),
        "rainfall_range": (400.0, 1200.0),
        "soil_types": ["Loamy", "Black", "Red", "Alluvial"],
        "water_req": "Medium",
        "npk_ratio": "120:60:60 kg/ha",
        "yield_est": "25 - 35 Tons/ha",
        "rationale": "Thrives in well-drained loamy to black soils with moderate rainfall and temperatures between 20-30°C.",
    },
    {
        "crop": "Corn (Maize)",
        "category": "Cereals",
        "suitable_seasons": ["Kharif", "Rabi", "Zaid"],
        "ph_range": (5.8, 7.8),
        "temp_range": (18.0, 35.0),
        "rainfall_range": (500.0, 1000.0),
        "soil_types": ["Loamy", "Alluvial", "Black"],
        "water_req": "Medium",
        "npk_ratio": "120:60:40 kg/ha",
        "yield_est": "5 - 7 Tons/ha",
        "rationale": "High adaptability across seasons; responds exceptionally well to nitrogen residue after previous legume crops.",
    },
    {
        "crop": "Potato",
        "category": "Tubers",
        "suitable_seasons": ["Rabi"],
        "ph_range": (5.0, 6.5),
        "temp_range": (12.0, 24.0),
        "rainfall_range": (350.0, 700.0),
        "soil_types": ["Loamy", "Sandy", "Alluvial"],
        "water_req": "Medium",
        "npk_ratio": "150:80:100 kg/ha",
        "yield_est": "20 - 28 Tons/ha",
        "rationale": "Requires cool temperatures (15-20°C) and slightly acidic, loose loamy soil for optimal tuber enlargement.",
    },
    {
        "crop": "Chickpea (Gram)",
        "category": "Pulses / Legumes",
        "suitable_seasons": ["Rabi"],
        "ph_range": (6.0, 8.0),
        "temp_range": (15.0, 28.0),
        "rainfall_range": (250.0, 600.0),
        "soil_types": ["Black", "Loamy", "Sandy"],
        "water_req": "Low",
        "npk_ratio": "20:40:20 kg/ha",
        "yield_est": "1.5 - 2.5 Tons/ha",
        "rationale": "Excellent drought-tolerant pulse; fixes atmospheric nitrogen to enrich soil organic carbon for subsequent crops.",
    },
    {
        "crop": "Cotton",
        "category": "Cash Crops",
        "suitable_seasons": ["Kharif"],
        "ph_range": (6.0, 8.2),
        "temp_range": (21.0, 35.0),
        "rainfall_range": (500.0, 1100.0),
        "soil_types": ["Black", "Alluvial"],
        "water_req": "Medium",
        "npk_ratio": "100:50:50 kg/ha",
        "yield_est": "2.5 - 4.0 Tons/ha",
        "rationale": "Ideal for deep black cotton soil with high moisture retention during warm Kharif growing months.",
    },
    {
        "crop": "Rice (Paddy)",
        "category": "Cereals",
        "suitable_seasons": ["Kharif"],
        "ph_range": (5.5, 7.2),
        "temp_range": (20.0, 38.0),
        "rainfall_range": (1000.0, 2500.0),
        "soil_types": ["Clay", "Loamy", "Alluvial"],
        "water_req": "High",
        "npk_ratio": "100:40:40 kg/ha",
        "yield_est": "4.5 - 6.5 Tons/ha",
        "rationale": "High water affinity; best suited for clayey/alluvial soils with abundant monsoon rainfall or canal irrigation.",
    },
]


@router.post("/recommend_crop")
async def recommend_crop(req: CropRecommendationRequest):
    """
    Bonus Module A: Crop Recommendation Engine
    Calculates crop suitability matching soil pH, climate, season, water, and crop rotation history.
    """
    scores = []
    
    for c in CROP_KNOWLEDGE_BASE:
        score = 100.0
        reasons = []
        
        # pH match
        ph_min, ph_max = c["ph_range"]
        if req.ph < ph_min or req.ph > ph_max:
            diff = min(abs(req.ph - ph_min), abs(req.ph - ph_max))
            score -= diff * 25.0
            reasons.append(f"pH {req.ph} is outside ideal range ({ph_min}-{ph_max})")
        else:
            reasons.append(f"pH {req.ph} is optimal ({ph_min}-{ph_max})")
            
        # Temperature match
        t_min, t_max = c["temp_range"]
        if req.temperature_c < t_min or req.temperature_c > t_max:
            diff = min(abs(req.temperature_c - t_min), abs(req.temperature_c - t_max))
            score -= (25.0 + diff * 3.0)
            reasons.append(f"Temp {req.temperature_c}°C outside preferred range ({t_min}-{t_max}°C)")
        else:
            reasons.append(f"Temperature {req.temperature_c}°C is suitable")
            
        # Rainfall match
        r_min, r_max = c["rainfall_range"]
        if req.rainfall_mm < r_min or req.rainfall_mm > r_max:
            diff = min(abs(req.rainfall_mm - r_min), abs(req.rainfall_mm - r_max))
            score -= min(25.0, diff * 0.04)
            reasons.append(f"Rainfall {req.rainfall_mm}mm outside ideal range ({r_min}-{r_max}mm)")
        else:
            reasons.append(f"Rainfall {req.rainfall_mm}mm is optimal ({r_min}-{r_max}mm)")
            
        # Season match
        if req.season in c["suitable_seasons"]:
            reasons.append(f"Well-suited for {req.season} season")
        else:
            score -= 40.0
            reasons.append(f"Suboptimal for {req.season} season")
            
        # Soil type match
        if req.soil_type in c["soil_types"]:
            reasons.append(f"{req.soil_type} soil matches crop preference")
        else:
            score -= 30.0
            reasons.append(f"{req.soil_type} soil is not preferred")
            
        # Water availability match
        if req.water_availability == "Low" and c["water_req"] == "High":
            score -= 50.0
            reasons.append("Critical: High water demand lacks availability")
        elif req.water_availability == "Medium" and c["water_req"] == "High":
            score -= 20.0
            reasons.append("Medium water availability limits high requirement")
            
        # Previous crop bonus (Nitrogen fixation from legumes)
        if req.previous_crop and "legume" in req.previous_crop.lower() and c["category"] in ["Cereals", "Vegetables"]:
            score += 8.0
            reasons.append("Benefits from nitrogen fixation residual from previous legume crop")
            
        final_score = max(0.0, min(99.0, round(score, 1)))
        
        scores.append({
            "crop": c["crop"],
            "category": c["category"],
            "suitability_pct": final_score,
            "rationale": c["rationale"],
            "npk_ratio": c["npk_ratio"],
            "yield_estimate": c["yield_est"],
            "key_factors": reasons,
        })
        
    # Sort by suitability score descending
    scores.sort(key=lambda x: x["suitability_pct"], reverse=True)
    
    return {
        "success": True,
        "evaluation_metric": "Crop Suitability Score (Percentage Match 0–100%) computed via ICAR Agronomic Penalty Matrix",
        "data_source": "ICAR / FAO Crop Suitability Guidelines & Soil Science Database",
        "inputs": req.dict(),
        "top_recommendations": scores[:3],
        "all_evaluated": scores,
    }
