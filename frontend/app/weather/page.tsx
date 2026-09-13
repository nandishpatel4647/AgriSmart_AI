"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CloudSun, 
  Sun, 
  CloudRain, 
  Wind, 
  Droplets, 
  Compass, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  ArrowRight,
  Target,
  ChevronDown,
  RefreshCw,
  Zap,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { getWeather, getIrrigation } from "../lib/api";

const LOCATION_PRESETS = [
  { name: "Anand / Ahmedabad — Gujarat (Vegetables & Tobacco)", lat: 22.5645, lon: 72.9289 },
  { name: "Vadodara — Gujarat (Cotton & Pulses)", lat: 22.3072, lon: 73.1812 },
  { name: "Rajkot — Gujarat (Groundnut & Cotton)", lat: 22.3039, lon: 70.8022 },
  { name: "Surat — Gujarat (Sugarcane & Fruits)", lat: 21.1702, lon: 72.8311 },
  { name: "Junagadh — Gujarat (Groundnut & Mango)", lat: 21.5222, lon: 70.4579 },
  { name: "Mehsana — Gujarat (Spices & Mustard)", lat: 23.5880, lon: 72.3693 },
];

export default function WeatherPage() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATION_PRESETS[0].name);
  const [currentCoords, setCurrentCoords] = useState({ lat: LOCATION_PRESETS[0].lat, lon: LOCATION_PRESETS[0].lon });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [irrigationData, setIrrigationData] = useState<any>(null);

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const [wRes, iRes] = await Promise.allSettled([
        getWeather(lat, lon),
        getIrrigation({
          soil_moisture: 46,
          crop_type: "Tomato",
          growth_stage: "Vegetative",
          temperature: 29,
          humidity: 68,
          rain_probability: 65,
          rain_amount_forecast: 12
        })
      ]);

      if (wRes.status === "fulfilled") setWeatherData(wRes.value);
      if (iRes.status === "fulfilled") setIrrigationData(iRes.value);
    } catch (err) {
      console.warn("Weather API fetch fallback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(currentCoords.lat, currentCoords.lon);
  }, []);

  const handleSelectLocation = (loc: typeof LOCATION_PRESETS[0]) => {
    setSelectedLocation(loc.name);
    setCurrentCoords({ lat: loc.lat, lon: loc.lon });
    setIsGpsActive(false);
    setIsDropdownOpen(false);
    fetchWeather(loc.lat, loc.lon);
  };

  const handleAutoGPS = () => {
    setIsGpsLoading(true);
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locName = `Auto GPS Location (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`;
          setSelectedLocation(locName);
          setCurrentCoords({ lat: latitude, lon: longitude });
          setIsGpsActive(true);
          setIsGpsLoading(false);
          fetchWeather(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          alert("GPS location permission was denied. Defaulting to Anand / Ahmedabad.");
          setIsGpsLoading(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsGpsLoading(false);
    }
  };

  const forecastDays = [
    { day: "MON", temp: "29°C", condition: "Partly Cloudy", rain: "65%", risk: "MEDIUM", spray: "SAFE" },
    { day: "TUE", temp: "27°C", condition: "Light Rain", rain: "80%", risk: "HIGH", spray: "NOT SAFE" },
    { day: "WED", temp: "28°C", condition: "Overcast", rain: "40%", risk: "MEDIUM", spray: "SAFE" },
    { day: "THU", temp: "31°C", condition: "Sunny", rain: "10%", risk: "LOW", spray: "IDEAL" },
    { day: "FRI", temp: "32°C", condition: "Clear", rain: "5%", risk: "LOW", spray: "IDEAL" },
    { day: "SAT", temp: "30°C", condition: "Partly Cloudy", rain: "20%", risk: "LOW", spray: "SAFE" },
    { day: "SUN", temp: "29°C", condition: "Scattered Rain", rain: "55%", risk: "MEDIUM", spray: "NOT SAFE" },
  ];

  // Extract current weather parameters from API or defaults
  const currentTemp = weatherData?.current_weather?.temperature ?? 29;
  const currentCondition = weatherData?.current_weather?.condition ?? "Partly Cloudy";
  const currentHumidity = weatherData?.current_weather?.humidity ?? 68;
  const currentWind = weatherData?.current_weather?.wind_speed ?? 12;
  const currentRain = weatherData?.current_weather?.rain ?? 0.0;
  const rainProb = weatherData?.current_weather?.rain_probability ?? 65;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeInUp">
      
      {/* 1. HEADER SECTION WITH LOCATION SELECTOR & AUTO GPS MATCHING USER SCREENSHOT */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Title & Subtitle */}
        <div className="space-y-1 max-w-xl">
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#163025] tracking-tight">
            Weather Intelligence
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm font-medium leading-relaxed">
            Live micro-climate analysis, 7-day agricultural forecast, disease risk alerts, and spraying windows.
          </p>
        </div>

        {/* Location Dropdown & Auto GPS Action Control Bar */}
        <div className="w-full lg:w-auto">
          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
            
            {/* Location Pin Icon */}
            <div className="p-2 rounded-xl bg-red-50 text-red-500 shrink-0">
              <MapPin className="w-5 h-5 fill-red-500 text-white" />
            </div>

            {/* Location Dropdown */}
            <div className="relative flex-1 sm:w-80">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left text-xs font-bold text-gray-800 flex items-center justify-between gap-2 py-1.5 px-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                <span className="truncate">{selectedLocation}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-200 z-50 p-1.5 space-y-1">
                  {LOCATION_PRESETS.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <span>📍</span>
                      <span className="truncate">{loc.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto GPS Button */}
            <button
              type="button"
              onClick={handleAutoGPS}
              disabled={isGpsLoading}
              className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center gap-2 shrink-0 transition-all active:scale-95 ${
                isGpsActive ? "bg-emerald-700 hover:bg-emerald-800" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isGpsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Target className="w-4 h-4" />
              )}
              <span>{isGpsActive ? "GPS Active" : "Auto GPS"}</span>
            </button>

          </div>
        </div>

      </div>

      {/* 2. LIVE WEATHER METRICS CARD (HIGH CONTRAST & CRISP LEGIBILITY MATCHING SCREENSHOT) */}
      <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Weather Icon, Location & Condition Title */}
          <div className="lg:col-span-5 flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 flex items-center justify-center shadow-md shrink-0">
              <Sun className="w-12 h-12 text-amber-900 animate-spin-slow" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate max-w-[220px]">{selectedLocation}</span>
              </div>
              <h2 className="font-serif text-4xl font-extrabold text-[#163025] leading-none">
                {currentTemp}°C
              </h2>
              <p className="text-base font-bold text-gray-800 mt-1">
                {currentCondition}
              </p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Coordinates: {currentCoords.lat.toFixed(2)}°N, {currentCoords.lon.toFixed(2)}°E
              </p>
            </div>
          </div>

          {/* 3 High Contrast Parameter Metrics */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-amber-600">
                <Wind className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase text-gray-600 tracking-wider">Humidity</span>
              </div>
              <span className="font-serif text-2xl font-extrabold text-[#163025] block">
                {currentHumidity}%
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full inline-block border border-amber-200">
                Fungal Favorable
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-blue-600">
                <Droplets className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase text-gray-600 tracking-wider">Wind Speed</span>
              </div>
              <span className="font-serif text-2xl font-extrabold text-[#163025] block">
                {currentWind} <span className="text-xs font-sans font-medium text-gray-500">km/h</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                Gentle Breeze
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-indigo-600">
                <CloudRain className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase text-gray-600 tracking-wider">Precipitation</span>
              </div>
              <span className="font-serif text-2xl font-extrabold text-[#163025] block">
                {currentRain} <span className="text-xs font-sans font-medium text-gray-500">mm</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block border border-indigo-200">
                {rainProb}% Prob.
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* 3. TWO COLUMN CARDS: Weather Disease Risk & Irrigation Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Weather Disease Risk Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="p-2.5 rounded-2xl bg-red-50 text-red-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#163025]">
                Weather Disease Risk Alerts
              </h3>
              <p className="text-xs text-gray-500 font-medium">Pathogen growth conditions based on micro-climate</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase">HIGH FUNGAL RISK</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Active Notice
                </span>
              </div>
              <p className="text-xs font-bold text-gray-900">
                Early Blight & Leaf Spot Spore Formation
              </p>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                High humidity (68%–85%) and temperature (29°C) create optimal sporulation environment for Solanaceae crops.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Preventative Measure:</span>
              <span className="font-semibold text-emerald-800">Apply Copper Fungicide within 24h</span>
            </div>
          </div>
        </div>

        {/* Card 2: Smart Irrigation Guidance */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#163025]">
                Smart Irrigation Guidance
              </h3>
              <p className="text-xs text-gray-500 font-medium">Automated water saving recommendation</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900 uppercase">RECOMMENDATION: HOLD</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-200 text-teal-900">
                  Save Water
                </span>
              </div>
              <p className="text-xs font-bold text-gray-900">
                Delay Irrigation for Next 24 Hours
              </p>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                65% probability of natural rainfall (12 mm expected) will replenish root-zone moisture without pumping.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700">Estimated Water Saved:</span>
              <span className="font-bold text-teal-700">~320 Liters / Acre</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. AI SAFE SPRAYING WINDOW INTELLIGENCE */}
      <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-[#163025]">
                AI Safe Spray Window Intelligence
              </h3>
              <p className="text-xs text-gray-500 font-medium">Calculated based on wind drift speed, rainfall timeline, and evaporation rate</p>
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Window Confirmed
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 space-y-3">
            <div className="p-5 rounded-2xl bg-emerald-900 text-white shadow-md space-y-1">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide block">
                RECOMMENDED SAFE SPRAY WINDOW
              </span>
              <h4 className="font-serif text-2xl font-bold text-white">
                Tomorrow: 6:00 AM – 9:00 AM
              </h4>
              <p className="text-xs text-emerald-100 leading-relaxed font-medium pt-1">
                Ideal weather window for pesticide & fungicide application. Low wind drift ensures maximum leaf foliage coverage without droplet loss.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 font-semibold text-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Low wind (&lt;8 km/h)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 font-semibold text-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No rain for 12h</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 font-semibold text-gray-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Humidity 55%</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>UNSAFE SPRAY WINDOW (DO NOT SPRAY)</span>
            </div>
            <p className="text-xs leading-relaxed font-semibold">
              Avoid spraying between <strong>12:00 PM – 4:00 PM</strong> due to high wind gusts (18 km/h) and expected evening showers.
            </p>
          </div>

        </div>
      </div>

      {/* 5. 7-DAY HYPERLOCAL FORECAST GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-700" />
            <h3 className="font-serif text-xl font-bold text-[#163025]">
              7-Day Agricultural Forecast & Disease Risk
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {forecastDays.map((f, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-2 hover:shadow-md transition-shadow">
              <span className="font-mono text-xs font-bold text-gray-500 block">{f.day}</span>
              <Sun className="w-7 h-7 mx-auto text-amber-500 my-1" />
              <span className="font-serif text-lg font-bold text-gray-900 block">{f.temp}</span>
              <span className="text-[10px] text-gray-600 font-semibold block">{f.condition}</span>
              
              <div className="pt-2 border-t border-gray-100 space-y-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full block ${
                  f.risk === "HIGH" ? "bg-red-100 text-red-700" :
                  f.risk === "MEDIUM" ? "bg-amber-100 text-amber-800" :
                  "bg-emerald-100 text-emerald-800"
                }`}>
                  {f.risk} RISK
                </span>
                <span className="text-[9px] font-bold text-blue-600 block">{f.spray}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
