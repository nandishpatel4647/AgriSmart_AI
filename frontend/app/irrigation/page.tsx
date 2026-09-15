"use client";

import React, { useState, useEffect } from "react";
import { 
  Droplets, 
  Leaf, 
  Sprout, 
  MapPin, 
  RefreshCw, 
  Volume2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Calendar,
  ShieldCheck,
  Zap,
  Calculator,
  CloudRain
} from "lucide-react";
import { apiPost, getWeather, getSustainability } from "../lib/api";
import type { InsightResponse } from "../lib/types";

interface IrrigationRecommendation {
  recommendation: "irrigate_urgent" | "irrigate" | "delay" | "no_irrigation" | "reduce" | "stop";
  urgency: string;
  reasoning: string[];
  amount_mm: number;
  schedule: string;
  thresholds_used: {
    critical_low: number;
    optimal_low: number;
    optimal_high: number;
    waterlogged: number;
    daily_water_need_mm: number;
  };
  growth_stage_info: {
    water_multiplier: number;
    sensitivity: string;
  };
}

interface FullIrrigationResponse {
  success: boolean;
  recommendation: IrrigationRecommendation;
}

export default function IrrigationPage() {
  const [soilMoisture, setSoilMoisture] = useState(31);
  const [rainProb, setRainProb] = useState(18);
  const [crop, setCrop] = useState("Tomato");
  const [growthStage, setGrowthStage] = useState("growing");
  const [temperature, setTemperature] = useState(29);
  
  // GPS & Speech state
  const [locationName, setLocationName] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Sustainability practice toggles & formula modal
  const [dripIrrigation, setDripIrrigation] = useState(true);
  const [rainwaterHarvesting, setRainwaterHarvesting] = useState(false);
  const [organicMethods, setOrganicMethods] = useState(false);
  const [cropRotation, setCropRotation] = useState(true);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [customSustData, setCustomSustData] = useState<any>(null);
  
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [faoRec, setFaoRec] = useState<IrrigationRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const availableCrops = ["Tomato", "Potato", "Corn", "Apple", "Grape", "Bell Pepper"];
  const growthStages = [
    { value: "seedling", label: "🌱 Seedling (Early)" },
    { value: "growing", label: "🌿 Vegetative Growth" },
    { value: "flowering", label: "🌸 Flowering Stage" },
    { value: "fruiting", label: "🍅 Fruiting / Yielding" },
    { value: "mature", label: "🌾 Mature / Harvest" },
  ];

  async function calculateInsights(s: number, r: number, c: string, st: string, t: number) {
    setLoading(true);
    try {
      // 1. Fetch FAO-56 recommendation
      const faoRes = await apiPost<FullIrrigationResponse>("/irrigation", {
        soil_moisture: s,
        crop_type: c,
        growth_stage: st,
        temperature: t,
        humidity: 60,
        rain_probability: r,
        rain_amount_forecast: r > 50 ? 12.0 : 0.0,
      });
      if (faoRes && faoRes.recommendation) {
        setFaoRec(faoRes.recommendation);
      }

      // 2. Fetch Insights & Sustainability score
      const data = await apiPost<InsightResponse>("/insights", {
        crop: c,
        growth_stage: st,
        soil_moisture: s,
        rain_probability: r,
        temperature: t,
        disease_detected: false,
      });
      setInsights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Speech Vernacular Audio Reader for Farmers
  const speakAdvisory = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice playback is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const recType = faoRec?.recommendation || "no_irrigation";
    let isRequiredText = "Irrigation is not required today.";
    if (recType === "irrigate_urgent" || recType === "irrigate") {
      isRequiredText = `Irrigation is required today for your ${crop} crop.`;
    } else if (recType === "delay") {
      isRequiredText = `Hold irrigation. Rain is forecasted for your ${crop} crop.`;
    }

    const titleText = insights?.irrigation_title || "Smart Irrigation Advisory";
    const reasonText = insights?.irrigation_reason || "";
    const scheduleText = faoRec?.schedule ? `Watering schedule: ${faoRec.schedule}` : "";
    const waterText = faoRec && faoRec.amount_mm > 0 ? `Water volume required: ${faoRec.amount_mm} millimeters, approximately ${Math.round(faoRec.amount_mm * 10)} liters per square meter.` : "";

    const textToSpeak = `${isRequiredText} ${titleText}. ${reasonText}. ${waterText} ${scheduleText}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-detect GPS Weather Rain Forecast
  const handleAutoDetectGPS = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const wData: any = await getWeather(lat, lon);
          if (wData) {
            const current = wData.current || wData;
            const fetchedRainProb = wData.rain_probability ?? current.precipitation_probability ?? current.rain_probability ?? 25;
            const fetchedTemp = Math.round(current.temperature ?? current.temp ?? 29);
            const locLabel = wData.location?.city || wData.city || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
            
            setRainProb(fetchedRainProb);
            setTemperature(fetchedTemp);
            setLocationName(locLabel);
            
            calculateInsights(soilMoisture, fetchedRainProb, crop, growthStage, fetchedTemp);
          }
        } catch (err) {
          console.error("Failed to fetch GPS weather:", err);
          setLocationName("GPS Active");
        } finally {
          setGpsLoading(false);
        }
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const fetchCustomSustainability = async (
    drip: boolean,
    rainwater: boolean,
    organic: boolean,
    rotation: boolean
  ) => {
    try {
      const recAmt = faoRec?.amount_mm ? faoRec.amount_mm * 10 : 50;
      const res: any = await getSustainability({
        water_used_liters: recAmt,
        water_recommended_liters: 60.0,
        rainwater_harvested: rainwater,
        drip_irrigation: drip,
        pesticide_used: !organic,
        organic_methods: organic,
        fertilizer_excess: false,
        crop_rotation: rotation,
        disease_detected: false,
        is_healthy: true,
      });
      if (res && res.sustainability) {
        setCustomSustData(res.sustainability);
      }
    } catch (e) {
      console.error("Failed to calculate custom sustainability:", e);
    }
  };

  useEffect(() => {
    calculateInsights(soilMoisture, rainProb, crop, growthStage, temperature);
    handleAutoDetectGPS();
  }, []);

  useEffect(() => {
    fetchCustomSustainability(dripIrrigation, rainwaterHarvesting, organicMethods, cropRotation);
  }, [dripIrrigation, rainwaterHarvesting, organicMethods, cropRotation, faoRec]);

  const score = customSustData?.total_score ?? insights?.sustainability_score ?? 78;
  const band = customSustData?.band ?? (score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor");
  const suggestions = customSustData?.suggestions ?? insights?.suggestions ?? ["Use drip lines to reduce evaporation.", "Check root-zone moisture before watering."];

  // High-Contrast Irrigation Requirement Status
  const getIrrigationStatusHeader = () => {
    const recType = faoRec?.recommendation;
    if (recType === "irrigate_urgent") {
      return {
        requiredText: "YES — URGENT IRRIGATION REQUIRED",
        colorClass: "bg-red-700 text-white border-red-800 shadow-md",
        icon: AlertTriangle,
        badgeText: "CRITICAL DEFICIT",
      };
    }
    if (recType === "irrigate") {
      return {
        requiredText: "YES — IRRIGATION RECOMMENDED TODAY",
        colorClass: "bg-emerald-800 text-white border-emerald-900 shadow-md",
        icon: Droplets,
        badgeText: "WATERING NEEDED",
      };
    }
    if (recType === "delay") {
      return {
        requiredText: "NO — DELAY IRRIGATION (RAIN EXPECTED)",
        colorClass: "bg-blue-800 text-white border-blue-900 shadow-md",
        icon: CloudRain,
        badgeText: "SAVE WATER",
      };
    }
    if (recType === "stop") {
      return {
        requiredText: "NO — STOP IRRIGATION (SOIL WATERLOGGED)",
        colorClass: "bg-red-800 text-white border-red-900 shadow-md",
        icon: AlertTriangle,
        badgeText: "WATERLOGGED",
      };
    }
    return {
      requiredText: "NO — SOIL MOISTURE IS OPTIMAL",
      colorClass: "bg-emerald-900 text-white border-emerald-950 shadow-md",
      icon: CheckCircle2,
      badgeText: "OPTIMAL MOISTURE",
    };
  };

  const statusHeader = getIrrigationStatusHeader();
  const StatusIcon = statusHeader.icon;

  return (
    <div className="w-full" data-testid="irrigation-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="intelligence-kicker">
          <span>03</span> Smart Precision Irrigation
        </div>

        <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="intelligence-heading">
              Precision Crop Irrigation <em>FAO-56 Standard.</em>
            </h1>
            <p className="mt-4 max-w-[480px] text-sm leading-6 text-[#19352b]/70" data-testid="intelligence-description">
              Predicts whether irrigation is required by cross-referencing soil moisture %, live 24h weather rain forecasts, crop type water baselines, and growth stage multipliers.
            </p>
          </div>

          {/* Compact Interactive controls */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.05)] border border-[#19352b]/15 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731] block">
                Field Parameter Inputs
              </span>
              
              <button
                type="button"
                onClick={handleAutoDetectGPS}
                disabled={gpsLoading}
                className="px-3 py-1 rounded-full bg-[#19352b] text-[#fff8eb] font-bold text-[10px] flex items-center gap-1 hover:opacity-90 transition-all cursor-pointer"
              >
                {gpsLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[#f6c86e]" />
                ) : (
                  <MapPin className="w-3 h-3 text-[#f6c86e]" />
                )}
                <span>{locationName ? `GPS: ${locationName}` : "Auto GPS Rain"}</span>
              </button>
            </div>

            {/* Crop & Stage Compact Selectors */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-[#19352b] block mb-1">Crop Type</label>
                <select
                  value={crop}
                  onChange={(e) => {
                    setCrop(e.target.value);
                    calculateInsights(soilMoisture, rainProb, e.target.value, growthStage, temperature);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#19352b]/20 text-xs font-bold text-[#19352b]"
                >
                  {availableCrops.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#19352b] block mb-1">Growth Stage</label>
                <select
                  value={growthStage}
                  onChange={(e) => {
                    setGrowthStage(e.target.value);
                    calculateInsights(soilMoisture, rainProb, crop, e.target.value, temperature);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#19352b]/20 text-xs font-bold text-[#19352b]"
                >
                  {growthStages.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sliders */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-[#19352b]/10">
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
                    calculateInsights(v, rainProb, crop, growthStage, temperature);
                  }}
                  className="range-field"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#19352b] block mb-2">24h Rain Forecast: {rainProb}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rainProb}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRainProb(v);
                    calculateInsights(soilMoisture, v, crop, growthStage, temperature);
                  }}
                  className="range-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Cards Grid */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          
          {/* Sustainability Card */}
          <div className="rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] sm:p-9 shadow-[0_24px_60px_rgba(25,53,43,.14)] space-y-6" data-testid="sustainability-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f6c86e]" data-testid="sustainability-kicker">
                <Leaf size={14} /> Sustainability Index
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-widest" data-testid="sustainability-status">
                {band} Grade
              </span>
            </div>

            <div className="flex items-center gap-7">
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
                <h3 className="font-heading text-xl tracking-[-0.05em]" data-testid="sustainability-heading">
                  Environmental Index
                </h3>
                <p className="mt-1 text-xs leading-5 text-white/70" data-testid="sustainability-formula">
                  {insights?.score_formula ?? "Weighted 40% Water Efficiency + 30% Resource Stewardship + 30% Crop Health"}
                </p>
                
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#f6c86e] hover:underline cursor-pointer"
                  data-testid="view-formula-btn"
                >
                  <Calculator className="w-3.5 h-3.5" /> View Formula & Scoring Rules →
                </button>
              </div>
            </div>

            {/* Farm Practice Toggles */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f6c86e] block">
                🌱 Active Farm Practices (Simulate Impact)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDripIrrigation(!dripIrrigation)}
                  className={`p-2 rounded-xl border text-left transition-all text-[11px] ${
                    dripIrrigation 
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  💧 Drip Lines (+10) {dripIrrigation ? "✓" : "+"}
                </button>

                <button
                  type="button"
                  onClick={() => setRainwaterHarvesting(!rainwaterHarvesting)}
                  className={`p-2 rounded-xl border text-left transition-all text-[11px] ${
                    rainwaterHarvesting 
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  🌧️ Rain Harvesting (+10) {rainwaterHarvesting ? "✓" : "+"}
                </button>

                <button
                  type="button"
                  onClick={() => setOrganicMethods(!organicMethods)}
                  className={`p-2 rounded-xl border text-left transition-all text-[11px] ${
                    organicMethods 
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  🐞 Organic Pest (+20) {organicMethods ? "✓" : "+"}
                </button>

                <button
                  type="button"
                  onClick={() => setCropRotation(!cropRotation)}
                  className={`p-2 rounded-xl border text-left transition-all text-[11px] ${
                    cropRotation 
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" 
                      : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                  }`}
                >
                  🔄 Crop Rotation (+15) {cropRotation ? "✓" : "+"}
                </button>
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 block">
                💡 Targeted Improvement Suggestions
              </span>
              {suggestions.map((suggestion: string, index: number) => (
                <div key={suggestion} className="flex gap-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/80" data-testid={`sustainability-suggestion-${index}`}>
                  <span className="font-mono text-[#f6c86e]">0{index + 1}</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Irrigation Card — HIGHLY HIGHLIGHTED OUTPUT */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 shadow-[0_15px_45px_rgba(25,53,43,0.05)] sm:p-9 border-2 border-[#19352b]/20 space-y-6" data-testid="irrigation-card">
            
            <div className="flex items-center justify-between border-b border-[#19352b]/10 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b77731]" data-testid="irrigation-kicker">
                <Droplets size={16} /> Smart Irrigation Output
              </div>

              <div className="flex items-center gap-2">
                {/* Vernacular Voice Speaker Button */}
                <button
                  type="button"
                  onClick={speakAdvisory}
                  className="rounded-full bg-[#19352b] hover:bg-[#11241d] px-3.5 py-1.5 text-xs font-extrabold text-[#fff8eb] flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  title="Listen advice aloud"
                >
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse text-[#f6c86e]" : "text-[#f6c86e]"}`} />
                  <span>{isSpeaking ? "Stop Voice" : "🔊 Listen"}</span>
                </button>

                <span className="rounded-full bg-[#d7e2ce] px-3 py-1 text-[10px] font-bold text-[#1f503d]" data-testid="irrigation-rule-badge">
                  FAO-56 Model
                </span>
              </div>
            </div>

            {/* 1. SLEEK COMPACT IRRIGATION REQUIRED STATUS PILL */}
            <div className={`p-3 px-4 rounded-xl border flex items-center justify-between gap-3 ${statusHeader.colorClass}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block">
                    IS IRRIGATION REQUIRED?
                  </span>
                  <span className="font-heading text-sm sm:text-base font-extrabold tracking-tight block">
                    {statusHeader.requiredText}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/20 shrink-0">
                {statusHeader.badgeText}
              </span>
            </div>

            {/* 2. EXPANDED CROP & GROWTH STAGE PARAMETERS CARD (BIGGER & HIGHLY READABLE) */}
            {faoRec?.thresholds_used && faoRec?.growth_stage_info && (
              <div className="p-5 rounded-2xl bg-white border-2 border-[#19352b]/15 space-y-4 shadow-xs">
                
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌾</span>
                    <div>
                      <h4 className="font-heading text-base font-black text-[#19352b]">
                        Crop Parameters: <span className="text-[#b77731]">{crop}</span> ({growthStage.toUpperCase()} Stage)
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Calibrated from FAO Irrigation Paper No. 56 standards.
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-xl bg-amber-100/80 text-amber-900 font-black text-xs border border-amber-300">
                    Stage Factor: {faoRec.growth_stage_info.water_multiplier}x Multiplier
                  </span>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">FAO Base Need</span>
                    <span className="font-heading text-lg font-black text-[#19352b] block mt-0.5">{faoRec.thresholds_used.daily_water_need_mm} mm/day</span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Root Sensitivity</span>
                    <span className="font-heading text-base font-black text-emerald-800 capitalize block mt-0.5">{faoRec.growth_stage_info.sensitivity}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Optimal Target</span>
                    <span className="font-heading text-base font-black text-emerald-950 block mt-0.5">{faoRec.thresholds_used.optimal_low}%–{faoRec.thresholds_used.optimal_high}%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Critical Deficit</span>
                    <span className="font-heading text-base font-black text-red-800 block mt-0.5">&lt; {faoRec.thresholds_used.critical_low}%</span>
                  </div>
                </div>

                {/* Calculation Breakdown Line */}
                <div className="p-3 rounded-xl bg-emerald-900 text-white text-xs font-medium flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Calculator className="w-4 h-4 text-[#f6c86e]" /> Water Formula:
                  </span>
                  <span className="font-mono text-[11px] text-[#f6c86e] font-bold">
                    {faoRec.thresholds_used.daily_water_need_mm} mm (Base) × {faoRec.growth_stage_info.water_multiplier}x ({growthStage}) = {faoRec.amount_mm} mm Total Water
                  </span>
                </div>

              </div>
            )}

            {/* 3. BIGGER WATER DOSAGE & ACTIONABLE SCHEDULE CARDS */}
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Dosage Card */}
              <div className="p-5 rounded-2xl bg-[#eef4ea] border-2 border-emerald-400 space-y-1 shadow-xs">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-emerald-700" /> Water Dosage Required
                </span>
                <span className="font-heading text-3xl font-black text-emerald-950 block pt-1">
                  {faoRec && faoRec.amount_mm > 0 ? `${faoRec.amount_mm} mm` : "0.0 mm"}
                </span>
                <span className="text-xs font-bold text-emerald-800 block pt-0.5">
                  {faoRec && faoRec.amount_mm > 0 ? `(~${Math.round(faoRec.amount_mm * 10)} Liters per m² / ~${Math.round(faoRec.amount_mm * 1.2)} buckets/plant)` : "Soil moisture sufficient"}
                </span>
              </div>

              {/* Schedule Card */}
              <div className="p-5 rounded-2xl bg-white border-2 border-[#19352b]/15 space-y-1 shadow-xs">
                <span className="text-xs font-black uppercase tracking-wider text-[#b77731] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#b77731]" /> Actionable Schedule
                </span>
                <p className="text-sm font-extrabold text-[#19352b] pt-1.5 leading-snug">
                  {faoRec?.schedule ?? "Recheck in 12-24 hours"}
                </p>
                <p className="text-[11px] text-gray-500 font-semibold pt-1">
                  💡 Best time: Early morning before 8 AM or after sunset
                </p>
              </div>

            </div>

            {/* 4. TRANSPARENT DECISION TRAIL */}
            <div className="border-t border-[#19352b]/10 pt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-[#19352b]/60" data-testid="activity-log-label">
                Decision Trail & Step-by-Step Logic
              </p>
              <div className="space-y-2">
                {(faoRec?.reasoning || insights?.activity_log || ["Soil moisture cross-referenced with weather outlook."]).map((entry, index) => (
                  <div key={index} className="flex items-start gap-2.5 text-xs text-[#19352b]/85 font-medium" data-testid={`activity-log-entry-${index}`}>
                    <span className="mt-1.5 size-2 rounded-full bg-[#b77731] shrink-0" />
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </section>

        {/* REPRODUCIBLE SUSTAINABILITY FORMULA MODAL */}
        {showFormulaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" data-testid="formula-modal">
            <div className="bg-[#19352b] text-[#fff8eb] border border-[#f6c86e]/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#f6c86e]" />
                  <h3 className="font-heading text-xl tracking-tight text-white">
                    Published & Reproducible Sustainability Engine
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="p-1 text-white/60 hover:text-white text-lg font-bold"
                  data-testid="close-formula-modal-btn"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="font-bold text-[#f6c86e] block text-sm">Master Formula:</span>
                  <code className="text-[13px] text-emerald-300 font-mono block mt-1">
                    Total Score = 0.40 × Water Efficiency + 0.30 × Resource Use + 0.30 × Crop Health
                  </code>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="font-bold text-emerald-400 block">1. Water Efficiency (40% Weight)</span>
                    <p className="text-white/80 text-[11px] font-mono">
                      Base = min(100, (Recommended / max(Used, 0.1)) × 80)
                    </p>
                    <p className="text-white/60 text-[11px]">
                      +10 for Rainwater Harvesting | +10 for Drip Irrigation (Capped at 100)
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="font-bold text-amber-400 block">2. Resource Use (30% Weight)</span>
                    <p className="text-white/80 text-[11px] font-mono">
                      Base = 50 + Organic (+20) + Crop Rotation (+15) - Chemical Pesticide (-20) - Excess Fertilizer (-15)
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="font-bold text-blue-400 block">3. Crop Health (30% Weight)</span>
                    <p className="text-white/80 text-[11px] font-mono">
                      Base = (Healthy ? 80 : 40) + Preventive Measures (+20) - (Disease Confidence × 30)
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#f6c86e]/10 border border-[#f6c86e]/20 space-y-2">
                  <span className="font-bold text-[#f6c86e] block text-xs">Score Classification Bands:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-bold">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      80 – 100<br/>Excellent
                    </div>
                    <div className="p-2 rounded-lg bg-lime-500/20 text-lime-300 border border-lime-500/30">
                      60 – 79<br/>Good
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      40 – 59<br/>Fair
                    </div>
                    <div className="p-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30">
                      0 – 39<br/>Poor
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#f6c86e] text-[#19352b] font-extrabold text-xs hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  Close Specification
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
