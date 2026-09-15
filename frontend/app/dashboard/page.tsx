"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudRain, CloudSun, MessageCircle, ScanLine, Sparkles, Sprout, Wind, Thermometer } from "lucide-react";
import { apiGet } from "../lib/api";
import type { WeatherResponse } from "../lib/types";

const leafImage = "https://images.unsplash.com/photo-1651339918277-d4cc58d97d69?auto=format&fit=crop&w=1200&q=84";

export default function DashboardPage() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic day brief label (e.g. "TUESDAY FIELD BRIEF")
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
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        
        {/* Top Hero Section */}
        <section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]" data-testid="dashboard-hero">
          <div className="rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] shadow-[0_24px_60px_rgba(25,53,43,.16)] sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[.16em] text-[#f6c86e]">
                <span className="flex items-center gap-2">
                  <Sprout size={15} /> {dayName} FIELD BRIEF
                </span>
                <span className="flex items-center gap-2 text-white/60 font-medium tracking-normal text-xs">
                  <span className="live-dot" /> Live Farm View
                </span>
              </div>
              <h1 className="mt-8 font-heading text-[clamp(2.4rem,4.8vw,4.2rem)] font-medium leading-[.92] tracking-[-0.07em]">
                One calm view of<br />
                <em className="font-serif font-normal italic text-[#f6c86e]">your field.</em>
              </h1>
              <p className="mt-6 max-w-[480px] text-xs leading-6 text-white/70">
                Good decisions begin with a clearer signal. Monitor leaf health, incoming weather and crop advisory in real time.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/detect"
                className="inline-flex items-center gap-2 rounded-full bg-[#b77731] px-6 py-3 text-xs font-bold text-[#fff8eb] shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                data-testid="dashboard-scan-cta"
              >
                <ScanLine size={15} /> Start a fresh scan ↗
              </Link>
            </div>
          </div>

          {/* Right Visual Card */}
          <div 
            className="relative min-h-[360px] overflow-hidden rounded-[32px] bg-cover bg-center shadow-[0_24px_60px_rgba(25,53,43,.16)] flex flex-col justify-end p-7" 
            style={{ backgroundImage: `url(${leafImage})` }}
            data-testid="dashboard-field-visual"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#19352b]/90 via-[#19352b]/20 to-transparent" />
            <div className="relative z-10 rounded-2xl bg-[#fff8eb]/92 p-5 backdrop-blur-md shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731]">Last field note</span>
              <strong className="mt-1 block text-sm tracking-[-.02em] text-[#19352b]">
                Good decisions begin with a clearer signal. Diagnostic ML classifier online.
              </strong>
            </div>
          </div>
        </section>

        {/* 4 Weather Intelligence Cards */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-metrics">
          {/* Card 1: Rain Chance */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/08">
            <CloudRain className="text-[#b77731]" size={18} />
            <span className="mt-5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/45">
              RAIN CHANCE
            </span>
            <strong className="mt-1.5 block font-heading text-3xl tracking-[-.05em] text-[#19352b]">
              {rainProb}%
            </strong>
            <span className="mt-1 block text-xs text-[#19352b]/55">next 24 hours</span>
          </div>

          {/* Card 2: Temperature */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/08">
            <Thermometer className="text-[#b77731]" size={18} />
            <span className="mt-5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/45">
              TEMPERATURE
            </span>
            <strong className="mt-1.5 block font-heading text-3xl tracking-[-.05em] text-[#19352b]">
              {temp}°C
            </strong>
            <span className="mt-1 block text-xs text-[#19352b]/55">live field temp</span>
          </div>

          {/* Card 3: Field Wind */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/08">
            <Wind className="text-[#b77731]" size={18} />
            <span className="mt-5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/45">
              FIELD WIND
            </span>
            <strong className="mt-1.5 block font-heading text-3xl tracking-[-.05em] text-[#19352b]">
              {windSpeed}
            </strong>
            <span className="mt-1 block text-xs text-[#19352b]/55">km/h · Live forecast</span>
          </div>

          {/* Card 4: Humidity */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/08">
            <CloudSun className="text-[#b77731]" size={18} />
            <span className="mt-5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/45">
              HUMIDITY
            </span>
            <strong className="mt-1.5 block font-heading text-3xl tracking-[-.05em] text-[#19352b]">
              {humidity}%
            </strong>
            <span className="mt-1 block text-xs text-[#19352b]/55">relative moisture</span>
          </div>
        </section>

        {/* Bottom Section: Your Next Move & Field Status */}
        <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.1fr]" data-testid="dashboard-actions">
          
          {/* Left Column: Your Next Move */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 sm:p-9 shadow-[0_15px_45px_rgba(25,53,43,.05)] border border-[#19352b]/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#b77731]">
                <Sparkles size={14} /> YOUR NEXT MOVE
              </div>

              <h2 className="mt-3 font-heading text-3xl font-medium tracking-[-.04em] text-[#19352b]">
                Turn context into action.
              </h2>

              <div className="mt-7 space-y-3.5">
                <Link
                  href="/detect"
                  className="group flex items-center justify-between rounded-2xl bg-[#f5f1e8]/70 p-4 border border-[#19352b]/06 transition-all hover:bg-[#f5f1e8] hover:border-[#19352b]/15"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731]">
                      <ScanLine size={18} />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-[#19352b]">Scan a crop leaf</strong>
                      <span className="text-xs text-[#19352b]/55">33-class disease classifier</span>
                    </div>
                  </div>
                  <ArrowUpRight size={17} className="text-[#19352b]/40 group-hover:text-[#b77731] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  href="/recommendation"
                  className="group flex items-center justify-between rounded-2xl bg-[#f5f1e8]/70 p-4 border border-[#19352b]/06 transition-all hover:bg-[#f5f1e8] hover:border-[#19352b]/15"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731]">
                      <Sprout size={18} />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-[#19352b]">Get crop recommendations</strong>
                      <span className="text-xs text-[#19352b]/55">Optimal crop selection for soil & region</span>
                    </div>
                  </div>
                  <ArrowUpRight size={17} className="text-[#19352b]/40 group-hover:text-[#b77731] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <Link
                  href="/assistant"
                  className="group flex items-center justify-between rounded-2xl bg-[#f5f1e8]/70 p-4 border border-[#19352b]/06 transition-all hover:bg-[#f5f1e8] hover:border-[#19352b]/15"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#e9d6b5] text-[#b77731]">
                      <MessageCircle size={18} />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-[#19352b]">Ask the AI field assistant</strong>
                      <span className="text-xs text-[#19352b]/55">Multilingual voice & text assistance</span>
                    </div>
                  </div>
                  <ArrowUpRight size={17} className="text-[#19352b]/40 group-hover:text-[#b77731] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Field Overview */}
          <div className="rounded-[32px] bg-[#d7e2ce] p-7 sm:p-9 shadow-[0_15px_45px_rgba(25,53,43,.05)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#19352b]">
                  <Sprout size={14} /> FIELD STATUS
                </div>
                <span className="rounded-full bg-[#19352b]/10 px-3 py-1 text-[10px] font-bold text-[#19352b]">
                  OPERATIONAL
                </span>
              </div>

              <h2 className="mt-5 font-heading text-3xl font-medium tracking-[-.04em] text-[#19352b]">
                Your field, in rhythm.
              </h2>
              <p className="mt-3 text-xs leading-6 text-[#19352b]/70 max-w-[460px]">
                Real-time disease diagnostics, live weather forecasting, and AI agronomy guidance working together for healthy yield.
              </p>

              {/* 3 Metric Pills */}
              <div className="mt-8 grid grid-cols-3 gap-3.5">
                <div className="rounded-2xl bg-[#fff8eb]/90 p-4 text-center shadow-xs">
                  <strong className="block font-heading text-2xl tracking-[-.03em] text-[#19352b]">
                    {temp}°C
                  </strong>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#19352b]/50">
                    TEMP
                  </span>
                </div>

                <div className="rounded-2xl bg-[#fff8eb]/90 p-4 text-center shadow-xs">
                  <strong className="block font-heading text-2xl tracking-[-.03em] text-[#19352b]">
                    {rainProb}%
                  </strong>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#19352b]/50">
                    RAIN
                  </span>
                </div>

                <div className="rounded-2xl bg-[#fff8eb]/90 p-4 text-center shadow-xs">
                  <strong className="block font-heading text-2xl tracking-[-.03em] text-[#19352b]">
                    {windSpeed}
                  </strong>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#19352b]/50">
                    KM/H WIND
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-[11px] text-[#19352b]/55">
              Live weather intelligence updated continuously.
            </p>
          </div>

        </section>
      </main>
    </div>
  );
}
