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


def normalize_language(lang: Optional[str]) -> str:
    """Normalize language code or name to standard identifier."""
    if not lang:
        return "english"
    l = str(lang).lower().strip()
    if l in ["hi", "hindi", "hin", "हिन्दी", "हिंदी"]:
        return "hindi"
    if l in ["gu", "gujarati", "guj", "ગુજરાતી"]:
        return "gujarati"
    return "english"


def _format_context(context: dict) -> str:
    """Format structured context into a readable string for the LLM."""
    if not context:
        return "No specific context available — provide general agricultural guidance."
    
    parts = []
    
    if context.get("is_supported_crop") is False:
        parts.append("Status: Unsupported Crop Foliage Detected (Open-Set / OOD Rejection Active - Refused to Guess).")
    elif "detected_disease" in context:
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
    Provides genuine localized responses in English, Hindi, and Gujarati.
    """
    lang = normalize_language(language)
    question_lower = question.lower()
    
    is_ood = bool(context and context.get("is_supported_crop") is False)
    
    if lang == "hindi":
        parts = ["**[ऑफ़लाइन मार्गदर्शन मोड — एआई सहायक अस्थायी रूप से अनुपलब्ध है]**\n"]
        if context:
            if is_ood:
                parts.append("⚠️ **असमर्थित फसल:** यह पत्ता हमारे 9 समर्थित फसलों (सेब, चेरी, मक्का, अंगूर, आड़ू, शिमला मिर्च, आलू, स्ट्रॉबेरी, टमाटर) में से नहीं है। गलत दवा के छिड़काव से बचाने के लिए एग्रीस्मार्ट एआई ने रोग निदान देने से मना किया है।\n")
            elif context.get("detected_disease"):
                disease = context.get("detected_disease", "अज्ञात रोग")
                crop = context.get("crop", "फसल")
                conf = context.get("confidence", 0)
                parts.append(f"आपके हालिया स्कैन के अनुसार, आपके **{crop}** में **{disease}** की पहचान हुई है ({conf*100:.0f}% निश्चितता)।\n")
                if context.get("guidance"):
                    parts.append("**अनुशंसित उपचार और कदम:**")
                    for g in context["guidance"][:3]:
                        parts.append(f"• {g}")
            if context.get("weather"):
                w = context["weather"]
                parts.append(f"\n**मौसम स्थिति:** तापमान {w.get('temperature', 'N/A')}°C, नमी {w.get('humidity', 'N/A')}%")
        
        if is_ood:
            parts.append("\n**सुरक्षा चेतावनी:** क्योंकि यह पौधा हमारे समर्थित फसलों में शामिल नहीं है, इसलिए गलत निदान के आधार पर किसी रासायनिक कवकनाशी या कीटनाशक के छिड़काव की सिफारिश नहीं की जाती है। कृपया नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।")
        elif any(word in question_lower for word in ["उपचार", "दवा", "इलाज", "treatment", "cure", "spray", "dawa"]):
            parts.append("\n**सामान्य कृषि उपचार सुझाव:**")
            parts.append("• फफूंद (Fungal) रोगों के लिए: कॉपर ऑक्सीक्लोराइड या मैंकोजेब कवकनाशी का प्रयोग करें।")
            parts.append("• जीवाणु (Bacterial) रोगों के लिए: कॉपर-आधारित स्ट्रेप्टोसाइक्लिन का उपयोग करें।")
            parts.append("• दवा के पैकेट पर लिखे सुरक्षित अनुपात का पालन करें।")
        elif any(word in question_lower for word in ["पानी", "सिंचाई", "water", "irrigation"]):
            parts.append("\n**सिंचाई सुझाव:**")
            parts.append("• वाष्पीकरण रोकने के लिए सुबह या शाम को पानी दें।")
            parts.append("• 30-50% पानी की बचत के लिए टपक (ड्रिप) सिंचाई अपनाएं।")
        else:
            parts.append("\n**कृषि सहायता:**")
            parts.append("• सटीक रोग पहचान हेतु स्वस्थ एवं रोगग्रस्त पत्तों का साफ फोटो अपलोड करें।")
            parts.append("• किसान हेल्पलाइन नंबर: 1800-180-1551 (निःशुल्क)।")
        return "\n".join(parts)

    elif lang == "gujarati":
        parts = ["**[ઓફલાઇન માર્ગદર્શન મોડ — AI સહાયક અસ્થાયી રૂપે અનુપલબ્ધ છે]**\n"]
        if context:
            if is_ood:
                parts.append("⚠️ **બિન-સમર્થિત પાક:** આ પાન અમારા 9 સમર્થિત પાકોમાંનું નથી. ખોટા રાસાયણિક છંટકાવથી પાકને બચાવવા માટે એગ્રીસ્માર્ટ એઆઈએ રોગનું નિદાન આપવાનો ઇનકાર કર્યો છે.\n")
            elif context.get("detected_disease"):
                disease = context.get("detected_disease", "અજ્ઞાત રોગ")
                crop = context.get("crop", "પાક")
                conf = context.get("confidence", 0)
                parts.append(f"તમારા તાજેતરના સ્કેન મુજબ, તમારા **{crop}** પાકમાં **{disease}** રોગ જણાયેલ છે ({conf*100:.0f}% ચોકસાઈ).\n")
                if context.get("guidance"):
                    parts.append("**ભલામણ કરેલ પગલાં:**")
                    for g in context["guidance"][:3]:
                        parts.append(f"• {g}")
            if context.get("weather"):
                w = context["weather"]
                parts.append(f"\n**હાલનું હવામાન:** તાપમાન {w.get('temperature', 'N/A')}°C, ભેજ {w.get('humidity', 'N/A')}%")
        
        if is_ood:
            parts.append("\n**સુરક્ષા ચેતવણી:** આ છોડ અમારા સમર્થિત 9 પાકોમાં સામેલ ન હોવાથી, કોઈપણ રાસાયણિક દવા કે ફૂગનાશકની ભલામણ કરવામાં આવતી નથી. કૃપા કરીને સ્થાનિક કૃષિ વિજ્ઞાન કેન્દ્ર (KVK) અથવા નિષ્ણાતનો સંપર્ક કરો.")
        elif any(word in question_lower for word in ["દવા", "ઉપચાર", "છાંટવું", "treatment", "cure", "spray", "dava"]):
            parts.append("\n**સામાન્ય પાક સંરક્ષણ માર્ગદર્શન:**")
            parts.append("• ફૂગજન્ય રોગો માટે: કોપર ઓક્સીક્લોરાઇડ અથવા મેન્કોઝેબ ફૂગનાશકનો છંટકાવ કરો.")
            parts.append("• બેક્ટેરિયલ રોગો માટે: કોપર-આધારિત દવાઓનો ઉપયોગ કરો.")
            parts.append("• હંમેશા પેકિંગ પર દર્શાવેલ યોગ્ય માત્રામાં જ દવાનો ઉપયોગ કરવો.")
        elif any(word in question_lower for word in ["પાણી", "પિયત", "સિંચાઈ", "water", "irrigation"]):
            parts.append("\n**પિયત વ્યવસ્થાપન માર્ગદર્શન:**")
            parts.append("• બાષ્પીભવન ઘટાડવા માટે વહેલી સવારે અથવા મોડી સાંજે પિયત આપો.")
            parts.append("• પાણીની બચત માટે ટપક પદ્ધતિ (Drip) અપનાવો.")
        else:
            parts.append("\n**ખેડૂત સહાય:**")
            parts.append("• ચોક્કસ રોગ ઓળખ માટે છોડના પાનનો સ્પષ્ટ ફોટો અપલોડ કરો.")
            parts.append("• કિસાન હેલ્પલાઇન નંબર: 1800-180-1551.")
        return "\n".join(parts)

    else:
        # English fallback
        parts = ["**[Offline Guidance Mode — AI Assistant temporarily unavailable]**\n"]
        if context:
            if is_ood:
                parts.append("⚠️ **Unsupported Crop Foliage:** This image does not match any of our 9 supported crop families. AgriSmart AI refused to guess a disease to prevent inappropriate chemical application.\n")
            elif context.get("detected_disease"):
                disease = context.get("detected_disease", "Unknown")
                crop = context.get("crop", "Unknown")
                confidence = context.get("confidence", 0)
                parts.append(f"Based on your recent scan, **{disease}** was detected on your **{crop}** crop with {confidence*100:.0f}% confidence.\n")
                if context.get("guidance"):
                    parts.append("**Recommended actions:**")
                    for g in context["guidance"][:4]:
                        parts.append(f"• {g}")
                if context.get("severity"):
                    parts.append(f"\n**Severity:** {context['severity']}")
            if context.get("weather"):
                w = context["weather"]
                parts.append(f"\n**Current weather:** {w.get('temperature', 'N/A')}°C, {w.get('humidity', 'N/A')}% humidity")
            if context.get("irrigation_recommendation"):
                parts.append(f"\n**Irrigation:** {context['irrigation_recommendation']}")
        
        if is_ood:
            parts.append("\n**Safety Warning:** Because this plant is outside supported crop families, AgriSmart AI cannot recommend chemical fungicides or disease treatments. Please consult your local Krishi Vigyan Kendra (KVK).")
        elif any(word in question_lower for word in ["treatment", "treat", "cure", "medicine", "spray"]):
            parts.append("\n**General treatment guidance:**")
            parts.append("• For fungal diseases: Apply copper-based or mancozeb fungicide")
            parts.append("• For bacterial diseases: Apply copper-based bactericide")
            parts.append("• Always follow dosage instructions on the product label")
            parts.append("• Consult your local agricultural extension officer for specific guidance")
        elif any(word in question_lower for word in ["water", "irrigation", "irrigate"]):
            parts.append("\n**General irrigation guidance:**")
            parts.append("• Water in early morning or late evening to reduce evaporation")
            parts.append("• Use drip irrigation where possible for 30-50% water savings")
            parts.append("• Monitor soil moisture rather than following a fixed schedule")
        elif any(word in question_lower for word in ["organic", "natural", "chemical-free"]):
            parts.append("\n**Organic alternatives:**")
            parts.append("• Neem oil — effective against many pests and some fungal diseases")
            parts.append("• Trichoderma — biological fungal disease control")
            parts.append("• Companion planting — marigolds repel many pests")
            parts.append("• Crop rotation — breaks disease and pest cycles")
        else:
            parts.append("Your question has been noted. For specific advice, please:")
            parts.append("• Upload a leaf image for AI disease detection")
            parts.append("• Contact your local Krishi Vigyan Kendra (KVK)")
            parts.append("• Call the Kisan Helpline: 1800-180-1551")
        
        return "\n".join(parts)


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
    norm_lang = normalize_language(req.language)
    # Try Gemini first
    gemini_response = await _call_gemini(req.question, req.context or {}, norm_lang)
    
    if gemini_response:
        return {
            "success": True,
            "response": gemini_response,
            "source": "gemini",
            "language": norm_lang,
            "grounded": True,
            "context_used": bool(req.context),
        }
    
    # Fallback to rule-based
    fallback = _generate_fallback_response(req.question, req.context or {}, norm_lang)
    
    return {
        "success": True,
        "response": fallback,
        "source": "rule_based_fallback",
        "language": norm_lang,
        "grounded": True,
        "context_used": bool(req.context),
        "notice": "AI Assistant offline mode — showing verified agricultural guidance",
    }
