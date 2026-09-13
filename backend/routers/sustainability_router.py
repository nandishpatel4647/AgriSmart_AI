"""
AgriSmart AI — Sustainability Score Router
Published, reproducible formula for computing sustainability scores.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()


class SustainabilityInput(BaseModel):
    """Input parameters for sustainability score calculation."""
    # Water efficiency
    water_used_liters: float = Field(default=50.0, ge=0, description="Water used today (liters)")
    water_recommended_liters: float = Field(default=60.0, gt=0, description="Recommended water (liters)")
    rainwater_harvested: bool = Field(default=False, description="Using rainwater harvesting")
    drip_irrigation: bool = Field(default=False, description="Using drip/efficient irrigation")
    
    # Resource use
    pesticide_used: bool = Field(default=False, description="Chemical pesticide applied recently")
    organic_methods: bool = Field(default=False, description="Using organic pest management")
    fertilizer_excess: bool = Field(default=False, description="Fertilizer applied above recommendation")
    crop_rotation: bool = Field(default=True, description="Practicing crop rotation")
    
    # Crop health
    disease_detected: bool = Field(default=False, description="Disease currently detected")
    disease_confidence: float = Field(default=0.0, ge=0, le=1, description="Disease detection confidence")
    is_healthy: bool = Field(default=True, description="Overall crop health status")
    preventive_measures: bool = Field(default=False, description="Taking preventive disease measures")


# ══════════════════════════════════════════════════════════════════════
# SUSTAINABILITY SCORE FORMULA — PUBLISHED AND REPRODUCIBLE
# ══════════════════════════════════════════════════════════════════════
#
# Total Score = Water Efficiency (40%) + Resource Use (30%) + Crop Health (30%)
#
# Each sub-score ranges from 0 to 100.
#
# WATER EFFICIENCY (40% of total):
#   Base = min(100, (recommended / max(used, 0.1)) × 80)
#   + 10 if rainwater harvesting
#   + 10 if drip/efficient irrigation
#   Capped at 100.
#
# RESOURCE USE (30% of total):
#   Base = 50
#   + 20 if organic pest management
#   + 15 if crop rotation practiced
#   - 20 if chemical pesticide used (not organic)
#   - 15 if excess fertilizer applied
#   Clamped to [0, 100].
#
# CROP HEALTH (30% of total):
#   Base = 80 if healthy, else 40
#   + 20 if preventive measures taken
#   - (disease_confidence × 30) if disease detected
#   Clamped to [0, 100].
#
# SCORE BANDS:
#   0-39:   Poor       → Critical improvements needed
#   40-59:  Fair       → Several areas need attention
#   60-79:  Good       → Mostly sustainable, minor improvements possible
#   80-100: Excellent  → Strong sustainable practices
# ══════════════════════════════════════════════════════════════════════


def _compute_sustainability(inp: SustainabilityInput) -> dict:
    """Compute sustainability score using the published formula."""
    
    # --- Water Efficiency (40%) ---
    water_ratio = inp.water_recommended_liters / max(inp.water_used_liters, 0.1)
    water_score = min(100, water_ratio * 80)
    
    if inp.rainwater_harvested:
        water_score += 10
    if inp.drip_irrigation:
        water_score += 10
    
    water_score = min(100, max(0, water_score))
    
    water_details = {
        "score": round(water_score, 1),
        "weight": 0.4,
        "factors": [
            f"Water efficiency ratio: {water_ratio:.2f} (recommended/used)",
            f"Rainwater harvesting: {'Yes (+10)' if inp.rainwater_harvested else 'No'}",
            f"Drip irrigation: {'Yes (+10)' if inp.drip_irrigation else 'No'}",
        ],
    }
    
    # --- Resource Use (30%) ---
    resource_score = 50  # Base
    
    if inp.organic_methods:
        resource_score += 20
    if inp.crop_rotation:
        resource_score += 15
    if inp.pesticide_used and not inp.organic_methods:
        resource_score -= 20
    if inp.fertilizer_excess:
        resource_score -= 15
    
    resource_score = min(100, max(0, resource_score))
    
    resource_details = {
        "score": round(resource_score, 1),
        "weight": 0.3,
        "factors": [
            f"Organic methods: {'Yes (+20)' if inp.organic_methods else 'No'}",
            f"Crop rotation: {'Yes (+15)' if inp.crop_rotation else 'No'}",
            f"Chemical pesticide: {'Yes (-20)' if inp.pesticide_used and not inp.organic_methods else 'No/Organic'}",
            f"Excess fertilizer: {'Yes (-15)' if inp.fertilizer_excess else 'No'}",
        ],
    }
    
    # --- Crop Health (30%) ---
    health_score = 80 if inp.is_healthy else 40
    
    if inp.preventive_measures:
        health_score += 20
    if inp.disease_detected:
        health_score -= inp.disease_confidence * 30
    
    health_score = min(100, max(0, health_score))
    
    health_details = {
        "score": round(health_score, 1),
        "weight": 0.3,
        "factors": [
            f"Crop health status: {'Healthy (base 80)' if inp.is_healthy else 'Disease detected (base 40)'}",
            f"Preventive measures: {'Yes (+20)' if inp.preventive_measures else 'No'}",
            f"Disease impact: {'-' + str(round(inp.disease_confidence * 30, 1)) if inp.disease_detected else 'None'}",
        ],
    }
    
    # --- Total Score ---
    total_score = (
        water_score * 0.4 +
        resource_score * 0.3 +
        health_score * 0.3
    )
    total_score = round(total_score, 1)
    
    # --- Score Band & Suggestions ---
    if total_score >= 80:
        band = "Excellent"
        color = "#22c55e"
        suggestions = [
            "Outstanding sustainable practices — continue maintaining your approach",
            "Consider sharing your methods with neighboring farmers",
            "Document your practices for potential organic certification",
        ]
    elif total_score >= 60:
        band = "Good"
        color = "#84cc16"
        suggestions = [
            "Adopt drip irrigation to reduce water waste by 30-50%" if not inp.drip_irrigation else "Water efficiency is good — maintain current approach",
            "Consider organic pest management alternatives" if inp.pesticide_used else "Continue organic pest management practices",
            "Install rainwater harvesting to improve water independence" if not inp.rainwater_harvested else "Rainwater harvesting is working well",
        ]
    elif total_score >= 40:
        band = "Fair"
        color = "#f59e0b"
        suggestions = [
            "Reduce chemical pesticide use — try integrated pest management (IPM)",
            "Switch to drip irrigation to improve water efficiency significantly",
            "Implement crop rotation to improve soil health and reduce disease pressure",
        ]
    else:
        band = "Poor"
        color = "#ef4444"
        suggestions = [
            "PRIORITY: Address water overuse — current usage exceeds recommendations significantly",
            "PRIORITY: Reduce chemical inputs — consider organic alternatives for pest management",
            "START: Implement basic sustainable practices like crop rotation and mulching",
        ]
    
    return {
        "total_score": total_score,
        "band": band,
        "band_color": color,
        "components": {
            "water_efficiency": water_details,
            "resource_use": resource_details,
            "crop_health": health_details,
        },
        "suggestions": suggestions,
    }


@router.post("/sustainability")
async def compute_sustainability(inp: SustainabilityInput):
    """
    Compute sustainability score using a published, reproducible formula.
    
    Formula: Total = Water Efficiency (40%) + Resource Use (30%) + Crop Health (30%)
    Each component scored 0-100. Total clamped to [0, 100].
    
    Bands: Poor (<40), Fair (40-60), Good (60-80), Excellent (80-100)
    """
    result = _compute_sustainability(inp)
    
    return {
        "success": True,
        "input": inp.model_dump(),
        "sustainability": result,
        "formula": {
            "description": "Total = Water Efficiency × 0.4 + Resource Use × 0.3 + Crop Health × 0.3",
            "water_efficiency": "min(100, (recommended/used) × 80) + rainwater(+10) + drip(+10)",
            "resource_use": "50 + organic(+20) + rotation(+15) - pesticide(-20) - excess_fertilizer(-15)",
            "crop_health": "(healthy ? 80 : 40) + preventive(+20) - disease(confidence × 30)",
            "bands": {"Poor": "0-39", "Fair": "40-59", "Good": "60-79", "Excellent": "80-100"},
        },
    }


@router.get("/sustainability/formula")
async def get_formula():
    """Get the complete sustainability score formula documentation."""
    return {
        "formula": {
            "total": "Water Efficiency (40%) + Resource Use (30%) + Crop Health (30%)",
            "water_efficiency": {
                "weight": "40%",
                "calculation": "min(100, (recommended_water / used_water) × 80) + rainwater_bonus(10) + drip_bonus(10)",
                "range": "0-100",
            },
            "resource_use": {
                "weight": "30%",
                "calculation": "Base(50) + organic(+20) + rotation(+15) - chemical_pesticide(-20) - excess_fertilizer(-15)",
                "range": "0-100",
            },
            "crop_health": {
                "weight": "30%",
                "calculation": "Base(80 if healthy, 40 if disease) + preventive_measures(+20) - disease_severity(confidence × 30)",
                "range": "0-100",
            },
        },
        "bands": {
            "Excellent": {"range": "80-100", "color": "#22c55e"},
            "Good": {"range": "60-79", "color": "#84cc16"},
            "Fair": {"range": "40-59", "color": "#f59e0b"},
            "Poor": {"range": "0-39", "color": "#ef4444"},
        },
    }
