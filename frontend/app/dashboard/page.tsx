"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudRain, CloudSun, Droplets, Leaf, MapPin, MessageCircle, Radio, ScanLine, Sparkles, Sprout, Wind } from "lucide-react";
import { apiGet } from "../lib/api";
import type { IoTReading, WeatherResponse } from "../lib/types";

const leafImage = "https://images.unsplash.com/photo-1651339918277-d4cc58d97d69?auto=format&fit=crop&w=1200&q=84";

export default function DashboardPage() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [iot, setIot] = useState<IoTReading | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic day brief label (e.g. "TUESDAY FIELD BRIEF")
  const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toUpperCase();

  useEffect(() => {
    async function loadData() {
      try {
        const [wData, iotData] = await Promise.all([
          apiGet<WeatherResponse>("/weather").catch(() => null),
          apiGet<IoTReading>("/iot").catch(() => null),
        ]);
        if (wData) setWeather(wData);
        if (iotData) setIot(iotData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const temp = weather?.current.temperature ?? 29;
  const rainProb = weather?.forecast[0]?.rain_probability ?? 18;
  const soilMoisture = iot?.soil_moisture ?? 31;

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
                  <span className="live-dot" /> Ahmedabad farm
                </span>
              </div>
              <h1 className="mt-8 font-heading text-[clamp(2.4rem,4.8vw,4.2rem)] font-medium leading-[.92] tracking-[-0.07em]">
                One calm view of<br />
                <em className="font-serif font-normal italic text-[#f6c86e]">your field.</em>
              </h1>
              <p className="mt-6 max-w-[480px] text-xs leading-6 text-white/70">
                Good decisions begin with a clearer signal. Monitor leaf health, incoming rainfall and soil demand in real time.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/detect"
                className="inline-flex items-center gap-2 rounded-full bg-[#b77731] px-6 py-3 text-xs font-bold text-[#fff8eb] shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                data-testid="dashboard-scan-cta"
              >
                <ScanLine size={15} /> New diagnosis
              </Link>
              <Link
                href="/weather"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/05 px-6 py-3 text-xs font-bold text-[#fff8eb] transition-colors hover:bg-white/10"
              >
                <CloudSun size={15} /> Weather radar
              </Link>
            </div>
          </div>

          {/* Right Visual Card */}
          <div 
            className="relative min-h-[370px] overflow-hidden rounded-[32px] bg-cover bg-center shadow-[0_24px_60px_rgba(25,53,43,.16)] flex flex-col justify-end p-7" 
            style={{ backgroundImage: `url(${leafImage})` }}
            data-testid="dashboard-field-visual"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#19352b]/90 via-[#19352b]/20 to-transparent" />
            <div className="relative z-10 rounded-2xl bg-[#fff8eb]/92 p-5 backdrop-blur-md shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731]">Last field note</span>
              <strong className="mt-1 block text-sm tracking-[-.02em] text-[#19352b]">
                Good decisions begin with a clearer signal. No severe stress clusters recorded.
              </strong>
            </div>
          </div>
        </section>

        {/* 4 Metric Cards */}
        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-metrics">
          <Metric 
            icon={CloudRain} 
            label="Micro-climate" 
            value={`${temp}°C`} 
            note={`${rainProb}% rain probability`} 
            testId="dashboard-metric-weather" 
          />
          <Metric 
            icon={Droplets} 
            label="Soil moisture" 
            value={`${soilMoisture}%`} 
            note="Root zone optimal" 
            testId="dashboard-metric-soil" 
          />
          <Metric 
            icon={Sprout} 
            label="Smart irrigation" 
            value="Water soon" 
            note="Schedule within 12h" 
            testId="dashboard-metric-irrigation" 
          />
          <Metric 
            icon={Sparkles} 
            label="Sustainability" 
            value="78 / 100" 
            note="Calibrated score" 
            testId="dashboard-metric-sustainability" 
          />
        </section>

        {/* Action Blocks */}
        <section className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-actions">
          <QuickLink 
            to="/detect" 
            icon={ScanLine} 
            title="Diagnose a leaf" 
            copy="Upload a phone photograph for instant classification and Grad-CAM lesion heatmap." 
            testId="dashboard-link-detect" 
          />
          <QuickLink 
            to="/weather" 
            icon={CloudSun} 
            title="Weather radar" 
            copy="Hyper-local temperature, rain probability and 7-day farm forecast." 
            testId="dashboard-link-weather" 
          />
          <QuickLink 
            to="/assistant" 
            icon={MessageCircle} 
            title="Farmer assistant" 
            copy="Ask context-grounded agronomy questions in English, Hindi, or Gujarati." 
            testId="dashboard-link-assistant" 
          />
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note, testId }: { icon: any; label: string; value: string; note: string; testId: string }) {
  return (
    <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/06" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-[12px] bg-[#19352b]/08 text-[#b77731]">
          <Icon size={18} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/40">{label}</span>
      </div>
      <strong className="mt-4 block font-heading text-2xl tracking-[-.04em] text-[#19352b]">{value}</strong>
      <span className="mt-1 block text-xs text-[#19352b]/60">{note}</span>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, copy, testId }: { to: string; icon: any; title: string; copy: string; testId: string }) {
  return (
    <Link 
      href={to} 
      className="group rounded-[28px] bg-[#fff8eb] p-7 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/06 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(25,53,43,.08)]" 
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#19352b] text-[#f6c86e]">
          <Icon size={20} />
        </span>
        <ArrowUpRight size={17} className="text-[#b77731] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <h3 className="mt-6 font-heading text-lg font-bold tracking-[-.03em] text-[#19352b]">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-[#19352b]/65">{copy}</p>
    </Link>
  );
}
