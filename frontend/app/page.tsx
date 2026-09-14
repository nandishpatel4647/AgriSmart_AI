"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Target, 
  ChevronDown, 
  Sun, 
  Wind, 
  Droplets, 
  CloudRain, 
  Cpu, 
  CheckCircle2, 
  Microscope, 
  CloudSun, 
  Bot,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Award
} from "lucide-react";
import { getWeather, getApiStatus } from "./lib/api";
import { useAuth } from "./lib/auth";

export default function DashboardPage() {
  const { user, isLoggedIn } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState("Anand / Ahmedabad — Gujarat (Vegetables & Tobacco)");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [weather, setWeather] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [wRes, sRes] = await Promise.allSettled([
          getWeather(22.5645, 72.9289),
          getApiStatus()
        ]);
        if (wRes.status === "fulfilled") setWeather(wRes.value);
        if (sRes.status === "fulfilled") setStatus(sRes.value);
      } catch (e) {
        console.warn("Dashboard data fetch:", e);
      }
    }
    loadData();
  }, []);

  const locations = [
    "Anand / Ahmedabad — Gujarat (Vegetables & Tobacco)",
    "Vadodara — Gujarat (Cotton & Pulses)",
    "Rajkot — Gujarat (Groundnut & Cotton)",
    "Surat — Gujarat (Sugarcane & Fruits)",
  ];

  return (
    <div className="w-full">
      
      {/* 1. HIGH-IMPACT LANDING HERO SECTION — FULL 100% SCREEN WIDTH EDGE-TO-EDGE */}
      <div className="w-full bg-[#0d281e] text-white min-h-[540px] flex flex-col justify-between py-10 sm:py-12 lg:py-14 relative overflow-hidden shadow-xl border-b border-emerald-900/20 mb-8">
        
        {/* Background Image Layer covering 100% screen width */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="/hero_farmer_field.jpg" 
            alt="Farmer Field Smart AI" 
            fill 
            priority
            className="object-cover object-center lg:object-[60%_35%]" 
          />
          {/* Rich Dark Gradient Overlay for optimal readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d281e]/95 via-[#12372a]/80 to-[#0d281e]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d281e]/95 via-transparent to-black/40" />
        </div>

        {/* Content Container aligned with max-w-7xl and Navbar padding */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col justify-between h-full space-y-8">
          
          {/* Top Hero Pill */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>SIH 2026 • AI for a Greener India</span>
            </div>

            <span className="hidden sm:inline-flex text-xs font-semibold text-emerald-100/90 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              Technology in every field 🍃
            </span>
          </div>

          {/* Hero Middle Content & Floating Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Headlines & CTA Buttons */}
            <div className="lg:col-span-7 space-y-4">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-md">
                Smarter Farming <br />
                <span className="text-emerald-400 italic">Healthier Tomorrow</span>
              </h1>

              <p className="text-emerald-100/95 text-sm sm:text-base max-w-xl font-medium leading-relaxed drop-shadow-sm">
                AI-powered crop disease detection, weather intelligence, smart irrigation, and expert advice for every farmer.
              </p>

              <div className="pt-3 flex flex-wrap items-center gap-3.5">
                <Link 
                  href="/detect"
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center gap-2 transition-all hover:scale-102 active:scale-98"
                >
                  <span>Start Scan 🍃</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {isLoggedIn ? (
                  <Link
                    href="/my-farm"
                    className="px-6 py-3.5 rounded-2xl bg-white/90 hover:bg-white text-emerald-950 font-bold text-sm shadow-lg backdrop-blur-md flex items-center gap-2 transition-all hover:scale-102"
                  >
                    <span>🌿 My Farm ({user?.name ? user.name.split(" ")[0] : "Farmer"})</span>
                    <ArrowRight className="w-4 h-4 text-emerald-700" />
                  </Link>
                ) : (
                  <button 
                    type="button"
                    onClick={() => alert("AgriSmart AI Demo: Video preview active.")}
                    className="px-6 py-3.5 rounded-2xl bg-white/90 hover:bg-white text-emerald-950 font-bold text-sm shadow-lg backdrop-blur-md flex items-center gap-2.5 transition-all hover:scale-102"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Play className="w-3 h-3 fill-white ml-0.5" />
                    </div>
                    <span>Watch Demo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Floating Interactive AI Widgets overlay matching screenshot */}
            <div className="lg:col-span-5 space-y-3">
              
              {/* Widget 1: Disease Scanner Preview */}
              <Link href="/detect" className="block group">
                <div className="p-4 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-xl border border-white/40 shadow-xl transition-all group-hover:scale-102 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Microscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">INSTANT AI ANALYSIS</span>
                      <h4 className="font-bold text-xs text-gray-900">Detect Disease</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Early Blight
                  </span>
                </div>
              </Link>

              {/* Widget 2: Weather Today */}
              <Link href="/weather" className="block group">
                <div className="p-4 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-xl border border-white/40 shadow-xl transition-all group-hover:scale-102 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CloudSun className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase block">HYPERLOCAL FORECAST</span>
                      <h4 className="font-bold text-xs text-gray-900">Weather Insights</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-gray-900 block">28°C</span>
                    <span className="text-[9px] font-semibold text-blue-600">Rain in 12h</span>
                  </div>
                </div>
              </Link>

              {/* Widget 3: Smart Irrigation */}
              <Link href="/weather" className="block group">
                <div className="p-4 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-xl border border-white/40 shadow-xl transition-all group-hover:scale-102 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">WATER SAVING ENGINE</span>
                      <h4 className="font-bold text-xs text-gray-900">Smart Irrigation</h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                    Delay Irrigation
                  </span>
                </div>
              </Link>

            </div>

          </div>

          {/* Bottom Hero Stats & Vision Banner matching screenshot */}
          <div className="pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            <div className="text-center sm:text-left">
              <span className="font-serif text-2xl font-bold text-white block">10K+</span>
              <span className="text-[11px] text-emerald-200/80 font-medium block">Farmers Supported</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="font-serif text-2xl font-bold text-white block">95%</span>
              <span className="text-[11px] text-emerald-200/80 font-medium block">Detection Accuracy</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="font-serif text-2xl font-bold text-white block">30%</span>
              <span className="text-[11px] text-emerald-200/80 font-medium block">Water Saved</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="font-serif text-2xl font-bold text-white block">Sustainable</span>
              <span className="text-[11px] text-emerald-200/80 font-medium block">Agriculture</span>
            </div>
          </div>

        </div>

      </div>

      {/* LOWER DASHBOARD CONTENT CONTAINER */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-10">

        {/* Vision Quote Banner */}
      <div className="p-4 rounded-2xl bg-emerald-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
            🍃
          </div>
          <p className="text-xs font-semibold italic text-emerald-100">
            &quot;Empowering every farmer with the power of AI for a food-secure and sustainable future.&quot;
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 shrink-0">
          Our Vision
        </span>
      </div>

      {/* 2. LOCATION SELECTOR CARD matching screenshot 1 */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pt-2">
        <div className="space-y-1 max-w-xl">
          <h2 className="font-serif text-3xl font-extrabold text-[#163025] tracking-tight">
            Farm Intelligence Dashboard
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm font-medium">
            Real-time crop telemetry, micro-location weather, and proactive disease prevention.
          </p>
        </div>

        <div className="w-full lg:w-auto">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-500 shrink-0">
              <MapPin className="w-5 h-5 fill-red-500 text-white" />
            </div>

            <div className="relative flex-1 sm:w-80">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left text-xs font-bold text-gray-800 flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-gray-50"
              >
                <span className="truncate">{selectedLocation}</span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-1.5 space-y-1">
                  {locations.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg transition-colors"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedLocation("Anand / Ahmedabad — Gujarat (Auto GPS Active)")}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-98"
            >
              <Target className="w-4 h-4" />
              <span>Auto GPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. THREE QUICK ACTION CARDS matching screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/detect" className="group block">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Microscope className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Detect Disease
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-normal mt-0.5">
                Upload a leaf photo for instant AI diagnosis
              </p>
            </div>
          </div>
        </Link>

        <Link href="/weather" className="group block">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <CloudSun className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Weather Intel
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-normal mt-0.5">
                Micro-location forecast & spraying windows
              </p>
            </div>
          </div>
        </Link>

        <Link href="/assistant" className="group block">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-sans text-base font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                AI Assistant
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-normal mt-0.5">
                Ask farming questions in English, Hindi, Gujarati
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* 4. TWO-COLUMN ROW: Live Weather & Platform Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌤️</span>
                <h3 className="font-serif text-xl font-bold text-[#163025]">
                  Live Weather Conditions
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Target: <strong className="text-gray-800">{selectedLocation}</strong>
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
              No Rain Currently (0.0 mm)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase block">TEMP</span>
              <span className="font-serif text-xl font-bold text-gray-900 block mt-0.5">29°C</span>
              <span className="text-[9px] font-semibold text-emerald-600 block mt-0.5">Partly Cloudy</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <Wind className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase block">HUMIDITY</span>
              <span className="font-serif text-xl font-bold text-gray-900 block mt-0.5">68%</span>
              <span className="text-[9px] font-semibold text-amber-600 block mt-0.5">Fungal favorable</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <Droplets className="w-5 h-5 text-teal-500 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase block">WIND SPEED</span>
              <span className="font-serif text-xl font-bold text-gray-900 block mt-0.5">12 km/h</span>
              <span className="text-[9px] font-semibold text-emerald-600 block mt-0.5">Gentle breeze</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
              <CloudRain className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-400 uppercase block">RAIN PROB.</span>
              <span className="font-serif text-xl font-bold text-gray-900 block mt-0.5">65%</span>
              <span className="text-[9px] font-semibold text-blue-600 block mt-0.5">Rain expected</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="text-lg">⚙️</span>
            <h3 className="font-serif text-xl font-bold text-[#163025]">
              Platform Status
            </h3>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-600">GPU Inference</span>
              <span className="font-bold text-amber-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                CPU Mode
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-600">ML Model</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Loaded (33 Classes)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
              <span className="font-semibold text-gray-600">FastAPI Backend</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                200 OK
              </span>
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
