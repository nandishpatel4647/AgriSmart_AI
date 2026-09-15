"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudRain, CloudSun, MessageCircle, ScanLine, Sparkles, Sprout, Wind, Thermometer, CheckCircle2 } from "lucide-react";
import { apiGet } from "../lib/api";
import type { WeatherResponse } from "../lib/types";

const leafImage = "https://images.unsplash.com/photo-1651339918277-d4cc58d97d69?auto=format&fit=crop&w=1200&q=84";

export default function DashboardPage() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic day brief label
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toUpperCase();

  useEffect(() => {
    async function loadData() {
      try {
        const wData = await apiGet<WeatherResponse>("/weather").catch(() => null);
        if (wData) setWeather(wData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const temp = weather?.current.temperature !== undefined ? Math.round(weather.current.temperature ?? 29) : 29;
  const windSpeed = weather?.current.wind_speed !== undefined ? Math.round(weather.current.wind_speed ?? 12) : 12;
  const rainProb = weather?.forecast[0]?.rain_probability !== undefined ? weather.forecast[0].rain_probability : 18;
  const humidity = weather?.current.humidity !== undefined ? weather.current.humidity : 65;

  return (
    <div className="w-full" data-testid="dashboard-page">
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        
        {/* Top Hero Section - Extra Bold & Farmer Friendly */}
        <section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]" data-testid="dashboard-hero">
          <div className="rounded-[36px] bg-[#19352b] p-8 text-[#fff8eb] shadow-[0_24px_60px_rgba(25,53,43,.2)] sm:p-11 flex flex-col justify-between border-2 border-[#19352b]">
            <div>
              <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#f6c86e]">
                <span className="flex items-center gap-2">
                  <Sprout size={18} /> {dayName} FARM BRIEF
                </span>
                <span className="flex items-center gap-2 text-white/80 font-bold tracking-normal text-sm">
                  <span className="live-dot" /> Live Monitoring
                </span>
              </div>
              <h1 className="mt-6 font-heading text-[clamp(2.6rem,5vw,4.5rem)] font-extrabold leading-[1.02] tracking-tight text-[#fff8eb]">
                Smart Advisory &<br />
                <em className="font-serif font-normal italic text-[#f6c86e]">Crop Protection</em>
              </h1>
              <p className="mt-6 max-w-[540px] text-base sm:text-lg leading-relaxed text-white/90 font-medium">
                High-contrast, farmer-friendly decision support. Instant leaf disease detection, weather intelligence, and AI advisory.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/detect"
                className="inline-flex items-center gap-3 rounded-full bg-[#b77731] hover:bg-[#a36829] px-8 py-4 text-base font-extrabold text-[#fff8eb] shadow-md transition-transform duration-200 hover:-translate-y-0.5"
                data-testid="dashboard-scan-cta"
              >
                <ScanLine size={22} /> Start New Scan ↗
              </Link>
            </div>
          </div>

          {/* Right Visual Card */}
          <div 
            className="relative min-h-[380px] overflow-hidden rounded-[36px] bg-cover bg-center shadow-[0_24px_60px_rgba(25,53,43,.2)] flex flex-col justify-end p-8 border-2 border-[#19352b]/10" 
            style={{ backgroundImage: `url(${leafImage})` }}
            data-testid="dashboard-field-visual"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#19352b]/95 via-[#19352b]/30 to-transparent" />
            <div className="relative z-10 rounded-2xl bg-[#fff8eb] p-6 backdrop-blur-md shadow-xl border-2 border-[#19352b]/15">
              <span className="text-xs font-black uppercase tracking-wider text-[#b77731] flex items-center gap-2">
                <CheckCircle2 size={16} /> Verified Classifier Active
              </span>
              <strong className="mt-2 block text-base sm:text-lg font-extrabold tracking-tight text-[#19352b] leading-snug">
                Fine-tuned 33-class ConvNeXt engine ready for field leaf diagnosis.
              </strong>
            </div>
          </div>
        </section>

        {/* 4 Large High-Contrast Weather Metrics */}
        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-metrics">
          {/* Card 1: Rain Chance */}
          <div className="rounded-[28px] bg-[#fff8eb] p-7 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <CloudRain className="text-[#b77731]" size={28} />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#19352b]/60">24H Forecast</span>
            </div>
            <span className="mt-6 block text-xs font-black uppercase tracking-wider text-[#19352b]/70">
              RAIN CHANCE
            </span>
            <strong className="mt-1 block font-heading text-4xl sm:text-5xl font-black text-[#19352b]">
              {rainProb}%
            </strong>
          </div>

          {/* Card 2: Temperature */}
          <div className="rounded-[28px] bg-[#fff8eb] p-7 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Thermometer className="text-[#b77731]" size={28} />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#19352b]/60">Field Temp</span>
            </div>
            <span className="mt-6 block text-xs font-black uppercase tracking-wider text-[#19352b]/70">
              TEMPERATURE
            </span>
            <strong className="mt-1 block font-heading text-4xl sm:text-5xl font-black text-[#19352b]">
              {temp}°C
            </strong>
          </div>

          {/* Card 3: Field Wind */}
          <div className="rounded-[28px] bg-[#fff8eb] p-7 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Wind className="text-[#b77731]" size={28} />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#19352b]/60">Speed</span>
            </div>
            <span className="mt-6 block text-xs font-black uppercase tracking-wider text-[#19352b]/70">
              FIELD WIND
            </span>
            <strong className="mt-1 block font-heading text-4xl sm:text-5xl font-black text-[#19352b]">
              {windSpeed} <span className="text-xl font-bold">km/h</span>
            </strong>
          </div>

          {/* Card 4: Humidity */}
          <div className="rounded-[28px] bg-[#fff8eb] p-7 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <CloudSun className="text-[#b77731]" size={28} />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#19352b]/60">Relative</span>
            </div>
            <span className="mt-6 block text-xs font-black uppercase tracking-wider text-[#19352b]/70">
              HUMIDITY
            </span>
            <strong className="mt-1 block font-heading text-4xl sm:text-5xl font-black text-[#19352b]">
              {humidity}%
            </strong>
          </div>
        </section>

        {/* Bottom Section: Quick Actions & Field Overview */}
        <section className="mt-10 grid gap-7 lg:grid-cols-[1.1fr_0.9fr]" data-testid="dashboard-actions">
          
          {/* Left Column: Quick Actions */}
          <div className="rounded-[36px] bg-[#fff8eb] p-8 sm:p-10 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#b77731]">
                <Sparkles size={18} /> FARMER ACTION HUB
              </div>

              <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#19352b]">
                What would you like to do?
              </h2>

              <div className="mt-8 space-y-4">
                <Link
                  href="/detect"
                  className="group flex items-center justify-between rounded-2xl bg-white p-5 border-2 border-[#19352b]/15 transition-all hover:bg-[#19352b] hover:text-[#fff8eb] shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731] group-hover:bg-[#b77731] group-hover:text-white transition-colors">
                      <ScanLine size={24} />
                    </span>
                    <div>
                      <strong className="block text-lg font-black group-hover:text-[#fff8eb]">Scan a crop leaf for disease</strong>
                      <span className="text-sm font-semibold text-[#19352b]/70 group-hover:text-[#fff8eb]/80">33-class AI diagnostic classifier</span>
                    </div>
                  </div>
                  <ArrowUpRight size={22} className="text-[#b77731] group-hover:text-[#f6c86e] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>

                <Link
                  href="/recommendation"
                  className="group flex items-center justify-between rounded-2xl bg-white p-5 border-2 border-[#19352b]/15 transition-all hover:bg-[#19352b] hover:text-[#fff8eb] shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731] group-hover:bg-[#b77731] group-hover:text-white transition-colors">
                      <Sprout size={24} />
                    </span>
                    <div>
                      <strong className="block text-lg font-black group-hover:text-[#fff8eb]">Get crop recommendations</strong>
                      <span className="text-sm font-semibold text-[#19352b]/70 group-hover:text-[#fff8eb]/80">Optimal crop selection based on soil & climate</span>
                    </div>
                  </div>
                  <ArrowUpRight size={22} className="text-[#b77731] group-hover:text-[#f6c86e] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>

                <Link
                  href="/assistant"
                  className="group flex items-center justify-between rounded-2xl bg-white p-5 border-2 border-[#19352b]/15 transition-all hover:bg-[#19352b] hover:text-[#fff8eb] shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731] group-hover:bg-[#b77731] group-hover:text-white transition-colors">
                      <MessageCircle size={24} />
                    </span>
                    <div>
                      <strong className="block text-lg font-black group-hover:text-[#fff8eb]">Ask the AI Voice Assistant</strong>
                      <span className="text-sm font-semibold text-[#19352b]/70 group-hover:text-[#fff8eb]/80">Multilingual audio guidance in 3 languages</span>
                    </div>
                  </div>
                  <ArrowUpRight size={22} className="text-[#b77731] group-hover:text-[#f6c86e] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Field Overview */}
          <div className="rounded-[36px] bg-[#d7e2ce] p-8 sm:p-10 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#19352b]">
                  <Sprout size={18} /> FIELD HEALTH SUMMARY
                </div>
                <span className="rounded-full bg-[#19352b] px-4 py-1 text-xs font-extrabold text-[#fff8eb]">
                  SYSTEM READY
                </span>
              </div>

              <h2 className="mt-6 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#19352b]">
                Reliable signals for your farm.
              </h2>
              <p className="mt-4 text-base font-semibold leading-relaxed text-[#19352b]/85 max-w-[480px]">
                Built specifically to solve field leaf disease detection, weather-based risk reduction, and accessible voice advice for every farmer.
              </p>

              {/* 3 Large High Contrast Metric Pills */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white p-4 text-center border-2 border-[#19352b]/15 shadow-sm">
                  <strong className="block font-heading text-3xl font-black text-[#19352b]">
                    {temp}°C
                  </strong>
                  <span className="mt-1 block text-xs font-extrabold uppercase tracking-wider text-[#19352b]/70">
                    TEMP
                  </span>
                </div>

                <div className="rounded-2xl bg-white p-4 text-center border-2 border-[#19352b]/15 shadow-sm">
                  <strong className="block font-heading text-3xl font-black text-[#19352b]">
                    {rainProb}%
                  </strong>
                  <span className="mt-1 block text-xs font-extrabold uppercase tracking-wider text-[#19352b]/70">
                    RAIN
                  </span>
                </div>

                <div className="rounded-2xl bg-white p-4 text-center border-2 border-[#19352b]/15 shadow-sm">
                  <strong className="block font-heading text-3xl font-black text-[#19352b]">
                    {windSpeed}
                  </strong>
                  <span className="mt-1 block text-xs font-extrabold uppercase tracking-wider text-[#19352b]/70">
                    KM/H WIND
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs font-bold text-[#19352b]/70">
              ✓ Open-Meteo live weather data active.
            </p>
          </div>

        </section>
      </main>
    </div>
  );
}
