/**
 * AgriSmart AI — Vernacular Voice-First Speech Utilities
 * Browser-native Text-To-Speech (TTS) and Speech-To-Text (STT) for
 * English, Hindi (हिन्दी), and Gujarati (ગુજરાતી).
 * Zero external paid APIs, 100% lightweight client-side execution.
 */

export type VernacularLanguage = "english" | "hindi" | "gujarati";

export const LANGUAGE_LOCALES: Record<VernacularLanguage, { code: string; label: string; nativeLabel: string }> = {
  english: { code: "en-IN", label: "English", nativeLabel: "English" },
  hindi: { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  gujarati: { code: "gu-IN", label: "Gujarati", nativeLabel: "ગુજરાતી" },
};

/**
 * Strips markdown, headings, bullet characters, URLs, and code blocks
 * to produce clean, natural conversational text suitable for speech synthesis.
 */
export function sanitizeForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove markdown images and links: [text](url) -> text
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, " ");

  // Remove markdown headers: ### Header -> Header.
  cleaned = cleaned.replace(/^#{1,6}\s*(.+)$/gm, "$1. ");

  // Remove bold / italic markers: **bold**, *italic*, __bold__, _italic_
  cleaned = cleaned.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  // Replace bullet points and list markers with pauses
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, ". ");
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, ". ");

  // Remove blockquotes and alerts
  cleaned = cleaned.replace(/^\s*>\s*\[!.*\]/gm, " ");
  cleaned = cleaned.replace(/^\s*>\s*/gm, " ");

  // Replace symbols like & with "and" or localized punctuation
  cleaned = cleaned.replace(/&/g, " and ");
  cleaned = cleaned.replace(/[—–]/g, ", ");
  cleaned = cleaned.replace(/[\/\\|]/g, ", ");

  // Collapse multiple periods or whitespace
  cleaned = cleaned.replace(/\s*\.\s*\./g, ".");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/**
 * Checks if browser supports SpeechSynthesis (TTS)
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Checks if browser supports SpeechRecognition (STT)
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

/**
 * Stops any active speech synthesis output immediately.
 */
export function stopSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speaks text in the specified language (English, Hindi, or Gujarati)
 * with automatic voice matching and fallback.
 */
export function speakText(
  text: string,
  language: VernacularLanguage = "english",
  onEnd?: () => void,
  onError?: (err: any) => void
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) {
    if (onError) onError(new Error("Speech synthesis not supported in this browser"));
    return null;
  }

  // Cancel existing audio before playing new speech
  window.speechSynthesis.cancel();

  const sanitized = sanitizeForSpeech(text);
  if (!sanitized) {
    if (onEnd) onEnd();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(sanitized);
  const localeInfo = LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.english;
  utterance.lang = localeInfo.code;
  utterance.rate = language === "english" ? 0.95 : 0.90; // Slightly slower for non-English clarity
  utterance.pitch = 1.0;

  // Attempt to select best matching voice installed on user's system
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const matchingVoice = voices.find(
      (v) => v.lang.toLowerCase() === localeInfo.code.toLowerCase() ||
             v.lang.toLowerCase().startsWith(localeInfo.code.slice(0, 2).toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    if (onError) onError(e);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Formats diagnosis advisory into localized text for speech output.
 * For OOD images, strictly issues a safety refuse-to-guess advisory with NO false disease speech.
 */
export function generateAdvisorySpeechText(
  result: any,
  language: VernacularLanguage = "english"
): string {
  if (!result) return "";

  // 1. OPEN-SET / OOD SAFETY SPEECH (Directive 6)
  if (result.is_supported_crop === false || result.out_of_distribution === true) {
    if (language === "hindi") {
      return "यह पौधा एग्रीस्मार्ट एआई द्वारा समर्थित फसलों में नहीं है। गलत सलाह और अनुपयुक्त रासायनिक छिड़काव से बचने के लिए सिस्टम ने रोग निदान देने से मना किया है। कृपया 9 समर्थित फसलों में से किसी एक की पत्ती का फोटो अपलोड करें।";
    }
    if (language === "gujarati") {
      return "આ છોડ એગ્રીસ્માર્ટ એઆઈ દ્વારા સમર્થિત પાકોમાં નથી. ખોટી સલાહ અને બિનજરૂરી દવાની છંટકાવથી બચવા માટે સિસ્ટમે રોગનું નિદાન આપવાનું ટાળ્યું છે. કૃપા કરીને સમર્થિત 9 પાકોમાંથી પાનનો ફોટો અપલોડ કરો.";
    }
    return "This plant is outside the crops supported by AgriSmart AI. The system has avoided giving a disease diagnosis to prevent inappropriate chemical application. Please upload a clear photo from one of our 9 supported crop families.";
  }

  // 2. SUPPORTED CROP DISEASE ADVISORY
  const pred = result.prediction || {};
  const crop = pred.crop || "Crop";
  const disease = pred.disease || "Condition";
  const severity = pred.severity || "Moderate";
  const confidence = pred.confidence ? Math.round(pred.confidence * 100) : 95;
  const guidanceItems = Array.isArray(pred.guidance) ? pred.guidance.slice(0, 3) : [];
  const guidanceText = guidanceItems.join(". ");

  if (language === "hindi") {
    return `फसल: ${crop}. रोग निदान: ${disease}. गंभीरता स्तर: ${severity}. एआई विश्वास: ${confidence} प्रतिशत. मुख्य उपचार सुझाव: ${guidanceText}`;
  }

  if (language === "gujarati") {
    return `પાક: ${crop}. રોગનું નિદાન: ${disease}. રોગની તીવ્રતા: ${severity}. એઆઈ ચોકસાઈ: ${confidence} ટકા. મુખ્ય ભલામણ કરેલ પગલાં: ${guidanceText}`;
  }

  return `Crop: ${crop}. Disease Diagnosis: ${disease}. Severity: ${severity}. AI Confidence: ${confidence} percent. Key recommended actions: ${guidanceText}`;
}

/**
 * Initializes speech recognition instance for microphone voice input.
 * Falls back gracefully if browser speech recognition is not supported.
 */
export function createSpeechRecognizer(
  language: VernacularLanguage = "english",
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
): any {
  if (!isSpeechRecognitionSupported()) {
    onError("Speech recognition is not supported in this browser. Please type your question.");
    return null;
  }

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognizer = new SpeechRecognitionClass();
  const localeInfo = LANGUAGE_LOCALES[language] || LANGUAGE_LOCALES.english;

  recognizer.lang = localeInfo.code;
  recognizer.continuous = false;
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;

  recognizer.onresult = (event: any) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    }
  };

  recognizer.onerror = (event: any) => {
    let msg = "Speech recognition error";
    if (event.error === "not-allowed") msg = "Microphone access was denied. Please allow microphone permission.";
    else if (event.error === "no-speech") msg = "No speech detected. Please try speaking again.";
    else if (event.error) msg = `Voice recognition error: ${event.error}`;
    onError(msg);
  };

  recognizer.onend = () => {
    onEnd();
  };

  return recognizer;
}
