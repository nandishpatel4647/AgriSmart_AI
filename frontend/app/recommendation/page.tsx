"use client";

import React, { useState, useEffect } from "react";
import { Check, Compass, Info, Leaf, LoaderCircle, Mic, MicOff, MapPin, Sparkles, Sprout, CheckCircle2 } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import type { WeatherResponse } from "../lib/types";

interface CropRecResult {
  crop: string;
  vernacular_name?: string;
  category: string;
  suitability_pct: number;
  rationale: string;
  npk_ratio: string;
  plain_fertilizer?: string;
  plain_watering?: string;
  image_url?: string;
  yield_estimate: string;
  key_factors: string[];
}

interface RecResponse {
  success: boolean;
  data_source: string;
  evaluation_metric?: string;
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
  const [locationName, setLocationName] = useState("Gujarat / Semi-Arid");
  const [prevCrop, setPrevCrop] = useState("Legumes");

  const [voiceLang, setVoiceLang] = useState("gu-IN");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
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
        location: locationName,
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
  }, [soilType, ph, temperature, humidity, rainfall, waterAvail, season, locationName, prevCrop]);

  // GPS & Live Weather Auto-Fill
  async function autoDetectWeatherAndGPS() {
    setGeoLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const wData = await apiGet<WeatherResponse>(`/weather?latitude=${latitude}&longitude=${longitude}`).catch(() => null);
            if (wData) {
              if (wData.current.temperature !== undefined) setTemperature(Math.round(wData.current.temperature));
              if (wData.current.humidity !== undefined) setHumidity(wData.current.humidity);
              if (wData.current.city_name) setLocationName(wData.current.city_name);
              if (wData.forecast[0]?.rain_probability !== undefined) {
                setRainfall(Math.round(wData.forecast[0].rain_probability * 12)); // estimate rainfall index
              }
            }
            setGeoLoading(false);
          },
          async () => {
            // Fallback to default weather endpoint
            const wData = await apiGet<WeatherResponse>("/weather").catch(() => null);
            if (wData) {
              if (wData.current.temperature !== undefined) setTemperature(Math.round(wData.current.temperature));
              if (wData.current.humidity !== undefined) setHumidity(wData.current.humidity);
              if (wData.current.city_name) setLocationName(wData.current.city_name);
            }
            setGeoLoading(false);
          }
        );
      } else {
        const wData = await apiGet<WeatherResponse>("/weather").catch(() => null);
        if (wData) {
          if (wData.current.temperature !== undefined) setTemperature(Math.round(wData.current.temperature));
          if (wData.current.humidity !== undefined) setHumidity(wData.current.humidity);
        }
        setGeoLoading(false);
      }

      // Auto-set season based on current month
      const month = new Date().getMonth() + 1;
      if (month >= 6 && month <= 10) setSeason("Kharif");
      else if (month >= 11 || month <= 2) setSeason("Rabi");
      else setSeason("Zaid");

    } catch (e) {
      console.warn("GPS Weather auto-fill failed", e);
      setGeoLoading(false);
    }
  }

  // Vernacular Speech Recognition
  function toggleVoiceInput() {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is supported in Chrome or Edge browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLang; // Dynamic spoken language (gu-IN, hi-IN, en-IN)

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);

        const lower = transcript.toLowerCase();
        // Parse Soil
        if (lower.includes("કાળી") || lower.includes("काली") || lower.includes("black")) setSoilType("Black");
        else if (lower.includes("રેતાળ") || lower.includes("बलुई") || lower.includes("sandy")) setSoilType("Sandy");
        else if (lower.includes("કાંપ") || lower.includes("alluvial")) setSoilType("Alluvial");
        else if (lower.includes("રાતી") || lower.includes("लाल") || lower.includes("red")) setSoilType("Red");
        else if (lower.includes("માટી") || lower.includes("clay")) setSoilType("Clay");

        // Parse Water
        if (lower.includes("ઓછું") || lower.includes("कम") || lower.includes("low")) setWaterAvail("Low");
        else if (lower.includes("વધારે") || lower.includes("ज्यादा") || lower.includes("high")) setWaterAvail("High");
        else if (lower.includes("મધ્યમ") || lower.includes("मध्यम") || lower.includes("medium")) setWaterAvail("Medium");

        // Parse Season
        if (lower.includes("ચોમાસું") || lower.includes("बारिश") || lower.includes("kharif")) setSeason("Kharif");
        else if (lower.includes("શિયાળો") || lower.includes("सर्दी") || lower.includes("rabi")) setSeason("Rabi");
        else if (lower.includes("ઉનાળો") || lower.includes("गर्मी") || lower.includes("zaid")) setSeason("Zaid");
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }

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

          <div className="flex flex-wrap items-center gap-3 w-fit lg:justify-self-end">
            <button
              type="button"
              onClick={autoDetectWeatherAndGPS}
              disabled={geoLoading}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#19352b] bg-[#19352b] px-5 py-3 text-sm font-extrabold text-[#fff8eb] shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              {geoLoading ? <LoaderCircle size={18} className="animate-spin text-[#f6c86e]" /> : <MapPin size={18} className="text-[#f6c86e]" />}
              <span>Auto-Detect GPS & Live Weather</span>
            </button>

            <div className="flex items-center gap-2 rounded-full border-2 border-[#19352b]/20 bg-[#fff8eb] px-4 py-3 text-sm font-extrabold text-[#19352b] shadow-sm">
              <Compass size={18} className="text-[#b77731]" />
              <span>ICAR & FAO Standards</span>
            </div>
          </div>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          
          {/* Left Column: Interactive Input Controls & Vernacular Voice */}
          <div className="rounded-[36px] bg-[#fff8eb] p-8 sm:p-10 border-2 border-[#19352b]/15 shadow-md space-y-7">
            <div className="flex items-center justify-between border-b-2 border-[#19352b]/10 pb-4">
              <h3 className="font-heading text-2xl font-black tracking-tight text-[#19352b] flex items-center gap-3">
                <Sprout size={24} className="text-[#b77731]" /> Soil & Environment Parameters
              </h3>

              {/* Vernacular Mic Input Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-full bg-white p-1 border-2 border-[#19352b]/15 text-xs font-black">
                  {[
                    { id: "gu-IN", label: "ગુજરાતી" },
                    { id: "hi-IN", label: "हिन्दी" },
                    { id: "en-US", label: "English" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setVoiceLang(lang.id)}
                      className={`rounded-full px-3 py-1 transition-all cursor-pointer ${
                        voiceLang === lang.id
                          ? "bg-[#19352b] text-[#fff8eb]"
                          : "text-[#19352b]/70 hover:text-[#19352b]"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer border-2 ${
                    isListening
                      ? "bg-red-600 text-white border-red-600 animate-pulse"
                      : "bg-[#b77731] text-white border-[#b77731] hover:bg-[#a36829]"
                  }`}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{isListening ? "Listening..." : "Speak Input"}</span>
                </button>
              </div>
            </div>

            {voiceTranscript && (
              <div className="rounded-2xl bg-amber-50 p-4 border-2 border-amber-200 text-xs font-extrabold text-amber-900 flex items-center gap-3">
                <Mic size={18} className="text-[#b77731] shrink-0" />
                <span>Voice Recognized: <em>"{voiceTranscript}"</em></span>
              </div>
            )}

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
                className="w-full accent-[#b77731] cursor-pointer"
              />
              <div className="flex justify-between text-xs font-bold text-[#19352b]/60 mt-1">
                <span>Acidic (4.5)</span>
                <span>Neutral (6.5)</span>
                <span>Alkaline (8.5)</span>
              </div>
            </div>

            {/* Climate Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#19352b]/70">Temperature</label>
                  <strong className="text-sm font-black text-[#19352b]">{temperature}°C</strong>
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
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[#19352b]/70">Humidity</label>
                  <strong className="text-sm font-black text-[#19352b]">{humidity}%</strong>
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

            {/* Season & Previous Crop Grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#19352b]/70 mb-2">
                  Cropping Season
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#19352b]/15 bg-white px-4 py-3 text-sm font-extrabold text-[#19352b] focus:outline-none"
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
                  className="w-full rounded-2xl border-2 border-[#19352b]/15 bg-white px-4 py-3 text-sm font-extrabold text-[#19352b] focus:outline-none"
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

            {data?.top_recommendations?.map((rec, i) => {
              const isExcellent = rec.suitability_pct >= 85;
              const isModerate = rec.suitability_pct >= 70 && rec.suitability_pct < 85;
              
              return (
                <div 
                  key={rec.crop} 
                  className={`rounded-[32px] p-7 border-3 transition-all shadow-md overflow-hidden ${
                    i === 0 
                      ? "bg-[#fff8eb] border-[#b77731]" 
                      : "bg-[#fff8eb]/80 border-[#19352b]/15"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#19352b]/10 pb-5">
                    
                    {/* Visual Crop Image & Title */}
                    <div className="flex items-center gap-4">
                      {rec.image_url && (
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#19352b]/15 shadow-sm">
                          <img src={rec.image_url} alt={rec.crop} className="size-full object-cover" />
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[#b77731]">
                          {rec.category}
                        </span>
                        <h3 className="text-2xl font-black text-[#19352b] tracking-tight mt-0.5">
                          {rec.crop}
                        </h3>
                        {rec.vernacular_name && (
                          <span className="text-xs font-extrabold text-[#19352b]/70 block mt-0.5">
                            {rec.vernacular_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* High-Contrast Match Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-5 py-2 text-sm font-black shadow-sm ${
                        isExcellent
                          ? "bg-emerald-800 text-white"
                          : isModerate
                          ? "bg-amber-700 text-white"
                          : "bg-orange-800 text-white"
                      }`}>
                        {rec.suitability_pct}% Match — {isExcellent ? "EXCELLENT" : isModerate ? "MODERATE" : "SUBOPTIMAL"}
                      </span>
                    </div>

                  </div>

                  <p className="mt-4 text-base font-bold text-[#19352b]/85 leading-relaxed">
                    {rec.rationale}
                  </p>

                  {/* Plain-Language Actionable Advice Cards */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {/* Fertilizer Bag Advice */}
                    <div className="rounded-2xl bg-white p-4 border-2 border-[#19352b]/12 shadow-xs">
                      <span className="text-xs font-black uppercase tracking-wider text-[#b77731] block mb-1">
                        🧪 Fertilizer Advice (Bags / Acre)
                      </span>
                      <strong className="text-sm font-extrabold text-[#19352b] leading-snug block">
                        {rec.plain_fertilizer || rec.npk_ratio}
                      </strong>
                    </div>

                    {/* Irrigation Frequency */}
                    <div className="rounded-2xl bg-white p-4 border-2 border-[#19352b]/12 shadow-xs">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-800 block mb-1">
                        💧 Irrigation Frequency
                      </span>
                      <strong className="text-sm font-extrabold text-[#19352b] leading-snug block">
                        {rec.plain_watering || "Regular watering schedule"}
                      </strong>
                    </div>
                  </div>

                  {/* Scientific NPK & Yield footer */}
                  <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t-2 border-[#19352b]/10 text-xs font-bold">
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider text-[#19352b]/60">TARGET NPK RATIO</span>
                      <strong className="text-sm text-[#19352b] font-mono">{rec.npk_ratio}</strong>
                    </div>
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wider text-[#19352b]/60">ESTIMATED YIELD</span>
                      <strong className="text-sm text-[#b77731]">{rec.yield_estimate}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </section>
      </main>
    </div>
  );
}
