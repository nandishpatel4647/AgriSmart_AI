"""
AgriSmart AI — Farmer Assistant Router
Gemini-grounded GenAI assistant with structured context injection.
Falls back to rule-based guidance when API is unavailable.
"""

import os
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List

router = APIRouter()


class AssistantRequest(BaseModel):
    """Farmer assistant request with structured context."""
    question: str = Field(..., description="Farmer's question")
    language: str = Field(default="english", description="Response language: english, hindi, gujarati")
    
    # Structured context from the app (grounded data)
    context: Optional[dict] = Field(default=None, description="Structured context from app state")
    # Context fields:
    #   detected_disease, confidence, crop, severity, guidance,
    #   weather (temp, humidity, rain), soil_moisture,
    #   irrigation_recommendation, sustainability_score


SYSTEM_PROMPT = """You are AgriSmart AI, a knowledgeable and helpful agricultural advisor for Indian farmers. 

CRITICAL RULES:
1. ONLY answer based on the provided context data from the AgriSmart AI system. Do NOT hallucinate or make up information not in the context.
2. Be practical, actionable, and farmer-friendly. Use simple language.
3. If the context contains disease detection results, ALWAYS reference the specific detected disease, confidence level, and recommended guidance.
4. If weather data is available, incorporate it into your advice.
5. Never recommend purchasing specific branded products. Give generic guidance (e.g., "copper-based fungicide" not a brand name).
6. Be honest about uncertainty. If confidence is low or information is missing, say so.
7. Keep responses concise — farmers need quick, clear answers.

{language_instruction}

CONTEXT FROM AGRISMART AI SYSTEM:
{context}

Respond to the farmer's question based on the above context.
"""

LANGUAGE_INSTRUCTIONS = {
    "english": "Respond in clear, simple English.",
    "hindi": "Respond in Hindi (Devanagari script). Use simple, commonly understood Hindi suitable for farmers.",
    "gujarati": "Respond in Gujarati (Gujarati script). Use simple, commonly understood Gujarati suitable for farmers.",
}


def _format_context(context: dict) -> str:
    """Format structured context into a readable string for the LLM."""
    if not context:
        return "No specific context available — provide general agricultural guidance."
    
    parts = []
    
    if "detected_disease" in context:
        parts.append(f"Disease Detection: {context['detected_disease']}")
        if "confidence" in context:
            parts.append(f"Confidence: {context['confidence']*100:.1f}%")
        if "crop" in context:
            parts.append(f"Crop: {context['crop']}")
        if "severity" in context:
            parts.append(f"Severity: {context['severity']}")
        if "guidance" in context and context["guidance"]:
            parts.append(f"Recommended Actions: {'; '.join(context['guidance'][:3])}")
    
    if "weather" in context:
        w = context["weather"]
        parts.append(f"Weather: {w.get('temperature', 'N/A')}°C, {w.get('humidity', 'N/A')}% humidity, Rain: {w.get('rain', 'N/A')}mm")
    
    if "soil_moisture" in context:
        parts.append(f"Soil Moisture: {context['soil_moisture']}%")
    
    if "irrigation_recommendation" in context:
        parts.append(f"Irrigation: {context['irrigation_recommendation']}")
    
    if "sustainability_score" in context:
        parts.append(f"Sustainability Score: {context['sustainability_score']}")
    
    return "\n".join(parts) if parts else "No specific context available."


