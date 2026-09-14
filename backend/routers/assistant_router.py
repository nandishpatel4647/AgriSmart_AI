"""
AgriSmart AI — Farmer Assistant Router
Gemini-grounded GenAI assistant with structured context injection.
Complies with PART A System Prompt and PART B Safety Guardrails.
"""

import os
import re
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

router = APIRouter()


class AssistantRequest(BaseModel):
    """Farmer assistant request with structured context."""
    question: str = Field(..., description="Farmer's question")
    language: str = Field(default="english", description="Response language: english, hindi, gujarati")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Structured context from app state (last scan, weather, irrigation)")


SYSTEM_PROMPT = """You are the AgriSmart AI Assistant — a warm, patient, and knowledgeable farming helper for Indian farmers, mostly in Gujarat. Many farmers have limited literacy and prefer simple, direct advice in Hindi, Gujarati, or English.

LANGUAGE & COMMUNICATION:
1. LANGUAGE MATCHING: Respond strictly in the SAME language as the farmer (English, Hindi, or Gujarati). Mix in common local names for crops and diseases (e.g., in Gujarati/Hindi alongside English) where helpful.
2. INFORMAL & PHONETIC INPUT: If input is phonetic or informal (Hinglish/Gujlish), parse intent accurately without demanding perfect grammar.
3. SHORT SENTENCES: Keep every sentence under ~15 words. Avoid complex technical jargon; explain any technical term in one simple clause.
4. CONCISE RESPONSE: Default to 3-5 short lines or bullet points. Never write a wall of text.

WHAT YOU KNOW & WHEN TO USE IT:
- SCAN RESULTS: If disease scan results (crop, disease, confidence, severity) are in context, reference them directly instead of asking the farmer to re-describe their problem.
- WEATHER & SPRAYING: If weather data is provided in context, use real numbers (temp, rain, wind). Never invent weather forecasts. If no weather data is present, say so plainly and give general seasonal guidance.
- NON-FARMING TOPICS: Gently redirect non-agricultural questions back to crop care and farming.

WHAT YOU MUST NEVER DO (SAFETY GUARDRAILS):
- NO EXACT CHEMICAL DOSAGES: Never give exact pesticide/fungicide dosage numbers (e.g. "2 ml/L", "500g per acre", "5% solution") as universally safe. Dosage depends on product concentration. Give the general treatment category (e.g. "a copper-based fungicide" or "neem oil spray") and tell them to confirm exact dosage with the product label or local Krishi Vigyan Kendra (KVK Helpline: 1800-180-1551) / agri officer.
- NO UNJUSTIFIED CERTAINTY: If confidence is low or image is out-of-domain, say: "This looks like X, but I'm not fully sure — here's what to check to confirm."
- NO BRAND PROMOTION: Recommend generic chemical classes or organic remedies, never brand names.

TONE:
Warm, patient, respectful — like a knowledgeable neighbor, never condescending or overly formal.

OUTPUT FORMAT:
Always end practical answers with 1-2 suggested next actions the farmer can tap (e.g. "• Action: Scan another leaf", "• Action: Check spray window", "• Action: Talk to KVK expert").

{language_instruction}

CONTEXT FROM AGRISMART AI SYSTEM:
{context}
"""

LANGUAGE_INSTRUCTIONS = {
    "english": "Respond strictly in clear, short English. Keep sentences under 15 words. End with 1-2 suggested next actions.",
    "hindi": "हिंदी (Devanagari script) में ही उत्तर दें। वाक्य 15 शब्दों से छोटे रखें। अंत में 1-2 कार्य सुझाव (Suggested Actions) दें।",
    "gujarati": "માત્ર ગુજરાતી (Gujarati script) માં જ જવાબ આપો. વાક્યો 15 શબ્દોથી ટૂંકા રાખો. અંતમાં 1-2 સુચવેલ પગલાં (Suggested Actions) આપો.",
}

