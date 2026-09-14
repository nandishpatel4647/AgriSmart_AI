"use client";

import React, { useState, useEffect } from "react";
import { Check, Compass, Info, Leaf, LoaderCircle, RefreshCw, Sparkles, Sprout } from "lucide-react";
import { apiPost } from "../lib/api";

interface CropRecResult {
  crop: string;
  category: string;
  suitability_pct: number;
  rationale: string;
  npk_ratio: string;
  yield_estimate: string;
  key_factors: string[];
}

interface RecResponse {
  success: boolean;
  data_source: string;
  top_recommendations: CropRecResult[];
}

export default function CropRecommendationPage() {
  const [soilType, setSoilType] = useState("Loamy");
  const [ph, setPh] = useState(6.5);
  const [temperature, setTemperature] = useState(28);
  const [humidity, setHumidity] = useState(65);
  const [rainfall, setRainfall] = useState(850);
  const [waterAvail, setWaterAvail] = useState("Medium");
  const [season, setSeason] = useState("Kharif");
  const [prevCrop, setPrevCrop] = useState("Legumes");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecResponse | null>(null);

  async function fetchRecommendation() {
    setLoading(true);
    try {
      const res = await apiPost<RecResponse>("/recommend_crop", {
        soil_type: soilType,
        ph: ph,
        temperature_c: temperature,
        humidity_pct: humidity,
        rainfall_mm: rainfall,
        water_availability: waterAvail,
        season: season,
        previous_crop: prevCrop,
      });
      setData(res);
    } catch (e) {
      console.error("Failed to fetch crop recommendation", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendation();
  }, [soilType, ph, temperature, humidity, rainfall, waterAvail, season, prevCrop]);

  return (
    <div className="w-full" data-testid="crop-recommendation-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="recommendation-kicker">
          <span>BONUS MODULE A</span> CROP RECOMMENDATION ENGINE
        </div>
        
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_.95fr] lg:items-end">
          <div>
            <h1 className="font-heading text-[clamp(2.8rem,5vw,5rem)] font-medium leading-[0.95] tracking-[-0.06em] text-[#19352b]" data-testid="recommendation-heading">
              Scientific crop matching <em className="font-serif font-normal italic text-[#b77731]">for high yields.</em>
            </h1>
            <p className="mt-4 max-w-[520px] text-sm leading-6 text-[#19352b]/65">
              Recommends high-yielding, resilient crop species by evaluating soil chemistry, seasonal climate, water budget, and crop rotation history against ICAR & FAO agronomic benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-5 py-2.5 text-xs font-semibold text-[#19352b]/75 shadow-2xs w-fit lg:justify-self-end">
            <Compass size={16} className="text-[#b77731]" />
            <span>ICAR & FAO Agronomic Standards</span>
          </div>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* Left Column: Interactive Input Controls */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 sm:p-8 border border-[#19352b]/12 shadow-[0_20px_55px_rgba(25,53,43,.06)] space-y-6">
            <h3 className="font-heading text-xl font-bold tracking-[-.02em] text-[#19352b] flex items-center gap-2">
              <Sprout size={20} className="text-[#b77731]" /> Soil & Environment Parameters
            </h3>

            {/* Soil Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60 mb-2">
                Soil Type
              </label>
              <div className="flex flex-wrap gap-2">
                {["Loamy", "Black", "Red", "Alluvial", "Clay", "Sandy"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSoilType(st)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      soilType === st ? "bg-[#19352b] text-[#fff8eb]" : "bg-[#f5f1e8] text-[#19352b]/70 hover:bg-[#e9d6b5]/50"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Soil pH Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60">Soil pH</label>
                <span className="text-xs font-extrabold text-[#b77731]">{ph.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="4.5"
                max="8.5"
                step="0.1"
                value={ph}
                onChange={(e) => setPh(parseFloat(e.target.value))}
                className="w-full accent-[#b77731] cursor-pointer"
              />
            </div>

            {/* Temperature & Humidity Sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60">Temp (°C)</label>
                  <span className="text-xs font-extrabold text-[#19352b]">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="42"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  className="w-full accent-[#19352b] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60">Humidity</label>
                  <span className="text-xs font-extrabold text-[#19352b]">{humidity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={humidity}
                  onChange={(e) => setHumidity(parseInt(e.target.value))}
                  className="w-full accent-[#19352b] cursor-pointer"
                />
              </div>
            </div>

            {/* Season & Water Availability */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60 mb-2">Cropping Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full rounded-2xl border border-[#19352b]/15 bg-[#f5f1e8] px-3.5 py-2 text-xs font-bold text-[#19352b] focus:outline-none"
                >
                  <option value="Kharif">Kharif (Monsoon)</option>
                  <option value="Rabi">Rabi (Winter)</option>
                  <option value="Zaid">Zaid (Summer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60 mb-2">Water Availability</label>
                <select
                  value={waterAvail}
                  onChange={(e) => setWaterAvail(e.target.value)}
                  className="w-full rounded-2xl border border-[#19352b]/15 bg-[#f5f1e8] px-3.5 py-2 text-xs font-bold text-[#19352b] focus:outline-none"
                >
                  <option value="High">High (Abundant/Canal)</option>
                  <option value="Medium">Medium (Borewell/Drip)</option>
                  <option value="Low">Low (Rainfed Only)</option>
                </select>
              </div>
            </div>

            {/* Previous Crop */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[.14em] text-[#19352b]/60 mb-2">Previous Harvested Crop</label>
              <div className="flex flex-wrap gap-2">
                {["Legumes", "Cereals", "Vegetables", "Fallow"].map((pc) => (
                  <button
                    key={pc}
                    type="button"
                    onClick={() => setPrevCrop(pc)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      prevCrop === pc ? "bg-[#b77731] text-white" : "bg-[#f5f1e8] text-[#19352b]/70 hover:bg-[#e9d6b5]/50"
                    }`}
                  >
                    {pc}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Recommendations Output */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-[#19352b]">Top Matched Crops</h2>
              {loading && <LoaderCircle size={18} className="animate-spin text-[#b77731]" />}
            </div>

            {data?.top_recommendations.map((rec, idx) => (
              <div
                key={rec.crop}
                className="rounded-[28px] bg-[#19352b] p-6 sm:p-7 text-[#fff8eb] shadow-[0_20px_50px_rgba(25,53,43,.15)] relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#f6c86e] block mb-1">
                      RANK #{idx + 1} · {rec.category.toUpperCase()}
                    </span>
                    <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#fff8eb] tracking-[-.02em]">
                      {rec.crop}
                    </h3>
                  </div>

                  {/* Suitability Score Pill */}
                  <div className="rounded-full bg-[#f6c86e] px-4 py-1.5 text-xs font-extrabold text-[#19352b] shrink-0">
                    {rec.suitability_pct}% Match
                  </div>
                </div>

                <p className="mt-3 text-xs leading-6 text-white/75">
                  {rec.rationale}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-[#f6c86e] transition-all duration-500"
                    style={{ width: `${rec.suitability_pct}%` }}
                  />
                </div>

                {/* Specs row */}
                <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Target N-P-K Ratio</span>
                    <strong className="text-white font-mono">{rec.npk_ratio}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Est. Yield Potential</span>
                    <strong className="text-[#f6c86e]">{rec.yield_estimate}</strong>
                  </div>
                </div>

                {/* Key matching factors */}
                <div className="mt-4 space-y-1.5 pt-3 border-t border-white/05">
                  {rec.key_factors.map((kf, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-white/80">
                      <Check size={13} className="text-[#f6c86e] shrink-0" />
                      <span>{kf}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-[11px] leading-relaxed text-[#19352b]/55 font-medium px-2">
              * Data source: {data?.data_source || "ICAR / FAO Crop Suitability Guidelines & Soil Science Database"}. Always verify soil test reports before application.
            </p>

          </div>

        </section>
      </main>
    </div>
  );
}
