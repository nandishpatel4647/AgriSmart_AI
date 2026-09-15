"use client";

import React, { useState, useEffect } from "react";
import { Check, Compass, Info, Leaf, LoaderCircle, RefreshCw, Sparkles, Sprout, CheckCircle2 } from "lucide-react";
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
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="recommendation-kicker">
          <span>03</span> CROP RECOMMENDATION ENGINE
        </div>
        
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_.95fr] lg:items-end">
          <div>
            <h1 className="font-heading text-[clamp(2.8rem,5.5vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-[#19352b]" data-testid="recommendation-heading">
              Scientific crop matching <em className="font-serif font-normal italic text-[#b77731]">for high yields.</em>
            </h1>
            <p className="mt-4 max-w-[600px] text-base sm:text-lg font-semibold text-[#19352b]/80">
              Select your soil, pH, temperature, and season to receive high-yielding, resilient crop species recommendations.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border-2 border-[#19352b]/20 bg-[#fff8eb] px-5 py-3 text-sm font-extrabold text-[#19352b] shadow-sm w-fit lg:justify-self-end">
            <Compass size={18} className="text-[#b77731]" />
            <span>ICAR & FAO Agronomic Data Source</span>
          </div>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* Left Column: Interactive Input Controls */}
          <div className="rounded-[36px] bg-[#fff8eb] p-8 sm:p-10 border-2 border-[#19352b]/15 shadow-md space-y-7">
            <h3 className="font-heading text-2xl font-black tracking-tight text-[#19352b] flex items-center gap-3">
              <Sprout size={24} className="text-[#b77731]" /> Soil & Environment Parameters
            </h3>

            {/* Soil Type */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-3">
                Soil Type
              </label>
              <div className="flex flex-wrap gap-2">
                {["Loamy", "Black", "Red", "Alluvial", "Clay", "Sandy"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSoilType(st)}
                    className={`rounded-full px-5 py-2 text-sm font-extrabold transition-all cursor-pointer border-2 ${
                      soilType === st
                        ? "bg-[#19352b] text-[#fff8eb] border-[#19352b] shadow-sm"
                        : "bg-white text-[#19352b] border-[#19352b]/15 hover:bg-[#19352b]/10"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Soil pH Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-[#19352b]/70">Soil pH Level</label>
                <strong className="text-lg font-black text-[#b77731]">{ph.toFixed(1)} pH</strong>
              </div>
              <input
                type="range"
                min="4.5"
                max="8.5"
                step="0.1"
                value={ph}
                onChange={(e) => setPh(parseFloat(e.target.value))}
                className="range-field"
              />
              <div className="flex justify-between text-xs font-bold text-[#19352b]/60 mt-1">
                <span>Acidic (4.5)</span>
                <span>Neutral (6.5)</span>
                <span>Alkaline (8.5)</span>
              </div>
            </div>

            {/* Season & Previous Crop Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">
                  Cropping Season
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="field-control"
                >
                  <option value="Kharif">Kharif (Monsoon)</option>
                  <option value="Rabi">Rabi (Winter)</option>
                  <option value="Zaid">Zaid (Summer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">
                  Previous Crop
                </label>
                <select
                  value={prevCrop}
                  onChange={(e) => setPrevCrop(e.target.value)}
                  className="field-control"
                >
                  <option value="Legumes">Legumes (Pulse/Beans)</option>
                  <option value="Cereals">Cereals (Wheat/Rice)</option>
                  <option value="Fallow">Fallow / Rested</option>
                  <option value="Solanaceous">Solanaceous (Tomato/Potato)</option>
                </select>
              </div>
            </div>

            {/* Water Availability */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">
                Water Availability
              </label>
              <div className="grid grid-cols-3 gap-3">
                {["Low", "Medium", "High"].map((wa) => (
                  <button
                    key={wa}
                    type="button"
                    onClick={() => setWaterAvail(wa)}
                    className={`rounded-xl py-3 text-sm font-extrabold transition-all cursor-pointer border-2 text-center ${
                      waterAvail === wa
                        ? "bg-[#19352b] text-[#fff8eb] border-[#19352b]"
                        : "bg-white text-[#19352b] border-[#19352b]/15 hover:bg-[#19352b]/10"
                    }`}
                  >
                    {wa}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Recommendations Output Cards */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-black text-[#19352b]">
                Top Recommended Crops
              </h2>
              {loading && <LoaderCircle size={24} className="animate-spin text-[#b77731]" />}
            </div>

            {data?.top_recommendations?.map((rec, i) => (
              <div 
                key={rec.crop} 
                className={`rounded-[32px] p-7 border-3 transition-all shadow-md ${
                  i === 0 
                    ? "bg-[#fff8eb] border-[#b77731]" 
                    : "bg-[#fff8eb]/80 border-[#19352b]/15"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#19352b]/10 pb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#b77731]">
                      {rec.category}
                    </span>
                    <h3 className="text-2xl font-black text-[#19352b] tracking-tight mt-0.5">
                      {rec.crop}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#19352b] px-4 py-1.5 text-sm font-black text-[#f6c86e]">
                      {rec.suitability_pct}% Match
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-base font-bold text-[#19352b]/85 leading-relaxed">
                  {rec.rationale}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#19352b]/10 text-sm font-bold">
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-[#19352b]/60">NPK RATIO</span>
                    <strong className="text-base text-[#19352b]">{rec.npk_ratio}</strong>
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-[#19352b]/60">ESTIMATED YIELD</span>
                    <strong className="text-base text-[#b77731]">{rec.yield_estimate}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </section>
      </main>
    </div>
  );
}