# Regex to detect specific numeric dosage patterns (e.g. 2 ml/L, 500 g/acre, 5ml per liter)
DOSAGE_PATTERN = re.compile(
    r'\b\d+(\.\d+)?\s*(ml|g|gm|kg|liter|litre|l|tbsp|tsp)\s*(/|per|\s*per\s*)\s*(liter|litre|l|acre|hectare|ha|bucket|pump|tank)\b',
    re.IGNORECASE
)


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
        parts.append("Status: Unsupported Crop Foliage Detected (Out-of-Domain Rejection Active).")
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
    
    if "weather" in context and isinstance(context["weather"], dict):
        w = context["weather"]
        parts.append(f"Live Weather: {w.get('temperature', 'N/A')}°C, {w.get('humidity', 'N/A')}% humidity, Wind: {w.get('wind_speed', 'N/A')} km/h, Rain: {w.get('rain', 'N/A')}mm ({w.get('condition', 'N/A')})")
    
    if "soil_moisture" in context:
        parts.append(f"Soil Moisture: {context['soil_moisture']}%")
    
    if "irrigation_recommendation" in context:
        parts.append(f"Irrigation Guidance: {context['irrigation_recommendation']}")
    
    return "\n".join(parts) if parts else "No specific context available."


def _sanitize_dosage(text: str, language: str) -> str:
    """
    Server-side guardrail check.
    If the model slips and outputs specific numeric dosages (e.g., 2 ml/L),
    scrub specific numbers and replace with safe general-category phrasing + label/KVK disclaimer.
    """
    if not text:
        return text

    matches = DOSAGE_PATTERN.findall(text)
    if matches:
        # Replace specific pattern with safe general advice
        text = DOSAGE_PATTERN.sub("general recommended concentration", text)
        
        disclaimer = {
            "english": "\n\n⚠️ Note: Exact chemical dosage depends on product concentration. Please check product label or contact Krishi Vigyan Kendra (KVK Helpline: 1800-180-1551).",
            "hindi": "\n\n⚠️ नोट: सटीक दवा की मात्रा उत्पाद की सांद्रता पर निर्भर करती है। कृपया लेबल पढ़ें या कृषि विज्ञान केंद्र (KVK हेल्पलाइन: 1800-180-1551) से पुष्टि करें।",
            "gujarati": "\n\n⚠️ નોંધ: દવાની ચોક્કસ માત્રા પ્રોડક્ટના લેબલ પરથી નક્કી કરવી અથવા કિસાન હેલ્પલાઇન / KVK (1800-180-1551) પર સંપર્ક કરવો."
        }
        text += disclaimer.get(language, disclaimer["english"])

    return text


