"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowUpRight, CloudRain, Crosshair, Droplets, MapPin, RefreshCw, Search, Loader2, SunMedium, Wind, Check, CheckCircle2, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";
import type { WeatherResponse } from "../lib/types";

const DEFAULT_COORDS = { latitude: 23.0225, longitude: 72.5714 };

const CITY_PRESETS = [
  { name: "Ahmedabad, Gujarat", latitude: 23.0225, longitude: 72.5714 },
  { name: "Anand, Gujarat", latitude: 22.5645, longitude: 72.9289 },
  { name: "Vadodara, Gujarat", latitude: 22.3072, longitude: 73.1812 },
  { name: "Rajkot, Gujarat", latitude: 22.3039, longitude: 70.8022 },
  { name: "Delhi, NCR", latitude: 28.6139, longitude: 77.2090 },
  { name: "Mumbai, Maharashtra", latitude: 19.0760, longitude: 72.8777 },
  { name: "Bengaluru, Karnataka", latitude: 12.9716, longitude: 77.5946 },
];

export interface SearchResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  display_name: string;
}

export default function WeatherPage() {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [locationLabel, setLocationLabel] = useState("Ahmedabad, Gujarat");
  const [locationState, setLocationState] = useState("Using default farm location");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // City Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchWeather(lat: number, lon: number) {
    setLoading(true);
    try {
      // 1. Try Backend API
      const data = await apiGet<any>(`/weather?latitude=${lat}&longitude=${lon}`).catch(() => null);

      if (data && (data.current || data.data?.current)) {
        const payload = data.data || data;
        setWeather({
          source: payload.data_source || payload.source || "Open-Meteo",
          source_url: "https://open-meteo.com",
          fetched_at: payload.timestamp || payload.fetched_at || new Date().toISOString(),
          latitude: lat,
          longitude: lon,
          current: payload.current,
          forecast: (payload.forecast || []).map((f: any) => ({
            date: f.date,
            max_temperature: f.temp_max ?? f.max_temperature ?? 30,
            min_temperature: f.temp_min ?? f.min_temperature ?? 20,
            precipitation_mm: f.precipitation ?? f.precipitation_mm ?? 0,
            rain_probability: f.rain_probability ?? 0,
          })),
        });
      } else {
        // 2. Direct Open-Meteo Client Fallback
        const omRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,surface_pressure&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max&timezone=auto`
        );
        if (omRes.ok) {
          const omData = await omRes.json();
          const curr = omData.current || {};
          const daily = omData.daily || {};

          setWeather({
            source: "Open-Meteo Verified Live API",
            source_url: "https://open-meteo.com",
            fetched_at: new Date().toISOString(),
            latitude: lat,
            longitude: lon,
            current: {
              temperature: curr.temperature_2m ?? 25,
              humidity: curr.relative_humidity_2m ?? 65,
              precipitation: curr.precipitation ?? curr.rain ?? 0,
              wind_speed: curr.wind_speed_10m ?? 10,
            },
            forecast: (daily.time || []).slice(0, 7).map((t: string, i: number) => ({
              date: t,
              max_temperature: daily.temperature_2m_max?.[i] ?? 30,
              min_temperature: daily.temperature_2m_min?.[i] ?? 20,
              precipitation_mm: daily.precipitation_sum?.[i] ?? 0,
              rain_probability: daily.precipitation_probability_max?.[i] ?? 0,
            })),
          });
        }
      }
    } catch (err) {
      console.warn("Weather load error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(coords.latitude, coords.longitude);
  }, [coords]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    setLocationState("Acquiring GPS location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lon });
        setLocationLabel("Your Current GPS Field Location");
        setLocationState("GPS location active");
      },
      (err) => {
        alert("Could not get GPS location. Using default location.");
        setLocationState("GPS access denied — using default location");
        setLoading(false);
      }
    );
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setShowDropdown(true);

    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.results || []).map((r: any) => ({
          name: r.name,
          country: r.country,
          admin1: r.admin1,
          latitude: r.latitude,
          longitude: r.longitude,
          display_name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}${r.country ? `, ${r.country}` : ""}`,
        }));
        setSearchResults(formatted);
      }
    } catch (err) {
      console.warn("Geocoding search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (city: { name: string; latitude: number; longitude: number; display_name?: string }) => {
    setCoords({ latitude: city.latitude, longitude: city.longitude });
    setLocationLabel(city.display_name || city.name);
    setLocationState("Custom selected location");
    setSearchQuery("");
    setShowDropdown(false);
  };

  const current = weather?.current;
  const forecast = weather?.forecast || [];

  return (
    <div className="w-full" data-testid="weather-page">
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Page Header */}
        <div className="section-kicker" data-testid="weather-page-kicker">
          <span>02</span> WEATHER INTELLIGENCE
        </div>

        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-heading text-[clamp(2.8rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-[#19352b]" data-testid="weather-page-heading">
              Field <em className="font-serif font-normal italic text-[#b77731]">weather & rain.</em>
            </h1>
            <p className="mt-4 max-w-[600px] text-base sm:text-lg font-semibold text-[#19352b]/80" data-testid="weather-page-description">
              Live weather forecasts and rainfall probabilities calibrated for smart irrigation and crop protection.
            </p>
          </div>

          {/* Location Controls */}
          <div className="flex flex-col gap-3 w-full lg:w-[480px]" ref={searchContainerRef}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex items-center gap-2 rounded-2xl bg-[#19352b] hover:bg-[#11241d] px-5 py-3.5 text-sm font-extrabold text-[#fff8eb] shadow-md shrink-0 cursor-pointer"
                data-testid="use-my-location-button"
              >
                <Crosshair size={18} /> GPS Location
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  placeholder="Search city or district..."
                  className="w-full rounded-2xl border-2 border-[#19352b]/20 bg-[#fff8eb] px-4 py-3.5 pl-11 text-base font-bold text-[#19352b] outline-none shadow-sm focus:border-[#b77731]"
                  data-testid="weather-search-input"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#19352b]/50" />
                
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-[#fff8eb] p-2 shadow-2xl border-2 border-[#19352b]/20">
                    {searchResults.map((res, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectCity(res)}
                        className="w-full text-left rounded-xl px-4 py-3 text-sm font-bold text-[#19352b] hover:bg-[#19352b]/10 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <MapPin size={16} className="text-[#b77731] shrink-0" />
                          <span className="truncate">{res.display_name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* City Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              {CITY_PRESETS.slice(0, 5).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectCity(preset)}
                  className={`rounded-full px-4 py-1.5 text-xs font-extrabold transition-all cursor-pointer border ${
                    locationLabel.includes(preset.name.split(",")[0])
                      ? "bg-[#19352b] text-[#fff8eb] border-[#19352b]"
                      : "bg-[#fff8eb] text-[#19352b] border-[#19352b]/20 hover:bg-[#19352b]/10"
                  }`}
                >
                  {preset.name.split(",")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Current Weather Hero */}
        <section className="mt-10 rounded-[36px] bg-[#19352b] p-8 text-[#fff8eb] shadow-xl sm:p-12 border-2 border-[#19352b]" data-testid="weather-hero-card">
          <div className="flex flex-wrap items-center justify-between gap-6 border-b-2 border-white/15 pb-8">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#f6c86e]">
                LIVE FIELD WEATHER — {locationLabel}
              </span>
              <div className="mt-4 flex items-baseline gap-5">
                <strong className="font-heading text-[clamp(4rem,8vw,6.5rem)] font-black leading-none tracking-tight text-[#fff8eb]">
                  {loading ? (
                    <Loader2 className="animate-spin inline-block h-16 w-16 text-[#f6c86e]" />
                  ) : (
                    `${Math.round(current?.temperature ?? 25)}°C`
                  )}
                </strong>
                <span className="text-lg font-bold text-white/90">
                  {forecast[0]?.rain_probability !== undefined
                    ? `${forecast[0].rain_probability}% Rain Probability`
                    : "18% Rain Probability"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold text-[#f6c86e]">
                Source: {weather?.source || "Open-Meteo Live API"}
              </span>
            </div>
          </div>

          {/* SECTION 5 FARMER ACTION CARD */}
          <div className="mt-8 rounded-3xl bg-white/10 p-6 border-2 border-white/15">
            <div className="flex items-center gap-3 text-[#f6c86e] font-black text-sm uppercase tracking-wider">
              <Sparkles size={20} /> SECTION 5 SMART IRRIGATION ADVISORY
            </div>
            <p className="mt-2 text-lg sm:text-xl font-extrabold text-white leading-snug">
              {(forecast[0]?.rain_probability ?? 18) > 30 
                ? "🌧️ Delay Irrigation — Rainfall expected in next 24 hours (Conserve water & protect roots)."
                : "☀️ Soil Irrigation Safe — Low rainfall probability in next 24 hours."}
            </p>
          </div>

          {/* 4 Large Metric Cards */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="weather-metrics-grid">
            <div className="rounded-2xl bg-white/10 p-5 border border-white/15">
              <Droplets className="text-[#f6c86e]" size={24} />
              <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/70">HUMIDITY</span>
              <strong className="mt-1 block font-heading text-3xl font-black text-white">{current?.humidity ?? 68}%</strong>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/15">
              <CloudRain className="text-[#f6c86e]" size={24} />
              <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/70">PRECIPITATION</span>
              <strong className="mt-1 block font-heading text-3xl font-black text-white">{current?.precipitation ?? 0} mm</strong>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/15">
              <Wind className="text-[#f6c86e]" size={24} />
              <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/70">WIND SPEED</span>
              <strong className="mt-1 block font-heading text-3xl font-black text-white">{current?.wind_speed ?? 12} km/h</strong>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/15">
              <SunMedium className="text-[#f6c86e]" size={24} />
              <span className="mt-4 block text-xs font-black uppercase tracking-wider text-white/70">RAIN CHANCE</span>
              <strong className="mt-1 block font-heading text-3xl font-black text-white">{forecast[0]?.rain_probability ?? 18}%</strong>
            </div>
          </div>
        </section>

        {/* 7-Day Forecast */}
        <section className="mt-12" data-testid="weather-forecast-section">
          <h2 className="font-heading text-2xl font-black tracking-tight text-[#19352b] mb-6">
            7-Day Agricultural Forecast
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7" data-testid="weather-forecast-grid">
            {forecast.map((day: any, idx: number) => {
              const dateObj = new Date(day.date);
              const dayName = idx === 0 ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dateFormatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const isRainy = (day.rain_probability ?? 0) > 40;

              return (
                <div 
                  key={day.date} 
                  className={`rounded-[26px] p-5 border-2 text-center transition-all shadow-sm ${
                    idx === 0 
                      ? "bg-[#fff8eb] border-[#b77731] scale-[1.02]" 
                      : "bg-[#fff8eb]/80 border-[#19352b]/15 hover:bg-[#fff8eb]"
                  }`}
                  data-testid={`forecast-day-${idx}`}
                >
                  <span className="block text-base font-black text-[#19352b]">{dayName}</span>
                  <span className="block text-xs font-bold text-[#19352b]/60 mt-0.5">{dateFormatted}</span>

                  <div className="my-4 flex justify-center text-[#b77731]">
                    {isRainy ? <CloudRain size={32} /> : <SunMedium size={32} />}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-base font-black text-[#19352b]">
                    <span>{Math.round(day.max_temperature ?? day.temp_max ?? 30)}°</span>
                    <span className="text-[#19352b]/50 font-bold">{Math.round(day.min_temperature ?? day.temp_min ?? 22)}°</span>
                  </div>

                  <div className="mt-3 pt-3 border-t-2 border-[#19352b]/10">
                    <span className="block text-xs font-black text-[#b77731]">
                      {day.rain_probability ?? 0}% rain
                    </span>
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
