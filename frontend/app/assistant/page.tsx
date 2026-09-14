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
  HelpCircle
} from "lucide-react";
import { askAssistant } from "../lib/api";
import { 
  VernacularLanguage, 
  LANGUAGE_LOCALES, 
  speakText as speakVernacularText, 
  stopSpeech, 
  createSpeechRecognizer, 
  isSpeechRecognitionSupported 
} from "../lib/speech";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  actions?: { label: string; href: string }[];
}

export default function AssistantPage() {
  const [language, setLanguage] = useState<"en" | "hi" | "gu">("en");
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello Farmer! I am your AgriSmart AI Farming Copilot. How can I help you with your crops, weather risk, or disease treatment today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: "Scan Crop Disease", href: "/detect" },
        { label: "Check Spray Window", href: "/weather" }
      ]
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Multilingual Greetings & Suggestions
  const suggestionsMap = {
    en: [
      "My tomato leaves have dark brown spots",
      "When should I irrigate my fields?",
      "What disease risk is expected tomorrow?",
      "Best time for pesticide spraying?",
      "Organic pest control for aphid attack"
    ],
    hi: [
      "मेरे टमाटर के पत्तों पर काले धब्बे हैं",
      "मुझे अपने खेतों में सिंचाई कब करनी चाहिए?",
      "कल क्या बीमारी का खतरा होने की संभावना है?",
      "कीटनाशक छिड़काव का सबसे अच्छा समय?",
      "कीटों के लिए जैविक नियंत्रण उपाय"
    ],
    gu: [
      "મારા બટાકાના પાન પીળા થઈ રહ્યા છે",
      "સિંચાઈ ક્યારે કરવી જોઈએ?",
      "આવતીકાલે કયો રોગનો ભય છે?",
      "જંતુનાશક છંટકાવનો શ્રેષ્ઠ સમય?",
      "કુદરતી જંતુનાશક કયું વાપરવું?"
    ]
  };

    const getVernacularLang = (): VernacularLanguage => {
      if (language === "hi") return "hindi";
      if (language === "gu") return "gujarati";
      return "english";
    };

    const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    // Stop ongoing speech before answering new question
    stopSpeech();
    setIsSpeaking(false);

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
      const resp = await askAssistant(textToSend, language);
      const aiReply = resp.response || resp.answer || "Based on field telemetry: High humidity increases fungal risk. Inspect crop leaves within 24h.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: "Inspect Disease Scanner", href: "/detect" },
          { label: "Check Weather Risk", href: "/weather" }
        ]
      };

      setMessages((prev) => [...prev, aiMsg]);
      
      // Automatic read-aloud in selected vernacular language
      const vLang = getVernacularLang();
      setIsSpeaking(true);
      speakVernacularText(
        aiReply,
        vLang,
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    } catch (err: any) {
      const fallbackText = language === "hi" 
        ? "कृषि सलाह: उच्च आर्द्रता फफूंद संक्रमण को बढ़ाती है। पत्तियों की जांच करें और टपक सिंचाई का प्रयोग करें।"
        : language === "gu"
        ? "ખેતી સલાહ: વધુ પડતો ભેજ ફૂગના રોગોને વધારે છે. પાનની સપાટી તપાસો અને ટપક પદ્ધતિ અપનાવો."
        : "AI Advisory: High relative humidity and temperature favor fungal growth. We recommend inspecting leaf surfaces and using drip irrigation.";

      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: "Scan Leaf Sample", href: "/detect" }]
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

    // Stop speaking before listening
    stopSpeech();
    setIsSpeaking(false);

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

  // Manual TTS Trigger for any message bubble
  const handlePlayMessageSpeech = (text: string) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    const vLang = getVernacularLang();
    setIsSpeaking(true);
    speakVernacularText(
      text,
      vLang,
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeInUp">
      
      {/* 1. Header & Multilingual Selector */}
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Multi-Language Voice Farming Copilot</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            Ask AgriSmart AI Assistant
          </h1>
          <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
            Ask crop health, weather risk, or disease treatment questions in English, Hindi, or Gujarati.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
          {[
            { id: "en", label: "English" },
            { id: "hi", label: "हिंदी" },
            { id: "gu", label: "ગુજરાતી" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id as any)}
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
      <div className="glass-card p-4 sm:p-6 h-[560px] flex flex-col justify-between border border-emerald-900/10 shadow-lg">
        
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
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Quick Action Chips inside AI response */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {msg.actions.map((act, idx) => (
                      <Link
                        key={idx}
                        href={act.href}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
              <span>AgriSmart AI is analyzing field telemetry...</span>
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
            title="Click to speak in your language"
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
                ? "अपनी फसल या बीमारी के बारे में प्रश्न पूछें..." 
                : language === "gu" 
                ? "તમારા પાક અથવા રોગ વિશે પ્રશ્ન પૂછો..." 
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