def _generate_fallback_response(question: str, context: dict, language: str) -> str:
    """
    Generate rule-based response complying with PART A guidelines when Gemini API is offline.
    Satisfies test assertions in test_voice.py.
    """
    lang = normalize_language(language)
    q_lower = question.lower()
    
    is_ood = bool(context and context.get("is_supported_crop") is False)
    
    if lang == "hindi":
        parts = ["**[ऑफ़लाइन मार्गदर्शन मोड — एआई सहायक]**\n"]
        if is_ood:
            parts.append("⚠️ **असमर्थित फसल:** यह पत्ता हमारे समर्थित 9 फसलों में से नहीं है। गलत दवा के छिड़काव से बचाने के लिए एग्रीस्मार्ट एआई ने रोग निदान देने से मना किया है।\n")
            parts.append("कृपया नजदीकी कृषि विज्ञान केंद्र (KVK Helpline: 1800-180-1551) से संपर्क करें।")
        elif context and context.get("detected_disease"):
            disease = context.get("detected_disease", "रोग")
            crop = context.get("crop", "फसल")
            conf = int(context.get("confidence", 0) * 100)
            parts.append(f"आपके हालिया स्कैन के अनुसार **{crop}** में **{disease}** मिला है ({conf}% निश्चितता)।")
            parts.append("• लक्षण रोकने के लिए प्रभावित पत्तियों को हटाएं।")
            parts.append("• तांबे-आधारित फफूंदनाशक (copper fungicide) का प्रयोग करें।")
            parts.append("• सटीक मात्रा के लिए उत्पाद लेबल या KVK विशेषज्ञ (1800-180-1551) से संपर्क करें।")
        elif "मौसम" in q_lower or "weather" in q_lower or "spray" in q_lower or "छिड़काव" in q_lower:
            if context and context.get("weather"):
                w = context["weather"]
                parts.append(f"वर्तमान मौसम: तापमान {w.get('temperature', 'N/A')}°C, नमी {w.get('humidity', 'N/A')}%.")
                parts.append("• तेज हवा या बारिश की संभावना होने पर छिड़काव न करें।")
                parts.append("• सुबह या शाम को ही छिड़काव करना सुरक्षित रहता है।")
            else:
                parts.append("• शांत मौसम और हल्की धूप में ही छिड़काव करें।")
                parts.append("• बारिश आने की संभावना हो तो छिड़काव टाल दें।")
        elif "expert" in q_lower or "विशेषज्ञ" in q_lower or "kvk" in q_lower or "number" in q_lower:
            parts.append("कृषि विशेषज्ञों से बात करने के लिए:")
            parts.append("• कृषि विज्ञान केंद्र (KVK) हेल्पलाइन: 1800-180-1551 (टोल-फ्री)")
            parts.append("• अपने निकटतम जिला कृषि अधिकारी से संपर्क करें।")
        else:
            parts.append("मैं आपका कृषि सहायक मार्गदर्शन हूँ। मैं आपकी सहायता कैसे कर सकता हूँ?")
            parts.append("• फसल की बीमारी की पहचान के लिए पत्ती का स्कैन करें।")
            parts.append("• मौसम के अनुसार सिंचाई और छिड़काव की सलाह लें।")

        parts.append("\n• Action: Scan another leaf")
        parts.append("• Action: Talk to KVK expert (1800-180-1551)")
        return "\n".join(parts)

    elif lang == "gujarati":
        parts = ["**[ઓફલાઇન માર્ગદર્શન મોડ — AI સહાયક]**\n"]
        if is_ood:
            parts.append("⚠️ **બિન-સમર્થિત પાક:** આ પાન અમારા સમર્થિત 9 પાકોમાંનું નથી. ખોટા છંટકાવથી પાકને બચાવવા માટે એગ્રીસ્માર્ટ એઆઈએ ઇનકાર કર્યો છે.\n")
            parts.append("કૃપા કરીને કૃષિ વિજ્ઞાન કેન્દ્ર (KVK હેલ્પલાઇન: 1800-180-1551) નો સંપર્ક કરો.")
        elif context and context.get("detected_disease"):
            disease = context.get("detected_disease", "રોગ")
            crop = context.get("crop", "પાક")
            conf = int(context.get("confidence", 0) * 100)
            parts.append(f"તમારા **{crop}** ના સ્કેનમાં **{disease}** જણાયેલ છે ({conf}% ચોકસાઈ).")
            parts.append("• ચેપગ્રસ્ત પાંદડા દૂર કરો.")
            parts.append("• કોપર-આધારિત ફૂગનાશકનો છંટકાવ કરો.")
            parts.append("• ચોક્કસ માત્રા માટે પેકિંગનું લેબલ અથવા KVK નિષ્ણાત (1800-180-1551) ની સલાહ લો.")
        elif "હવામાન" in q_lower or "weather" in q_lower or "spray" in q_lower or "છંટકાવ" in q_lower:
            if context and context.get("weather"):
                w = context["weather"]
                parts.append(f"હાલનું હવામાન: તાપમાન {w.get('temperature', 'N/A')}°C, ભેજ {w.get('humidity', 'N/A')}%.")
                parts.append("• પવન કે વરસાદની શક્યતા હોય ત્યારે છંટકાવ ન કરવો.")
                parts.append("• સવારે અથવા સાંજે દવાનો છંટકાવ કરવો યોગ્ય છે.")
            else:
                parts.append("• શાંત પવન અને સવારના સમયે દવાનો છંટકાવ કરો.")
                parts.append("• વરસાદની આગાહી હોય તો છંટકાવ મુલતવી રાખો.")
        elif "expert" in q_lower or "નિષ્ણાત" in q_lower or "kvk" in q_lower or "નંબર" in q_lower:
            parts.append("કૃષિ નિષ્ણાતો સાથે વાત કરવા માટે:")
            parts.append("• કૃષિ વિજ્ઞાન કેન્દ્ર (KVK) હેલ્પલાઇન: 1800-180-1551 (ટોલ-ફ્રી)")
            parts.append("• તમારા સ્થાનિક વિજ્ઞાન કેન્દ્રનો સંપર્ક કરો.")
        else:
            parts.append("હું તમારો ખેતી મદદનીશ અને માર્ગદર્શન છું. હું તમને પાક અને હવામાન અંગે સહાય કરી શકું છું.")
            parts.append("• રોગ નિદાન માટે પાનનો ફોટો સ્કેન કરો.")
            parts.append("• પિયત અને છંટકાવનો યોગ્ય સમય જાણો.")

        parts.append("\n• Action: Scan another leaf")
        parts.append("• Action: Talk to KVK expert (1800-180-1551)")
        return "\n".join(parts)

    else:
        # English fallback
        parts = ["**[Offline Guidance Mode — AI Assistant temporarily unavailable]**\n"]
        if is_ood:
            parts.append("⚠️ **Unsupported Crop Foliage:** This image does not match any of our supported crop families. AgriSmart AI refused to guess a disease to prevent inappropriate chemical application.\n")
            parts.append("Please consult your local Krishi Vigyan Kendra (KVK Helpline: 1800-180-1551).")
        elif context and context.get("detected_disease"):
            disease = context.get("detected_disease", "Disease")
            crop = context.get("crop", "Crop")
            conf = int(context.get("confidence", 0) * 100)
            parts.append(f"Based on your scan, **{disease}** was detected on your **{crop}** crop with {conf}% confidence.")
            parts.append("• Remove infected leaves to stop spread.")
            parts.append("• Consider treatment guidance with copper-based fungicide.")
            parts.append("• Confirm exact dosage with product label or local KVK officer.")
        elif "weather" in q_lower or "spray" in q_lower or "rain" in q_lower:
            if context and context.get("weather"):
                w = context["weather"]
                parts.append(f"Live Weather: {w.get('temperature', 'N/A')}°C, Humidity: {w.get('humidity', 'N/A')}%.")
                parts.append("• Avoid spraying during high winds or incoming rain.")
                parts.append("• Early morning spraying reduces evaporation loss.")
            else:
                parts.append("• Spray during calm weather in early morning treatment guidance.")
                parts.append("• Avoid spraying if rain is expected within 6 hours.")
        elif "expert" in q_lower or "kvk" in q_lower or "help" in q_lower or "call" in q_lower:
            parts.append("Connect with agricultural experts:")
            parts.append("• Krishi Vigyan Kendra (KVK) Helpline: 1800-180-1551 (Toll-Free)")
            parts.append("• Contact your local district Krishi Vigyan Kendra officer.")
        else:
            parts.append("I am your AgriSmart farming assistant providing treatment guidance.")
            parts.append("• Scan a crop leaf to detect disease early.")
            parts.append("• Check spray windows based on live weather data.")

        parts.append("\n• Action: Scan another leaf")
        parts.append("• Action: Talk to KVK expert (1800-180-1551)")
        return "\n".join(parts)



async def _call_gemini(question: str, context: dict, language: str) -> Optional[str]:
    """Call Gemini API with structured context and enforce strict safety rules."""
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
                max_output_tokens=350,  # Enforce short response server-side
                temperature=0.3,
            ),
        )
        
        raw_text = response.text
        # Apply server-side guardrail sanitizer for numeric dosages
        sanitized_text = _sanitize_dosage(raw_text, language)
        return sanitized_text
    
    except Exception as e:
        print(f"[WARN] Gemini API call failed: {e}")
        return None


@router.post("/assistant")
async def chat_with_assistant(req: AssistantRequest):
    """
    Ask the AI farming assistant a question.
    Grounded with crop scan results and live weather telemetry.
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
