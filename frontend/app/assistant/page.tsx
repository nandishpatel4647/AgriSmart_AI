"use client";

import React, { useState } from "react";
import { Bot, Check, HelpCircle, LoaderCircle, Send, Sparkles, Volume2 } from "lucide-react";
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

  async function explain() {
    setLoading(true);
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

  // Pre-fill prompt suggestions
  const SUGGESTED_PROMPTS = [
    "Should I spray fungicide if rain is forecasted?",
    "What is the best irrigation timing for Tomato early blight?",
    "How to manage high humidity disease spread?",
  ];

  return (
    <div className="w-full" data-testid="assistant-page">
      <main className="relative z-10 mx-auto max-w-[1280px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Kicker & Heading */}
        <div className="section-kicker" data-testid="assistant-page-kicker">
          <span>04</span> AI assistant
        </div>
        <div className="mt-5 grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="assistant-page-heading">
              Make the next move <em>clear.</em>
            </h1>
            <p className="mt-5 max-w-[420px] text-sm leading-6 text-[#19352b]/65" data-testid="assistant-page-description">
              This assistant is grounded in the context you provide. It will not invent a diagnosis, weather event or treatment plan.
            </p>

            {/* Language Selector */}
            <div className="mt-8 flex items-center gap-1.5 rounded-full border border-[#19352b]/12 bg-[#fff8eb] p-1 w-fit" data-testid="assistant-language-toggle">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  language === "en" ? "bg-[#19352b] text-white" : "text-[#19352b]/50 hover:text-[#19352b]"
                }`}
                data-testid="assistant-english-button"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  language === "hi" ? "bg-[#19352b] text-white" : "text-[#19352b]/50 hover:text-[#19352b]"
                }`}
                data-testid="assistant-hindi-button"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("gu")}
                className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  language === "gu" ? "bg-[#19352b] text-white" : "text-[#19352b]/50 hover:text-[#19352b]"
                }`}
                data-testid="assistant-gujarati-button"
              >
                ગુજરાતી
              </button>
            </div>
          </div>

          {/* Context Card */}
          <div className="rounded-[32px] bg-[#e9d6b5] p-7 sm:p-9 border border-[#19352b]/10 shadow-[0_20px_50px_rgba(25,53,43,.06)]" data-testid="assistant-main-card">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-12 items-center justify-center rounded-[16px] bg-[#fff8eb] text-[#b77731] shadow-xs">
                <Bot size={23} />
              </span>
              <span className="rounded-full bg-[#19352b]/10 px-3.5 py-1.5 text-[10px] font-bold text-[#19352b] tracking-wider" data-testid="assistant-grounded-badge">
                GROUNDED RULES · NO HALLUCINATIONS
              </span>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field label="Current leaf result" testId="assistant-disease-field">
                <select 
                  value={disease} 
                  onChange={(e) => setDisease(e.target.value)} 
                  className="field-control" 
                  data-testid="assistant-disease-select"
                >
                  <option value="Tomato Early Blight (verified)">Tomato Early Blight (verified)</option>
                  <option value="Tomato Late Blight (verified)">Tomato Late Blight (verified)</option>
                  <option value="Healthy crop (verified)">Healthy crop (verified)</option>
                  <option value="No verified disease yet">No verified disease yet</option>
                </select>
              </Field>

              <Field label="Soil moisture" testId="assistant-soil-field">
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={soil} 
                    onChange={(e) => setSoil(Number(e.target.value))} 
                    className="range-field" 
                    data-testid="assistant-soil-slider" 
                  />
                  <strong className="text-xs font-mono text-[#19352b] min-w-[32px]" data-testid="assistant-soil-value">{soil}%</strong>
                </div>
              </Field>

              <Field label="Rain probability" testId="assistant-rain-field">
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={rain} 
                    onChange={(e) => setRain(Number(e.target.value))} 
                    className="range-field" 
                    data-testid="assistant-rain-slider" 
                  />
                  <strong className="text-xs font-mono text-[#19352b] min-w-[32px]" data-testid="assistant-rain-value">{rain}%</strong>
                </div>
              </Field>

              <div className="flex items-end">
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-center rounded-full bg-[#19352b] text-xs font-bold text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                  onClick={explain}
                  disabled={loading}
                  data-testid="assistant-explain-button"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="mr-2 animate-spin" size={15} />
                      <span>Reasoning from context…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2" size={15} />
                      <span>Explain my field</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional question field */}
            <div className="mt-5 pt-5 border-t border-[#19352b]/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask a specific question (e.g. spray schedule, fertilizer)..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") explain(); }}
                  className="field-control flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={explain}
                  disabled={loading}
                  className="size-10 flex items-center justify-center rounded-xl bg-[#b77731] text-white hover:bg-[#a36829] transition-colors cursor-pointer shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => { setUserQuery(prompt); }}
                    className="rounded-full bg-[#fff8eb]/80 border border-[#19352b]/10 px-3 py-1 text-[10px] text-[#19352b]/70 hover:bg-[#fff8eb] hover:text-[#19352b] transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assistant Response Card */}
        {assistantData && (
          <section className="mt-8 rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] sm:p-10 shadow-[0_24px_60px_rgba(25,53,43,.16)] animate-in fade-in slide-in-from-bottom-4 duration-300" data-testid="assistant-response-card">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f6c86e] block mb-4">
              Context-Grounded Field Guidance
            </span>

            <p className="max-w-[860px] font-heading text-[clamp(1.6rem,3.2vw,2.8rem)] leading-[1.08] tracking-[-.05em]" data-testid="assistant-response-answer">
              {assistantData.answer}
            </p>

            {/* Action checklist */}
            {assistantData.actions && assistantData.actions.length > 0 && (
              <div className="mt-8 grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
                {assistantData.actions.map((action, index) => (
                  <div key={action} className="flex items-start gap-3 text-xs leading-5 text-white/80" data-testid={`assistant-response-action-${index}`}>
                    <Check className="shrink-0 text-[#f6c86e] mt-0.5" size={16} />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Grounded facts */}
            {assistantData.grounded_facts && (
              <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-white/45 mr-2">
                  Grounded in:
                </span>
                {assistantData.grounded_facts.map((fact, index) => (
                  <span key={fact} className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/80" data-testid={`assistant-grounded-fact-${index}`}>
                    {fact}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, testId, children }: { label: string; testId: string; children: React.ReactNode }) {
  return (
    <div data-testid={testId}>
      <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-[#19352b]/50 mb-2">
        {label}
      </span>
      {children}
    </div>
  );
}
