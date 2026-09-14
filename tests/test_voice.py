"""
AgriSmart AI — Vernacular Voice & Multilingual Farmer Mode Test Suite
Validates:
1. Speech sanitization logic (Markdown removal, bullet/link cleanup)
2. Language normalization (en/hi/gu variations)
3. Multilingual assistant responses (English, Hindi, Gujarati)
4. Offline fallback responses for Hindi and Gujarati (verifying no silent English fallbacks)
5. Out-of-Distribution safety guarantee (OOD inputs must NOT generate disease treatment advice)
"""

import sys
import re
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from backend.main import app
from backend.routers.assistant_router import (
    normalize_language,
    _generate_fallback_response,
    LANGUAGE_INSTRUCTIONS,
)

client = TestClient(app)


# =====================================================================
# 1. SPEECH SANITIZER LOGIC TESTS
# =====================================================================

def python_speech_sanitizer(text: str) -> str:
    """
    Python reference implementation of frontend sanitizeForSpeech(text).
    Verifies that markdown, URLs, code blocks, and bullet markers
    are stripped to form natural conversational audio sentences.
    """
    if not text:
        return ""
    cleaned = text
    # Remove code blocks and inline code
    cleaned = re.sub(r"```[\s\S]*?```", " ", cleaned)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    # Remove markdown images and links
    cleaned = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", cleaned)
    # Remove URLs
    cleaned = re.sub(r"https?://\S+", " ", cleaned)
    # Remove headers
    cleaned = re.sub(r"^#{1,6}\s*(.+)$", r"\1. ", cleaned, flags=re.MULTILINE)
    # Remove bold / italic markers
    cleaned = re.sub(r"[*_]{1,3}([^*_]+)[*_]{1,3}", r"\1", cleaned)
    # Replace bullet points and list markers with pauses
    cleaned = re.sub(r"^\s*[-*•]\s+", ". ", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*\d+\.\s+", ". ", cleaned, flags=re.MULTILINE)
    # Clean whitespace and periods
    cleaned = re.sub(r"\s*\.\s*\.", ".", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def test_speech_sanitizer_removes_markdown_and_formatting():
    raw_markdown = """
    **Treatment Plan**
    - Remove infected leaves immediately
    - Apply copper-based fungicide: https://example.com/guide
    - *Improve airflow* around base

    ```python
    print("Do not speak code blocks")
    ```
    """
    sanitized = python_speech_sanitizer(raw_markdown)
    assert "**" not in sanitized, "Sanitizer must remove bold asterisks"
    assert "*" not in sanitized, "Sanitizer must remove italic asterisks"
    assert "https://" not in sanitized, "Sanitizer must remove URLs"
    assert "print" not in sanitized, "Sanitizer must remove code blocks"
    assert "Treatment Plan" in sanitized
    assert "Remove infected leaves immediately" in sanitized
    assert "Apply copper-based fungicide" in sanitized


# =====================================================================
# 2. LANGUAGE NORMALIZATION TESTS
# =====================================================================

@pytest.mark.parametrize("input_lang, expected", [
    ("en", "english"),
    ("english", "english"),
    ("English", "english"),
    ("EN", "english"),
    ("hi", "hindi"),
    ("hindi", "hindi"),
    ("Hindi", "hindi"),
    ("hin", "hindi"),
    ("हिन्दी", "hindi"),
    ("हिंदी", "hindi"),
    ("gu", "gujarati"),
    ("gujarati", "gujarati"),
    ("Gujarati", "gujarati"),
    ("guj", "gujarati"),
    ("ગુજરાતી", "gujarati"),
    ("", "english"),
    (None, "english"),
    ("unknown_lang", "english"),
])
def test_language_normalization(input_lang, expected):
    """Verify robust normalization across uppercase, localized script, and codes."""
    assert normalize_language(input_lang) == expected


# =====================================================================
# 3. ASSISTANT MULTILINGUAL ENDPOINT TESTS
# =====================================================================

def test_assistant_english_response():
    """Verify POST /api/assistant responds with normalized English metadata."""
    payload = {
        "question": "How much water do tomatoes need during fruiting?",
        "language": "english",
        "context": {
            "crop": "Tomato",
            "is_supported_crop": True
        }
    }
    response = client.post("/api/assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "english"
    assert len(data["response"]) > 20


def test_assistant_hindi_response():
    """Verify POST /api/assistant accepts Hindi language requests."""
    payload = {
        "question": "टमाटर के पौधे को कितना पानी देना चाहिए?",
        "language": "hindi",
        "context": {
            "crop": "Tomato",
            "is_supported_crop": True
        }
    }
    response = client.post("/api/assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "hindi"
    assert len(data["response"]) > 20


def test_assistant_gujarati_response():
    """Verify POST /api/assistant accepts Gujarati language requests."""
    payload = {
        "question": "ટામેટાના પાકને કેટલું પાણી આપવું જોઈએ?",
        "language": "gujarati",
        "context": {
            "crop": "Tomato",
            "is_supported_crop": True
        }
    }
    response = client.post("/api/assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["language"] == "gujarati"
    assert len(data["response"]) > 20


# =====================================================================
# 4. MULTILINGUAL FALLBACK RESPONSE TESTS (NO SILENT ENGLISH FALLBACK)
# =====================================================================

def test_hindi_fallback_is_genuine_hindi():
    """Hindi fallback must contain Devanagari script and not silently return English."""
    question = "दवा का छिड़काव कब करना चाहिए?"
    context = {"is_supported_crop": True, "crop": "Tomato", "detected_disease": "Early Blight"}
    fallback = _generate_fallback_response(question, context, "hindi")
    
    # Must contain Devanagari Unicode characters (U+0900 to U+097F)
    devanagari_chars = [ch for ch in fallback if '\u0900' <= ch <= '\u097F']
    assert len(devanagari_chars) > 30, "Hindi fallback must contain genuine Hindi Devanagari text"
    assert "मार्गदर्शन" in fallback or "उपचार" in fallback or "सलाह" in fallback


def test_gujarati_fallback_is_genuine_gujarati():
    """Gujarati fallback must contain Gujarati script and not silently return English."""
    question = "દવાનો છંટકાવ ક્યારે કરવો?"
    context = {"is_supported_crop": True, "crop": "Tomato", "detected_disease": "Early Blight"}
    fallback = _generate_fallback_response(question, context, "gujarati")
    
    # Must contain Gujarati Unicode characters (U+0A80 to U+0AFF)
    gujarati_chars = [ch for ch in fallback if '\u0A80' <= ch <= '\u0AFF']
    assert len(gujarati_chars) > 30, "Gujarati fallback must contain genuine Gujarati text"
    assert "માર્ગદર્શન" in fallback or "ઉપચાર" in fallback or "સહાય" in fallback


def test_english_fallback_is_english():
    """English fallback returns clear structured English text."""
    question = "When should I spray fungicide?"
    context = {"is_supported_crop": True, "crop": "Tomato", "detected_disease": "Early Blight"}
    fallback = _generate_fallback_response(question, context, "english")
    assert "Offline Guidance Mode" in fallback
    assert "treatment" in fallback.lower() or "guidance" in fallback.lower()


# =====================================================================
# 5. OOD + VOICE INTEGRATION SAFETY TESTS
# =====================================================================

def test_ood_safety_no_disease_treatment_speech_english():
    """
    CRITICAL: For unsupported crops (is_supported_crop: False),
    the assistant fallback MUST issue a refuse-to-guess safety message
    and MUST NOT output disease treatment guidance.
    """
    context = {
        "is_supported_crop": False,
        "out_of_distribution": True,
        "crop": "Unsupported Crop",
        "error_type": "UNSEEN_SPECIES_DETECTED"
    }
    question = "What fungicide should I use?"
    fallback = _generate_fallback_response(question, context, "english")
    
    # Must reinforce refuse-to-guess
    assert "Unsupported Crop" in fallback or "refused to guess" in fallback
    assert "copper-based" not in fallback, "Must NOT recommend chemical spray for unsupported OOD crop"
    assert "mancozeb" not in fallback, "Must NOT recommend chemical spray for unsupported OOD crop"


def test_ood_safety_no_disease_treatment_speech_hindi():
    """Hindi OOD guidance must refuse to guess and warn against inappropriate spray."""
    context = {
        "is_supported_crop": False,
        "out_of_distribution": True,
        "crop": "Unsupported Crop",
        "error_type": "UNSEEN_SPECIES_DETECTED"
    }
    question = "दवा बताओ"
    fallback = _generate_fallback_response(question, context, "hindi")
    
    assert "असमर्थित फसल" in fallback or "मना किया" in fallback
    assert "कॉपर ऑक्सीक्लोराइड" not in fallback, "Must NOT give chemical treatment for OOD plant in Hindi"


def test_ood_safety_no_disease_treatment_speech_gujarati():
    """Gujarati OOD guidance must refuse to guess and warn against inappropriate spray."""
    context = {
        "is_supported_crop": False,
        "out_of_distribution": True,
        "crop": "Unsupported Crop",
        "error_type": "UNSEEN_SPECIES_DETECTED"
    }
    question = "દવા જણાવો"
    fallback = _generate_fallback_response(question, context, "gujarati")
    
    assert "બિન-સમર્થિત પાક" in fallback or "ઇનકાર" in fallback
    assert "કોપર ઓક્સીક્લોરાઇડ" not in fallback, "Must NOT give chemical treatment for OOD plant in Gujarati"