def _generate_fallback_response(question: str, context: dict, language: str) -> str:
    """
    Generate rule-based response when Gemini API is unavailable.
    Clearly labeled as offline/rule-based guidance.
    """
    response_parts = ["**[Offline Guidance Mode — AI Assistant temporarily unavailable]**\n"]
    
    question_lower = question.lower()
    
    if context:
        # Provide context-aware guidance
        if context.get("detected_disease"):
            disease = context.get("detected_disease", "Unknown")
            crop = context.get("crop", "Unknown")
            confidence = context.get("confidence", 0)
            
            response_parts.append(f"Based on your recent scan, **{disease}** was detected on your **{crop}** crop with {confidence*100:.0f}% confidence.\n")
            
            if context.get("guidance"):
                response_parts.append("**Recommended actions:**")
                for g in context["guidance"][:4]:
                    response_parts.append(f"• {g}")
            
            if context.get("severity"):
                response_parts.append(f"\n**Severity:** {context['severity']}")
        
        if context.get("weather"):
            w = context["weather"]
            response_parts.append(f"\n**Current weather:** {w.get('temperature', 'N/A')}°C, {w.get('humidity', 'N/A')}% humidity")
        
        if context.get("irrigation_recommendation"):
            response_parts.append(f"\n**Irrigation:** {context['irrigation_recommendation']}")
    
    # Add general guidance based on question keywords
    if any(word in question_lower for word in ["treatment", "treat", "cure", "medicine", "spray"]):
        response_parts.append("\n**General treatment guidance:**")
        response_parts.append("• For fungal diseases: Apply copper-based or mancozeb fungicide")
        response_parts.append("• For bacterial diseases: Apply copper-based bactericide")
        response_parts.append("• Always follow dosage instructions on the product label")
        response_parts.append("• Consult your local agricultural extension officer for specific guidance")
    
    if any(word in question_lower for word in ["water", "irrigation", "irrigate"]):
        response_parts.append("\n**General irrigation guidance:**")
        response_parts.append("• Water in early morning or late evening to reduce evaporation")
        response_parts.append("• Use drip irrigation where possible for 30-50% water savings")
        response_parts.append("• Monitor soil moisture rather than following a fixed schedule")
    
    if any(word in question_lower for word in ["organic", "natural", "chemical-free"]):
        response_parts.append("\n**Organic alternatives:**")
        response_parts.append("• Neem oil — effective against many pests and some fungal diseases")
        response_parts.append("• Trichoderma — biological fungal disease control")
        response_parts.append("• Companion planting — marigolds repel many pests")
        response_parts.append("• Crop rotation — breaks disease and pest cycles")
    
    if not response_parts[1:]:  # No specific guidance matched
        response_parts.append("Your question has been noted. For specific advice, please:")
        response_parts.append("• Upload a leaf image for AI disease detection")
        response_parts.append("• Contact your local Krishi Vigyan Kendra (KVK)")
        response_parts.append("• Call the Kisan Helpline: 1800-180-1551")
    
    return "\n".join(response_parts)


async def _call_gemini(question: str, context: dict, language: str) -> str:
    """Call Gemini API with structured context."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None  # Trigger fallback
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        context_str = _format_context(context)
        lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["english"])
        
        prompt = SYSTEM_PROMPT.format(
            language_instruction=lang_instruction,
            context=context_str,
        )
        
        response = model.generate_content(
            [{"role": "user", "parts": [prompt + f"\n\nFarmer's question: {question}"]}],
            generation_config=genai.GenerationConfig(
                max_output_tokens=800,
                temperature=0.3,  # Low temperature for grounded responses
            ),
        )
        
        return response.text
    
    except Exception as e:
        print(f"[WARN] Gemini API call failed: {e}")
        return None


@router.post("/assistant")
async def chat_with_assistant(req: AssistantRequest):
    """
    Ask the AI farming assistant a question.
    
    The assistant receives structured context from the AgriSmart AI system
    (disease detection, weather, irrigation, sustainability) and provides
    grounded, context-aware responses.
    
    Falls back to rule-based guidance if Gemini API is unavailable.
    """
    # Try Gemini first
    gemini_response = await _call_gemini(req.question, req.context or {}, req.language)
    
    if gemini_response:
        return {
            "success": True,
            "response": gemini_response,
            "source": "gemini",
            "language": req.language,
            "grounded": True,
            "context_used": bool(req.context),
        }
    
    # Fallback to rule-based
    fallback = _generate_fallback_response(req.question, req.context or {}, req.language)
    
    return {
        "success": True,
        "response": fallback,
        "source": "rule_based_fallback",
        "language": "english",  # Fallback is always English
        "grounded": True,
        "context_used": bool(req.context),
        "notice": "AI Assistant unavailable — showing rule-based agricultural guidance",
    }
