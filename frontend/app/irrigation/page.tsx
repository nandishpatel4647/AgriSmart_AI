"use client";

import React, { useState, useEffect } from "react";
import { Droplets, Leaf, LoaderCircle, RefreshCw, Sparkles, Sprout } from "lucide-react";
import { apiPost } from "../lib/api";
import type { InsightInput, InsightResponse } from "../lib/types";

export default function IrrigationPage() {
  const [soilMoisture, setSoilMoisture] = useState(31);
  const [rainProb, setRainProb] = useState(18);
  const [crop, setCrop] = useState("Tomato");
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculateInsights(s: number, r: number, c: string) {
    setLoading(true);
    try {
      const data = await apiPost<InsightResponse>("/insights", {
        crop: c,
        growth_stage: "Growing",
        soil_moisture: s,
        rain_probability: r,
        temperature: 29,
        disease_detected: true,
      });
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    calculateInsights(soilMoisture, rainProb, crop);
  }, []);

  const score = insights?.sustainability_score ?? 78;

  return (
    <div className="w-full" data-testid="irrigation-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="intelligence-kicker">
          <span>03</span> Field intelligence
        </div>
        <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="intelligence-heading">
              Combine leaf health with <em>live climate.</em>
            </h1>
            <p className="mt-5 max-w-[460px] text-sm leading-6 text-[#19352b]/65" data-testid="intelligence-description">
              Rules-based irrigation schedules cross-referencing real-time root-zone sensor data with 7-day meteorological forecasts.
            </p>
          </div>

          {/* Interactive controls */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.05)] border border-[#19352b]/10">
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731] block mb-4">
              Simulate Field Conditions
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-[#19352b] block mb-2">Soil Moisture: {soilMoisture}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soilMoisture}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSoilMoisture(v);
                    calculateInsights(v, rainProb, crop);
                  }}
                  className="range-field"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#19352b] block mb-2">Rain Probability: {rainProb}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rainProb}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRainProb(v);
                    calculateInsights(soilMoisture, v, crop);
                  }}
                  className="range-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Cards Grid */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* Sustainability Card */}
          <div className="rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] sm:p-9 shadow-[0_24px_60px_rgba(25,53,43,.14)]" data-testid="sustainability-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f6c86e]" data-testid="sustainability-kicker">
                <Leaf size={14} /> Sustainability
              </div>
              <span className="text-[10px] text-white/45" data-testid="sustainability-status">Indicative score</span>
            </div>

            <div className="mt-8 flex items-center gap-7">
              <div 
                className="relative flex size-32 items-center justify-center rounded-full shrink-0" 
                style={{ background: `conic-gradient(#f6c86e ${score}%, rgba(255,255,255,.12) 0)` }} 
                data-testid="sustainability-score-ring"
              >
                <div className="flex size-[104px] items-center justify-center rounded-full bg-[#19352b] text-center">
                  <div>
                    <span className="font-heading text-4xl tracking-[-0.07em]" data-testid="sustainability-score">{score}</span>
                    <span className="block text-[9px] uppercase tracking-[0.12em] text-white/50">of 100</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-heading text-2xl tracking-[-0.05em]" data-testid="sustainability-heading">
                  Better choices,<br />compounded.
                </h3>
                <p className="mt-3 max-w-[220px] text-xs leading-5 text-white/60" data-testid="sustainability-formula">
                  {insights?.score_formula ?? "Score calculated from soil conservation and rainfall offset."}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {(insights?.suggestions ?? ["Use drip lines to reduce evaporation.", "Check root-zone moisture before watering."]).map((suggestion, index) => (
                <div key={suggestion} className="flex gap-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/70" data-testid={`sustainability-suggestion-${index}`}>
                  <span className="font-mono text-[#f6c86e]">0{index + 1}</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Irrigation Card */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 shadow-[0_15px_45px_rgba(25,53,43,0.05)] sm:p-9 border border-[#19352b]/10" data-testid="irrigation-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b77731]" data-testid="irrigation-kicker">
                <Droplets size={14} /> Smart irrigation
              </div>
              <span className="rounded-full bg-[#d7e2ce] px-3 py-1 text-[10px] font-bold text-[#1f503d]" data-testid="irrigation-rule-badge">
                Rule-based
              </span>
            </div>

            <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <h3 className="font-heading max-w-[360px] text-[2.7rem] leading-[0.92] tracking-[-0.065em] text-[#19352b]" data-testid="irrigation-title">
                  {insights?.irrigation_title ?? "Waiting for context"}
                </h3>
                <p className="mt-4 max-w-[400px] text-sm leading-6 text-[#19352b]/65" data-testid="irrigation-reason">
                  {insights?.irrigation_reason ?? "Combines real soil moisture with live rain probability."}
                </p>
              </div>

              <div className="min-w-[170px] rounded-2xl bg-[#f2eadc] p-4 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#19352b]/45" data-testid="irrigation-trigger-label">Current trigger</span>
                <span className="mt-2 block text-2xl font-semibold text-[#19352b]" data-testid="irrigation-trigger-value">
                  {soilMoisture}% <span className="text-xs font-normal text-[#19352b]/50">soil</span>
                </span>
              </div>
            </div>

            <div className="mt-8 border-t border-[#19352b]/10 pt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#19352b]/50" data-testid="activity-log-label">
                Decision trail
              </p>
              <div className="space-y-3">
                {(insights?.activity_log ?? ["Soil moisture cross-referenced with weather outlook."]).map((entry, index) => (
                  <div key={entry} className="flex items-start gap-3 text-xs text-[#19352b]/70" data-testid={`activity-log-entry-${index}`}>
                    <span className={`mt-1.5 size-2 rounded-full shrink-0 ${index === 0 ? "bg-[#b77731]" : "bg-[#19352b]/30"}`} />
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
