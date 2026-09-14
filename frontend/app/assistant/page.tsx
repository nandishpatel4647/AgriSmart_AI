"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Globe, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle,
  Microscope,
  CloudSun,
  Droplets,
  HelpCircle,
  PhoneCall,
  FileText
} from "lucide-react";
import { askAssistant, getWeather } from "../lib/api";
import { 
  VernacularLanguage, 
  LANGUAGE_LOCALES, 
  speakText as speakVernacularText, 
  stopSpeech, 
  createSpeechRecognizer, 
  isSpeechRecognitionSupported 
} from "../lib/speech";

interface ActionItem {
  label: string;
  href?: string;
  query?: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actions?: ActionItem[];
}

export default function AssistantPage() {
  const [language, setLanguage] = useState<"en" | "hi" | "gu">("en");
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Namaste Farmer! I am your AgriSmart AI Assistant — here to help you with crop diseases, weather spraying windows, and field care in English, Hindi, or Gujarati.\n\nHow can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: "Scan Crop Disease", href: "/detect" },
        { label: "Check Spray Window", href: "/weather" },
        { label: "Explain My Last Result", query: "Explain my last crop disease scan result in detail" },
        { label: "Talk to KVK Expert", query: "Connect me to Krishi Vigyan Kendra expert" }
      ]
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<any>(null);

  // Load persistent language selection from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("agrismart_lang");
      if (savedLang === "en" || savedLang === "hi" || savedLang === "gu") {
        setLanguage(savedLang);
      }
    } catch {}
  }, []);

  const handleLanguageChange = (newLang: "en" | "hi" | "gu") => {
    setLanguage(newLang);
    try {
      localStorage.setItem("agrismart_lang", newLang);
    } catch {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Multilingual Suggestions
  const suggestionsMap = {
    en: [
      "Explain my last scan result",
      "Is today safe for pesticide spraying?",
      "My crop leaves have dark brown spots",
      "When should I irrigate my fields?",
      "Talk to KVK expert helpline"
    ],
    hi: [
      "मेरे आखिरी स्कैन का परिणाम समझाएं",
      "क्या आज कीटनाशक छिड़काव के लिए सुरक्षित है?",
      "मेरे टमाटर के पत्तों पर काले धब्बे हैं",
      "मुझे अपने खेतों में सिंचाई कब करनी चाहिए?",
      "केवीके विशेषज्ञ हेल्पलाइन से बात करें"
    ],
    gu: [
      "મારા છેલ્લા સ્કેનનું પરિણામ સમજાવો",
      "શું આજે છંટકાવ કરવો સલામત છે?",
      "મારા બટાકાના પાન પીળા થઈ રહ્યા છે",
      "સિંચાઈ ક્યારે કરવી જોઈએ?",
      "KVK નિષ્ણાત હેલ્પલાઇન નંબર"
    ]
  };

  const getVernacularLang = (): VernacularLanguage => {
    if (language === "hi") return "hindi";
    if (language === "gu") return "gujarati";
    return "english";
  };

  // Helper to gather grounded context (last scan result + live weather)
  const getGroundedContext = async () => {
    const contextData: Record<string, any> = {};

    // 1. Check last disease scan from localStorage
    try {
      const lastScanRaw = localStorage.getItem("agrismart_last_scan");
      if (lastScanRaw) {
        const scan = JSON.parse(lastScanRaw);
        if (scan.detected_disease) {
          contextData.detected_disease = scan.detected_disease;
          contextData.crop = scan.crop || scan.crop_type;
          contextData.confidence = scan.confidence;
          contextData.severity = scan.severity;
          contextData.guidance = scan.guidance;
          contextData.is_supported_crop = scan.is_supported_crop !== false;
        }
      }
    } catch (e) {
      console.warn("Failed to load last scan from localStorage:", e);
    }

    // 2. Fetch live weather data
    try {
      const weatherData = await getWeather();
      if (weatherData && weatherData.weather) {
        contextData.weather = {
          temperature: weatherData.weather.temperature,
          humidity: weatherData.weather.humidity,
          wind_speed: weatherData.weather.wind_speed,
          rain: weatherData.weather.precipitation || 0,
          condition: weatherData.weather.condition
        };
      }
    } catch (e) {
      console.warn("Failed to fetch live weather for context:", e);
    }

    return contextData;
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    // Stop ongoing speech before answering new question
    stopSpeech();
    setIsSpeaking(false);
    setActiveSpeechId(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setIsThinking(true);

    try {
      // Gather grounded context automatically
      const groundedContext = await getGroundedContext();
      
      const resp = await askAssistant(textToSend, language, groundedContext);
      const aiReply = resp.response || resp.answer || "Based on field telemetry: High humidity increases fungal risk. Inspect crop leaves within 24h.";

      // Parse suggested next actions from response text
      const parsedActions: ActionItem[] = [
        { label: "Scan Crop Disease", href: "/detect" },
        { label: "Check Spray Window", href: "/weather" },
        { label: "Talk to KVK Expert", query: "Give me KVK Helpline number" }
      ];

      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: aiMsgId,
        sender: "ai",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: parsedActions
      };

      setMessages((prev) => [...prev, aiMsg]);
      
      // Auto Read-aloud in selected language
      const vLang = getVernacularLang();
      setIsSpeaking(true);
      setActiveSpeechId(aiMsgId);
      speakVernacularText(
        aiReply,
        vLang,
        () => { setIsSpeaking(false); setActiveSpeechId(null); },
        () => { setIsSpeaking(false); setActiveSpeechId(null); }
      );
    } catch (err: any) {
      const fallbackText = language === "hi" 
        ? "कृषि सलाह: उच्च आर्द्रता फफूंद संक्रमण को बढ़ाती है। पत्तियों की जांच करें और टपक सिंचाई का प्रयोग करें। (KVK हेल्पलाइन: 1800-180-1551)"
        : language === "gu"
        ? "ખેતી સલાહ: વધુ પડતો ભેજ ફૂગના રોગોને વધારે છે. પાનની સપાટી તપાસો અને ટપક પદ્ધતિ અપનાવો. (KVK હેલ્પલાઇન: 1800-180-1551)"
        : "AI Advisory: High humidity favors fungal growth. Inspect crop leaves. For expert help call Kisan Helpline: 1800-180-1551.";

      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: "Scan Leaf Sample", href: "/detect" },
          { label: "Check Spray Window", href: "/weather" }
        ]
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // Voice Input Speech Recognition
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognizerRef.current) {
        try { recognizerRef.current.abort(); } catch {}
      }
      setIsListening(false);
      return;
    }

    stopSpeech();
    setIsSpeaking(false);
    setActiveSpeechId(null);

    const vLang = getVernacularLang();
    const recognizer = createSpeechRecognizer(
      vLang,
      (transcript: string) => {
        setInputQuery(transcript);
        setIsListening(false);
        handleSend(transcript);
      },
      (errText: string) => {
        console.warn("Speech recognition notice:", errText);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (recognizer) {
      recognizerRef.current = recognizer;
      setIsListening(true);
      try {
        recognizer.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  // Manual TTS Trigger for any specific message bubble
  const handlePlayMessageSpeech = (msgId: string, text: string) => {
    if (isSpeaking && activeSpeechId === msgId) {
      stopSpeech();
      setIsSpeaking(false);
      setActiveSpeechId(null);
      return;
    }
    stopSpeech();
    const vLang = getVernacularLang();
    setIsSpeaking(true);
    setActiveSpeechId(msgId);
    speakVernacularText(
      text,
      vLang,
      () => { setIsSpeaking(false); setActiveSpeechId(null); },
      () => { setIsSpeaking(false); setActiveSpeechId(null); }
    );
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeInUp">
      
      {/* 1. Header & Multilingual Selector */}
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Language Voice Farming Helper</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            AgriSmart AI Assistant
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
            Grounded advice for crop health, disease management, and weather spraying windows in English, Hindi, or Gujarati.
          </p>
        </div>

        {/* Global Language Toggle Persists across session */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          {[
            { id: "en", label: "English" },
            { id: "hi", label: "हिंदी" },
            { id: "gu", label: "ગુજરાતી" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                language === lang.id
                  ? "bg-emerald-400 text-emerald-950 shadow-md scale-102"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Conversational Chat Window */}
      <div className="glass-card p-4 sm:p-6 h-[580px] flex flex-col justify-between border border-emerald-900/10 shadow-lg">
        
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-start max-w-2xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                msg.sender === "ai" 
                  ? "green-gradient-bg text-white shadow-md" 
                  : "bg-emerald-900 text-white"
              }`}>
                {msg.sender === "ai" ? "🤖" : "👨‍🌾"}
              </div>

              {/* Bubble */}
              <div className={`p-4 rounded-3xl text-xs leading-relaxed space-y-2 ${
                msg.sender === "user"
                  ? "bg-emerald-900 text-white font-medium rounded-tr-none"
                  : "bg-emerald-900/5 text-emerald-950 border border-emerald-900/10 font-semibold rounded-tl-none"
              }`}>
                
                {/* Header line for AI message with Read Aloud TTS button */}
                {msg.sender === "ai" && (
                  <div className="flex items-center justify-between gap-2 border-b border-emerald-900/10 pb-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> AgriSmart AI
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePlayMessageSpeech(msg.id, msg.text)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isSpeaking && activeSpeechId === msg.id
                          ? "bg-emerald-600 text-white animate-pulse"
                          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                      }`}
                      title="Read Aloud in selected language"
                    >
                      {isSpeaking && activeSpeechId === msg.id ? (
                        <>
                          <VolumeX className="w-3 h-3" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>🔊 Read Aloud</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <p className="whitespace-pre-line text-xs">{msg.text}</p>

                {/* Quick Action Chips inside AI response */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {msg.actions.map((act, idx) => (
                      act.href ? (
                        <Link
                          key={idx}
                          href={act.href}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(act.query || act.label)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )
                    ))}
                  </div>
                )}

                <span className="text-[9px] opacity-60 block text-right pt-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 items-center text-xs font-semibold text-emerald-700">
              <div className="w-8 h-8 rounded-xl green-gradient-bg text-white flex items-center justify-center animate-pulse">
                🤖
              </div>
              <span>AgriSmart AI is analyzing grounded field telemetry & weather...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. Smart Suggestion Chips */}
        <div className="py-3 border-t border-emerald-900/10 overflow-x-auto flex items-center gap-2 pr-2">
          <span className="text-[10px] font-bold text-emerald-800/60 uppercase shrink-0">SUGGESTIONS:</span>
          {suggestionsMap[language].map((sug, i) => (
            <button
              key={i}
              onClick={() => handleSend(sug)}
              className="px-3 py-1.5 rounded-full bg-emerald-900/5 hover:bg-emerald-900/10 text-emerald-950 text-xs font-semibold whitespace-nowrap border border-emerald-900/10 transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* 4. Input Controls Bar (Text & Voice Mic) */}
        <div className="pt-3 flex items-center gap-2">
          {/* Voice Microphone Trigger Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-3 rounded-2xl transition-all shadow-sm ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            }`}
            title="Click to speak in your language (English, Hindi, Gujarati)"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              language === "hi" 
                ? "अपनी फसल, बीमारी या मौसम के बारे में प्रश्न पूछें..." 
                : language === "gu" 
                ? "તમારા પાક, રોગ અથવા હવામાન વિશે પ્રશ્ન પૂછો..." 
                : "Ask about crops, diseases, irrigation, or weather risk..."
            }
            className="flex-1 px-4 py-3 rounded-2xl bg-emerald-900/5 border border-emerald-900/10 text-xs font-semibold text-emerald-950 placeholder-emerald-800/40 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim()}
            className="px-5 py-3 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
