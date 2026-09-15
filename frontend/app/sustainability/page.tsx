"use client";

import React, { useState, useEffect } from "react";
import { 
  Leaf, 
  Droplets, 
  ShieldCheck, 
  Calculator, 
  Zap, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";
import { getSustainability } from "../lib/api";

interface SustainabilityResult {
  total_score: number;
  band: string;
  band_color: string;
  components: {
    water_efficiency: {
      score: number;
      weight: number;
      factors: string[];
    };
    resource_use: {
      score: number;
      weight: number;
      factors: string[];
    };
    crop_health: {
      score: number;
      weight: number;
      factors: string[];
    };
  };
  suggestions: string[];
}

export default function SustainabilityPage() {
  // All state variables explicitly defined
  const [waterUsed, setWaterUsed] = useState(50.0);
  const [waterRecommended, setWaterRecommended] = useState(60.0);
  const [rainwaterHarvesting, setRainwaterHarvesting] = useState(false);
  const [dripIrrigation, setDripIrrigation] = useState(true);
  
  const [pesticideUsed, setPesticideUsed] = useState(false);
  const [organicMethods, setOrganicMethods] = useState(true);
  const [fertilizerExcess, setFertilizerExcess] = useState(false);
  const [cropRotation, setCropRotation] = useState(true);
  
  const [isHealthy, setIsHealthy] = useState(true);
  const [preventiveMeasures, setPreventiveMeasures] = useState(true);
  const [diseaseDetected, setDiseaseDetected] = useState(false);
  const [diseaseConfidence, setDiseaseConfidence] = useState(0.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SustainabilityResult | null>(null);

  // Compute sustainability score dynamically
  const calculateScore = async () => {
    setLoading(true);
    try {
      const res: any = await getSustainability({
        water_used_liters: waterUsed,
        water_recommended_liters: waterRecommended,
        rainwater_harvested: rainwaterHarvesting,
        drip_irrigation: dripIrrigation,
        pesticide_used: pesticideUsed,
        organic_methods: organicMethods,
        fertilizer_excess: fertilizerExcess,
        crop_rotation: cropRotation,
        is_healthy: isHealthy,
        preventive_measures: preventiveMeasures,
        disease_detected: diseaseDetected,
        disease_confidence: diseaseConfidence,
      });

      if (res && res.sustainability) {
        setResult(res.sustainability);
      }
    } catch (err) {
      console.error("Failed to compute sustainability score:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateScore();
  }, [
    waterUsed,
    waterRecommended,
    rainwaterHarvesting,
    dripIrrigation,
    pesticideUsed,
    organicMethods,
    fertilizerExcess,
    cropRotation,
    isHealthy,
    preventiveMeasures,
    diseaseDetected,
    diseaseConfidence,
  ]);

  const score = result?.total_score ?? 84.0;
  const band = result?.band ?? (score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor");
  const bandColor = result?.band_color ?? (score >= 80 ? "#22c55e" : score >= 60 ? "#84cc16" : score >= 40 ? "#f59e0b" : "#ef4444");

  // Estimated ROI and Savings
  const annualWaterSavedLiters = Math.round((dripIrrigation ? 12000 : 0) + (rainwaterHarvesting ? 8000 : 0) + (waterUsed <= waterRecommended ? 5000 : 0));
  const annualCostSavedINR = Math.round(annualWaterSavedLiters * 0.15 + (organicMethods ? 2500 : 0) + (cropRotation ? 1800 : 0));

  return (
    <div className="w-full" data-testid="sustainability-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="sustainability-kicker">
          <span>🌿 Standalone Feature D Engine</span>
        </div>

        {/* Page Title */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-[#19352b] sm:text-4xl lg:text-5xl" data-testid="sustainability-heading">
              Sustainability Score & Farm Simulator
            </h1>
            <p className="mt-2 text-sm text-[#19352b]/70 sm:text-base max-w-3xl">
              Compute an indicative score from water efficiency (40%), resource use (30%), and crop health (30%).
              All scoring rules and mathematical equations are published and 100% reproducible.
            </p>
          </div>
        </div>

        {/* Top Hero Overview Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Main Score Hero Card */}
          <div className="rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] sm:p-9 shadow-[0_24px_60px_rgba(25,53,43,.14)] flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f6c86e]">
                <Leaf size={16} /> Environmental Sustainability Index
              </div>
              <span 
                className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider border shadow-sm"
                style={{ backgroundColor: `${bandColor}25`, color: bandColor, borderColor: `${bandColor}50` }}
                data-testid="score-band-badge"
              >
                {band} Grade ({score}/100)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
              <div 
                className="relative flex size-36 items-center justify-center rounded-full shrink-0 shadow-lg" 
                style={{ background: `conic-gradient(${bandColor} ${score}%, rgba(255,255,255,.12) 0)` }} 
                data-testid="sustainability-score-ring"
              >
                <div className="flex size-[120px] items-center justify-center rounded-full bg-[#19352b] text-center">
                  <div>
                    <span className="font-heading text-5xl font-black tracking-[-0.07em] text-white" data-testid="sustainability-score-value">
                      {score}
                    </span>
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mt-0.5">out of 100</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-center sm:text-left">
                <h3 className="font-heading text-2xl font-bold tracking-tight text-white">
                  Farm Sustainability Status
                </h3>
                <p className="text-xs leading-relaxed text-white/75 font-medium">
                  {score >= 80 
                    ? "Exceptional environmental stewardship. High water conservation and organic soil protection active."
                    : score >= 60 
                    ? "Good sustainable practices. Minor optimizations in drip irrigation or pest management can boost performance."
                    : score >= 40 
                    ? "Fair sustainability grade. High potential to reduce water pumping costs and chemical input expenses."
                    : "Priority attention needed. Heavy water usage and chemical inputs are degrading overall sustainability."}
                </p>
                <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start text-[11px] font-mono text-[#f6c86e]">
                  <span>• Water: 40%</span>
                  <span>• Resources: 30%</span>
                  <span>• Health: 30%</span>
                </div>
              </div>
            </div>

            {/* Estimated ROI & Cost Savings Banner */}
            <div className="p-4 rounded-2xl bg-white/10 border border-white/10 grid grid-cols-2 gap-4 text-center sm:text-left">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Est. Annual Water Saved</span>
                <span className="font-heading text-xl font-extrabold text-emerald-300 block mt-0.5">
                  {annualWaterSavedLiters.toLocaleString()} Liters
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Est. Input Cost Savings</span>
                <span className="font-heading text-xl font-extrabold text-[#f6c86e] block mt-0.5">
                  ₹{annualCostSavedINR.toLocaleString()} / year
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Farm Practice Simulator */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 shadow-[0_15px_45px_rgba(25,53,43,0.05)] sm:p-9 border-2 border-[#19352b]/20 space-y-6">
            <div className="flex items-center justify-between border-b border-[#19352b]/10 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b77731]">
                <Zap size={16} /> Interactive Farm Simulator
              </div>
              <span className="text-[10px] text-gray-500 font-semibold">Simulate ROI in Real Time</span>
            </div>

            <div className="space-y-4">
              {/* Water Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-[#19352b]">
                  <span>Daily Water Applied: <strong className="text-[#b77731]">{waterUsed} L</strong></span>
                  <span className="text-gray-500 font-medium">(Recommended: {waterRecommended} L)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="5"
                  value={waterUsed}
                  onChange={(e) => setWaterUsed(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg bg-gray-200 accent-[#19352b] cursor-pointer"
                />
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDripIrrigation(!dripIrrigation)}
                  className={`p-3 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                    dripIrrigation 
                      ? "bg-emerald-950 text-emerald-200 border-emerald-800 shadow-xs" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>💧 Drip Irrigation</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20">+10</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRainwaterHarvesting(!rainwaterHarvesting)}
                  className={`p-3 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                    rainwaterHarvesting 
                      ? "bg-emerald-950 text-emerald-200 border-emerald-800 shadow-xs" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>🌧️ Rain Harvesting</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20">+10</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrganicMethods(!organicMethods)}
                  className={`p-3 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                    organicMethods 
                      ? "bg-emerald-950 text-emerald-200 border-emerald-800 shadow-xs" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>🐞 Organic Pest Control</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20">+20</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCropRotation(!cropRotation)}
                  className={`p-3 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                    cropRotation 
                      ? "bg-emerald-950 text-emerald-200 border-emerald-800 shadow-xs" 
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span>🔄 Crop Rotation</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20">+15</span>
                </button>
              </div>

              {/* Chemical Inputs & Disease Penalties */}
              <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pesticideUsed}
                    onChange={(e) => setPesticideUsed(e.target.checked)}
                    className="size-4 rounded border-gray-300 accent-[#19352b]"
                  />
                  <span>Chemical Pesticide (-20)</span>
                </label>

                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fertilizerExcess}
                    onChange={(e) => setFertilizerExcess(e.target.checked)}
                    className="size-4 rounded border-gray-300 accent-[#19352b]"
                  />
                  <span>Excess Fertilizer (-15)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Component Breakdown Cards Grid */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          
          {/* 1. Water Efficiency Card */}
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#19352b]/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-emerald-600" /> Water Efficiency
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">40% Weight</span>
            </div>
            
            <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
              <span className="font-heading text-3xl font-extrabold text-[#19352b]">
                {result?.components.water_efficiency.score ?? 85} <span className="text-sm font-normal text-gray-500">/ 100</span>
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Ratio: {(waterRecommended / Math.max(waterUsed, 0.1)).toFixed(2)}x
              </span>
            </div>

            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              {(result?.components.water_efficiency.factors || [
                `Water ratio: ${(waterRecommended / Math.max(waterUsed, 0.1)).toFixed(2)} (recommended/used)`,
                `Rainwater harvesting: ${rainwaterHarvesting ? "Yes (+10)" : "No"}`,
                `Drip irrigation: ${dripIrrigation ? "Yes (+10)" : "No"}`
              ]).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. Resource Stewardship Card */}
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#19352b]/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#b77731] flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-[#b77731]" /> Resource Use
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">30% Weight</span>
            </div>

            <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
              <span className="font-heading text-3xl font-extrabold text-[#19352b]">
                {result?.components.resource_use.score ?? 85} <span className="text-sm font-normal text-gray-500">/ 100</span>
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Soil Longevity: High
              </span>
            </div>

            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              {(result?.components.resource_use.factors || [
                `Organic methods: ${organicMethods ? "Yes (+20)" : "No"}`,
                `Crop rotation: ${cropRotation ? "Yes (+15)" : "No"}`,
                `Chemical pesticide: ${pesticideUsed ? "Yes (-20)" : "No"}`,
                `Excess fertilizer: ${fertilizerExcess ? "Yes (-15)" : "No"}`
              ]).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[#b77731] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Crop Health Card */}
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#19352b]/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Crop Health
              </span>
              <span className="text-xs font-bold text-gray-500 font-mono">30% Weight</span>
            </div>

            <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
              <span className="font-heading text-3xl font-extrabold text-[#19352b]">
                {result?.components.crop_health.score ?? 100} <span className="text-sm font-normal text-gray-500">/ 100</span>
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Disease Status: Clean
              </span>
            </div>

            <ul className="space-y-2 text-xs text-gray-600 font-medium">
              {(result?.components.crop_health.factors || [
                `Status: ${isHealthy ? "Healthy (base 80)" : "Disease detected (base 40)"}`,
                `Preventive measures: ${preventiveMeasures ? "Yes (+20)" : "No"}`,
                `Disease penalty: None`
              ]).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

        </section>

        {/* PUBLISHED & REPRODUCIBLE FORMULA SECTION */}
        <section className="mt-10 rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] sm:p-9 shadow-xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#f6c86e]">
              <Calculator className="w-5 h-5" /> Published & Reproducible Formula Specification
            </div>
            <span className="text-xs font-mono text-emerald-300">Open Specification (Requirement D)</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed">
            <div className="space-y-3">
              <span className="font-bold text-[#f6c86e] block text-sm">Master Scoring Equation:</span>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-emerald-300 text-xs leading-relaxed">
                {"Total Score = (0.40 × Water Efficiency) + (0.30 × Resource Use) + (0.30 × Crop Health)"}
              </div>

              <span className="font-bold text-white block text-xs pt-2">Sub-Score Mathematical Definitions:</span>
              <ul className="space-y-2 font-mono text-white/80 text-[11px]">
                <li className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-emerald-400">1. Water Efficiency (40% Weight):</strong><br/>
                  {"min(100, (Recommended Water / max(Used Water, 0.1)) × 80) + Rainwater(+10) + Drip(+10)"}
                </li>
                <li className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-amber-400">2. Resource Use (30% Weight):</strong><br/>
                  {"50 + Organic(+20) + Crop Rotation(+15) - Pesticide(-20) - Excess Fertilizer(-15)"}
                </li>
                <li className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-blue-400">3. Crop Health (30% Weight):</strong><br/>
                  {"(Healthy ? 80 : 40) + Preventive Measures(+20) - (Disease Confidence × 30)"}
                </li>
              </ul>
            </div>

            {/* Score Bands & Priority Recommendations */}
            <div className="space-y-4">
              <span className="font-bold text-[#f6c86e] block text-sm">Actionable Priority Recommendations:</span>
              <div className="space-y-3">
                {(result?.suggestions || [
                  "Outstanding sustainable practices — continue maintaining your approach",
                  "Water efficiency is good — maintain current drip lines and schedule",
                  "Document your organic methods for potential sustainability subsidies"
                ]).map((suggestion, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <span className="font-mono text-[#f6c86e] font-extrabold text-sm">0{index + 1}</span>
                    <span className="text-white/85 text-xs leading-relaxed font-medium">{suggestion}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#f6c86e]/10 border border-[#f6c86e]/20 space-y-2 mt-4">
                <span className="font-bold text-[#f6c86e] block text-xs">Reproducible Classification Thresholds:</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    80 – 100<br/>Excellent
                  </div>
                  <div className="p-2 rounded-xl bg-lime-500/20 text-lime-300 border border-lime-500/30">
                    60 – 79<br/>Good
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    40 – 59<br/>Fair
                  </div>
                  <div className="p-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30">
                    0 – 39<br/>Poor
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
