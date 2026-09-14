"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudSun, Leaf, Shield, ShieldCheck, Sprout } from "lucide-react";

// Multiple high-resolution field and crop images cycling every 3 seconds
const HERO_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1592417817098-8f3d6eb22513?auto=format&fit=crop&w=1200&q=85",
    alt: "Lush Tomato Vines with Ripe Tomatoes",
    note: "The whole picture, before the next move.",
  },
  {
    url: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1200&q=85",
    alt: "Healthy Grape Vineyards",
    note: "Early detection before lesion expansion.",
  },
  {
    url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1200&q=85",
    alt: "Corn Crop Field",
    note: "Root-zone intelligence calibrated to rain.",
  },
  {
    url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=85",
    alt: "Apple Orchard Foliage",
    note: "Transparent signals without guessing.",
  },
];

export default function LandingPage() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Auto-cycle image every 3 seconds as requested
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#f5f1e8] text-[#19352b]" data-testid="landing-page">
      
      {/* Exact Emergent Minimal Landing Header (Screenshot 1) */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12" data-testid="landing-header">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[13px] bg-[#19352b] text-[#f6c86e]">
            <Sprout size={19} />
          </span>
          <span className="font-heading text-[17px] font-bold tracking-[-0.04em]">
            AgriSmart <span className="text-[#b77731]">AI</span>
          </span>
        </Link>

        {/* Center Pill: Made for the next field decision */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-4 py-1.5 text-xs font-semibold text-[#19352b]/70 shadow-2xs">
          <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>Made for the next field decision</span>
        </div>

        {/* Right Action: Open Dashboard */}
        <Link
          href="/dashboard"
          className="rounded-full border border-[#19352b]/25 bg-transparent px-5 py-2 text-xs font-bold text-[#19352b] transition-all hover:bg-[#19352b] hover:text-[#fff8eb] shadow-2xs"
          data-testid="landing-dashboard-btn"
        >
          Open dashboard
        </Link>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
        <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14" data-testid="landing-hero">
          
          {/* Left Column */}
          <div className="flex flex-col justify-center">
            {/* Kicker */}
            <div className="section-kicker mb-6" data-testid="landing-hero-kicker">
              <span>01</span> INTELLIGENT AGRICULTURE
            </div>

            {/* Huge Headline with Lora italic accent */}
            <h1 className="font-heading text-[clamp(3.8rem,7.5vw,7.5rem)] font-medium leading-[0.92] tracking-[-0.075em] text-[#19352b]">
              Grow with<br />
              <em className="font-serif font-normal italic text-[#b77731]">clarity.</em>
            </h1>

            {/* Subtext */}
            <p className="mt-8 max-w-[500px] text-base leading-7 text-[#19352b]/75 sm:text-lg">
              AgriSmart brings disease detection, live weather and water intelligence into one beautiful, honest field companion.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link 
                href="/detect" 
                className="inline-flex items-center gap-2 rounded-full bg-[#b77731] px-8 py-4 text-sm font-bold text-[#fff8eb] shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a36829] cursor-pointer" 
                data-testid="landing-start-scan-btn"
              >
                Start scan <ArrowUpRight size={17} />
              </Link>
              <Link 
                href="/weather" 
                className="text-xs font-bold text-[#19352b] underline decoration-[#19352b]/30 underline-offset-4 hover:decoration-[#b77731] transition-colors"
              >
                See live weather
              </Link>
            </div>

            {/* 3 Pillars Footer matching Screenshot 1 */}
            <div className="mt-14 grid grid-cols-3 gap-4 border-t border-[#19352b]/10 pt-7">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#19352b]">
                  <Shield size={14} className="text-[#b77731]" />
                  <span>Honest</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#19352b]/55 leading-tight">Confidence stays visible</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#19352b]">
                  <CloudSun size={14} className="text-[#b77731]" />
                  <span>Live</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#19352b]/55 leading-tight">Weather from Open-Meteo</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#19352b]">
                  <Leaf size={14} className="text-[#b77731]" />
                  <span>Grounded</span>
                </div>
                <span className="mt-1 block text-[11px] text-[#19352b]/55 leading-tight">Advice from your signals</span>
              </div>
            </div>
          </div>

          {/* Right Column: Massive Image Card with Auto-scroll Carousel */}
          <div className="relative">
            <div className="relative min-h-[540px] sm:min-h-[620px] overflow-hidden rounded-[44px] border-[10px] border-[#fff8eb] shadow-[0_28px_80px_rgba(25,53,43,.18)] bg-[#19352b]">
              
              {/* Carousel Images with 3s Smooth Crossfade */}
              {HERO_IMAGES.map((img, idx) => (
                <div
                  key={img.url}
                  className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                    idx === activeImageIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                  }`}
                  style={{ backgroundImage: `url(${img.url})` }}
                  aria-label={img.alt}
                />
              ))}

              {/* Gradient Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#19352b]/85 via-transparent to-[#19352b]/15" />

              {/* Top-Left Floating Badge (Screenshot 1) */}
              <div className="absolute top-6 left-6 rounded-2xl bg-[#fff8eb]/95 px-5 py-3 shadow-lg backdrop-blur-md border border-[#19352b]/08">
                <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b77731] block">
                  FIELD SIGNAL
                </span>
                <p className="mt-0.5 text-sm font-bold text-[#19352b]">
                  Clearer inputs. <em className="font-serif font-normal italic text-[#b77731]">Better calls.</em>
                </p>
              </div>

              {/* Bottom-Left Overlay Note (Screenshot 1) */}
              <div className="absolute bottom-8 left-8 right-28">
                <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#f6c86e] block mb-1">
                  A NEW KIND OF FIELD NOTE
                </span>
                <h3 className="font-heading text-2xl font-bold tracking-[-.03em] text-[#fff8eb] leading-tight drop-shadow-sm">
                  {HERO_IMAGES[activeImageIndex].note}
                </h3>
              </div>

              {/* Carousel Progress Dots */}
              <div className="absolute bottom-4 left-8 flex items-center gap-1.5">
                {HERO_IMAGES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`size-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeImageIndex ? "w-6 bg-[#f6c86e]" : "bg-white/40"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Bottom-Right Circular Badge (Screenshot 1) */}
              <div className="absolute -bottom-2 -right-2 z-20 flex size-[100px] sm:size-[112px] flex-col items-center justify-center rounded-full bg-[#d7e2ce] p-2 text-center shadow-[0_12px_32px_rgba(25,53,43,.2)] border-4 border-[#f5f1e8]">
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#19352b]/80 leading-tight">
                  OBSERVE<br />UNDERSTAND<br />ACT
                </span>
                <span className="mt-1 text-[#b77731] font-bold text-xs">❇</span>
              </div>
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
