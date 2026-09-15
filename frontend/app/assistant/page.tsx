"use client";

import React, { useState, useEffect } from "react";
import { Bot, Check, HelpCircle, LoaderCircle, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, CheckCircle2 } from "lucide-react";
import { apiPost } from "../lib/api";
import type { AssistantResponse, InsightInput, InsightResponse, Language } from "../lib/types";

export default function AssistantPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [soil, setSoil] = useState(31);
  const [rain, setRain] = useState(18);
  const [disease, setDisease] = useState("Tomato Early Blight (verified)");
  const [userQuery, setUserQuery] = useState("");
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Voice Input (Speech-to-Text) & Output (Text-to-Speech) State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop speech when language changes
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [language]);

  async function explain() {
    setLoading(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const payload: InsightInput = {
        crop: "Tomato",
        growth_stage: "Growing",
        soil_moisture: soil,
        rain_probability: rain,
        temperature: 29,
        disease_detected: disease !== "Healthy crop (verified)",
        language,
      };

      const inRes = await apiPost<InsightResponse>("/insights", payload);
      setInsights(inRes);

      const asstRes = await apiPost<AssistantResponse>("/assistant", {
        disease_label: disease,
        crop: "Tomato",
        confidence: 0.96,
        irrigation_title: inRes.irrigation_title,
        sustainability_score: inRes.sustainability_score,
        rain_probability: rain,
        language,
        question: userQuery.trim() || undefined,
      });
      setAssistantData(asstRes);
    } catch (e) {
      console.error("Failed to fetch assistant advice", e);
    } finally {
      setLoading(false);
    }
  }

  // Speech-to-Text Microphone Handler
  function toggleListening() {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      if (language === "hi") recognition.lang = "hi-IN";
      else if (language === "gu") recognition.lang = "gu-IN";
      else recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setUserQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  }

  // Text-to-Speech Output Handler
  function speakResponse() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = assistantData?.answer || assistantData?.voice_script || insights?.plain_language_explanation;
    if (!textToSpeak) return;

    const cleanText = textToSpeak.replace(/[\*\_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (language === "hi") utterance.lang = "hi-IN";
    else if (language === "gu") utterance.lang = "gu-IN";
    else utterance.lang = "en-US";

    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }

  return (
    <div className="w-full" data-testid="assistant-page">
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="assistant-page-kicker">
          <span>04</span> MULTILINGUAL FARMER ASSISTANT
        </div>

        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-heading text-[clamp(2.8rem,5.5vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-[#19352b]" data-testid="assistant-page-heading">
              Plain-language <em className="font-serif font-normal italic text-[#b77731]">field voice assistant.</em>
            </h1>
            <p className="mt-4 max-w-[620px] text-base sm:text-lg font-semibold text-[#19352b]/80" data-testid="assistant-page-description">
              Ask questions by voice or text. Get grounded, plain-language agronomic answers in English, Hindi, or Gujarati.
            </p>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center gap-2 rounded-2xl border-2 border-[#19352b]/20 bg-[#fff8eb] p-2 shadow-sm w-fit" data-testid="assistant-language-toggle">
            <LangButton current={language} code="en" label="English" onClick={setLanguage} />
            <LangButton current={language} code="hi" label="हिन्दी (Hindi)" onClick={setLanguage} />
            <LangButton current={language} code="gu" label="ગુજરાતી (Gujarati)" onClick={setLanguage} />
          </div>
        </div>

        {/* Input Parameters Card */}
        <section className="mt-10 rounded-[36px] bg-[#fff8eb] p-8 sm:p-10 border-2 border-[#19352b]/15 shadow-md">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">Disease Condition</label>
              <select value={disease} onChange={(e) => setDisease(e.target.value)} className="field-control">
                <option value="Tomato Early Blight (verified)">Tomato Early Blight (verified)</option>
                <option value="Potato Late Blight (verified)">Potato Late Blight (verified)</option>
                <option value="Corn Common Rust (verified)">Corn Common Rust (verified)</option>
                <option value="Healthy crop (verified)">Healthy crop (verified)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">Soil Moisture: {soil}%</label>
              <input type="range" min="0" max="100" value={soil} onChange={(e) => setSoil(Number(e.target.value))} className="range-field mt-3" />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">Rain Prob: {rain}%</label>
              <input type="range" min="0" max="100" value={rain} onChange={(e) => setRain(Number(e.target.value))} className="range-field mt-3" />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={explain}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-[#19352b] hover:bg-[#11241d] py-3.5 text-base font-extrabold text-[#fff8eb] shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                {loading ? <LoaderCircle size={20} className="animate-spin" /> : <Sparkles size={20} />}
                <span>{loading ? "Reasoning..." : "Explain My Field"}</span>
              </button>
            </div>

          </div>

          {/* Voice Input Box */}
          <div className="mt-8 pt-6 border-t-2 border-[#19352b]/10">
            <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">
              Speak or Type Your Question
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && explain()}
                  placeholder={
                    language === "hi"
                      ? "अपना प्रश्न पूछें (जैसे छिड़काव का समय, खाद)..."
                      : language === "gu"
                      ? "તમારો પ્રશ્ન પૂછો (દા.ત. છંટકાવનો સમય)..."
                      : "Ask a specific question (e.g. spray schedule, fertilizer dose)..."
                  }
                  className="w-full rounded-2xl border-2 border-[#19352b]/20 bg-white px-5 py-4 text-base font-bold text-[#19352b] outline-none focus:border-[#b77731]"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                    isListening ? "bg-red-600 text-white animate-pulse" : "text-[#b77731] hover:bg-[#19352b]/10"
                  }`}
                >
                  {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
              </div>

              <button
                type="button"
                onClick={explain}
                disabled={loading}
                className="rounded-2xl bg-[#b77731] hover:bg-[#a36829] px-7 py-4 text-base font-black text-[#fff8eb] shadow-md shrink-0 cursor-pointer"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* AI Answer & Plain Language Voice Output Card */}
        <section className="mt-10" data-testid="assistant-response-section">
          <div className="rounded-[36px] bg-[#19352b] p-8 sm:p-12 text-[#fff8eb] shadow-xl border-2 border-[#19352b]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-white/15 pb-6">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#fff8eb]/15 text-[#f6c86e]">
                  <Bot size={26} />
                </span>
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#f6c86e]">
                    AI FARMER ASSISTANT ADVISORY
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                    Grounded Advisory Output
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={speakResponse}
                className={`flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-extrabold transition-all cursor-pointer shadow-md ${
                  isSpeaking ? "bg-red-500 text-white animate-pulse" : "bg-[#f6c86e] text-[#19352b] hover:bg-amber-300"
                }`}
              >
                {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
                <span>{isSpeaking ? "Stop Voice" : "🔊 Listen in " + (language === "hi" ? "Hindi" : language === "gu" ? "Gujarati" : "English")}</span>
              </button>
            </div>

            <div className="mt-8 text-lg sm:text-xl font-bold leading-relaxed text-white/95">
              {assistantData?.answer || assistantData?.voice_script || insights?.plain_language_explanation || (
                "Click 'Explain My Field' or ask a question above to receive grounded voice advice in English, Hindi, or Gujarati."
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

function LangButton({ current, code, label, onClick }: { current: Language; code: Language; label: string; onClick: (c: Language) => void }) {
  const active = current === code;
  return (
    <button
      type="button"
      onClick={() => onClick(code)}
      className={`rounded-xl px-4 py-2.5 text-sm font-black transition-all cursor-pointer ${
        active ? "bg-[#19352b] text-[#fff8eb] shadow-sm" : "text-[#19352b]/80 hover:bg-[#19352b]/10"
      }`}
    >
      {label}
    </button>
  );
}
