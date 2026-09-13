"""
AgriSmart AI — Agentic Advisor Decision Engine (P2)
Coordinates all data sources into unified, actionable farm recommendations.
This is the "brain" that ties disease detection + weather + irrigation + sustainability together.
"""

import sys
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "model"))


def generate_advisory(
    prediction: Optional[dict] = None,
    weather: Optional[dict] = None,
    irrigation: Optional[dict] = None,
    sustainability: Optional[dict] = None,
    sensor_data: Optional[dict] = None,
) -> dict:
    """
    Generate a unified advisory by cross-referencing all available data sources.
    
    This is the agentic decision engine that produces prioritized, 
    non-contradictory recommendations by considering all inputs together.
    
    Returns a structured advisory with prioritized actions.
    """
    actions = []
    risk_level = "low"
    urgency_scores = {"critical": 4, "high": 3, "moderate": 2, "low": 1, "none": 0}
    
    # ──────────────────────────────────────────────────────
    # 1. Disease-driven actions (highest priority)
    # ──────────────────────────────────────────────────────
    if prediction and not prediction.get("is_healthy", True):
        disease = prediction.get("disease", "Unknown")
        confidence = prediction.get("confidence", 0)
        severity = prediction.get("severity", "Unknown")
        
        if confidence > 0.7:
            risk_level = "high"
            actions.append({
                "priority": 1,
                "urgency": "high",
                "category": "disease_treatment",
                "title": f"Treat {disease} immediately",
                "details": prediction.get("guidance", ["Consult local agricultural extension officer"]),
                "reasoning": f"AI detected {disease} with {confidence*100:.0f}% confidence, severity: {severity}",
            })
        elif confidence > 0.4:
            risk_level = "moderate"
            actions.append({
                "priority": 2,
                "urgency": "moderate",
                "category": "disease_monitoring",
                "title": f"Monitor for {disease}",
                "details": [
                    f"AI detected possible {disease} ({confidence*100:.0f}% confidence) — not yet conclusive",
                    "Take a clearer, closer photo and re-scan for confirmation",
                    "Inspect neighboring plants for similar symptoms",
                ] + (prediction.get("guidance", [])[:2]),
                "reasoning": f"Moderate confidence detection — confirmation recommended before treatment",
            })
    
    # ──────────────────────────────────────────────────────
    # 2. Weather-disease cross-reference
    # ──────────────────────────────────────────────────────
    if weather and weather.get("disease_risks"):
        for risk in weather["disease_risks"]:
            if risk.get("severity") in ("high", "moderate"):
                # Cross-reference: if disease was detected AND weather favors it
                weather_amplifies_disease = (
                    prediction and 
                    not prediction.get("is_healthy", True) and 
                    risk.get("type") in ("fungal_risk", "late_blight_risk")
                )
                
                if weather_amplifies_disease:
                    actions.append({
                        "priority": 1,
                        "urgency": "critical",
                        "category": "weather_disease_synergy",
                        "title": "URGENT: Weather conditions will worsen disease spread",
                        "details": [
                            f"Current weather favors {risk.get('type', 'disease')} development",
                            risk.get("action", "Take preventive action"),
                            "Apply treatment immediately before weather window closes",
                        ],
                        "reasoning": f"Disease detected + weather conditions amplify spread risk",
                    })
                    risk_level = "critical"
                else:
                    actions.append({
                        "priority": 3,
                        "urgency": risk.get("severity", "moderate"),
                        "category": "weather_risk",
                        "title": f"Weather alert: {risk.get('type', 'condition')}",
                        "details": [risk.get("message", ""), risk.get("action", "")],
                        "reasoning": "Weather-based disease risk assessment",
                    })
    
    # ──────────────────────────────────────────────────────
    # 3. Irrigation actions (coordinate with weather)
    # ──────────────────────────────────────────────────────
    if irrigation:
        irrig = irrigation.get("recommendation", irrigation)
        if isinstance(irrig, dict):
            rec = irrig.get("recommendation", "normal")
            irrig_reasoning = irrig.get("reasoning", [])
            irrig_schedule = irrig.get("schedule", "")
        else:
            rec = str(irrig)
            irrig_reasoning = irrigation.get("reasoning", [])
            irrig_schedule = irrigation.get("schedule", "")
        
        # Cross-reference: don't recommend irrigation if disease needs dry conditions
        disease_needs_dry = (
            prediction and 
            not prediction.get("is_healthy", True) and 
            prediction.get("disease", "").lower() in (
                "late blight", "leaf mold", "powdery mildew", "downy mildew"
            )
        )
        
        if rec == "irrigate_urgent" and not disease_needs_dry:
            actions.append({
                "priority": 2,
                "urgency": "high",
                "category": "irrigation",
                "title": "Irrigate immediately — soil critically dry",
                "details": irrig_reasoning,
                "reasoning": "Soil moisture below critical threshold",
            })
        elif rec == "irrigate" and not disease_needs_dry:
            actions.append({
                "priority": 3,
                "urgency": "moderate",
                "category": "irrigation",
                "title": "Irrigation recommended",
                "details": irrig_reasoning + ([irrig_schedule] if irrig_schedule else []),
                "reasoning": "Soil moisture below optimal range",
            })
        elif disease_needs_dry and rec in ("irrigate", "irrigate_urgent"):
            actions.append({
                "priority": 2,
                "urgency": "moderate",
                "category": "irrigation_conflict",
                "title": "Irrigation conflict: disease needs drier conditions",
                "details": [
                    f"Soil moisture is low, but detected {prediction.get('disease', 'disease')} thrives in wet conditions",
                    "Reduce irrigation frequency — water only at base of plant",
                    "Improve drainage and air circulation instead",
                    "Apply fungicide before any irrigation",
                ],
                "reasoning": "Disease treatment takes priority over irrigation schedule",
            })
        elif rec in ("reduce", "delay"):
            actions.append({
                "priority": 3,
                "urgency": "low",
                "category": "irrigation",
                "title": f"Adjust irrigation: {rec.capitalize()}",
                "details": irrig_reasoning or [f"Recommended to {rec} irrigation based on current conditions"],
                "reasoning": "Soil moisture and weather indicate reduced water requirement",
            })
        elif rec == "stop":
            actions.append({
                "priority": 2,
                "urgency": "high",
                "category": "irrigation",
                "title": "Stop irrigation — waterlogging risk",
                "details": irrig_reasoning,
                "reasoning": "Excess moisture risks root rot and fungal disease",
            })
    
    # ──────────────────────────────────────────────────────
    # 4. Sustainability improvements
    # ──────────────────────────────────────────────────────
    if sustainability:
        score = sustainability.get("total_score", 100)
        if score < 60:
            suggestions = sustainability.get("suggestions", [])
            actions.append({
                "priority": 4,
                "urgency": "low",
                "category": "sustainability",
                "title": f"Improve sustainability (score: {score}/100)",
                "details": suggestions[:3],
                "reasoning": f"Sustainability score is {sustainability.get('band', 'below target')}",
            })
    
    # ──────────────────────────────────────────────────────
    # 5. Default — everything is fine
    # ──────────────────────────────────────────────────────
    if not actions:
        actions.append({
            "priority": 5,
            "urgency": "none",
            "category": "all_clear",
            "title": "All systems healthy",
            "details": [
                "No diseases detected, weather conditions are favorable",
                "Continue regular monitoring and care schedule",
                "Consider uploading another leaf scan in 3-5 days",
            ],
            "reasoning": "No actionable issues detected across all data sources",
        })
    
    # Sort by priority (1 = highest)
    actions.sort(key=lambda a: (urgency_scores.get(a.get("urgency", "low"), 1) * -1, a["priority"]))
    
    return {
        "risk_level": risk_level,
        "total_actions": len(actions),
        "actions": actions,
        "prioritized_actions": actions,
        "data_sources_used": {
            "disease_detection": prediction is not None,
            "weather": weather is not None,
            "irrigation": irrigation is not None,
            "sustainability": sustainability is not None,
            "sensors": sensor_data is not None,
        },
    }
