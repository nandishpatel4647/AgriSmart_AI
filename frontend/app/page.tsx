"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, CloudSun, Leaf, ShieldCheck, Sprout } from "lucide-react";

const fieldImage = "https://images.unsplash.com/photo-1638261583636-29872e94bcd1?auto=format&fit=crop&w=1600&q=85";

export default function LandingPage() {
  return (
    <div className="w-full" data-testid="landing-page">
      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]" data-testid="landing-hero">
          <div>
            <span className="section-kicker" data-testid="landing-hero-kicker">
              <span>01</span> Intelligent agriculture
            </span>
            <h1 className="section-heading" data-testid="landing-hero-title">
              Grow with<br />
              <em>clarity.</em>
            </h1>
            <p className="mt-8 max-w-[530px] text-base leading-7 text-[#19352b]/70 sm:text-lg" data-testid="landing-hero-copy">
              Calibrated leaf diagnosis, micro-climate radar and grounded farm intelligence built for calm, fast decisions in the field.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4" data-testid="landing-cta-group">
              <Link 
                href="/detect" 
                className="inline-flex items-center gap-2 rounded-full bg-[#b77731] px-7 py-3.5 text-xs font-bold text-[#fff8eb] shadow-sm transition-transform duration-200 hover:-translate-y-0.5" 
                data-testid="landing-cta-scan"
              >
                Diagnose a leaf <ArrowUpRight size={15} />
              </Link>
              <Link 
                href="/dashboard" 
                className="rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-7 py-3.5 text-xs font-bold text-[#19352b] transition-colors hover:border-[#19352b]/30 shadow-xs" 
                data-testid="landing-cta-dashboard"
              >
                Open dashboard
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-3 border-t border-[#19352b]/10 pt-7 sm:gap-6" data-testid="landing-stats">
              <LandingStat icon={Leaf} value="33" label="Crop conditions" testId="landing-stat-conditions" />
              <LandingStat icon={CloudSun} value="Live" label="Weather radar" testId="landing-stat-radar" />
              <LandingStat icon={ShieldCheck} value="Zero" label="Hallucinations" testId="landing-stat-safety" />
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="relative min-h-[460px] overflow-hidden rounded-[36px] bg-[#19352b] shadow-[0_28px_70px_rgba(25,53,43,.18)]" data-testid="landing-hero-image-card">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${fieldImage})` }} aria-label="Field photograph" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#19352b]/85 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-[#fff8eb]/92 p-5 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731]">Field diagnostic</span>
                  <strong className="mt-1 block text-base tracking-[-.03em] text-[#19352b]">Real-time leaf diagnosis</strong>
                </div>
                <span className="rounded-full bg-[#19352b] px-3 py-1.5 text-[11px] font-bold text-[#f6c86e]">99.7% benchmark</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pillars */}
        <section className="mt-16 grid gap-6 border-t border-[#19352b]/10 pt-16 sm:grid-cols-2 lg:grid-cols-3" data-testid="landing-features">
          <Feature 
            icon={Leaf} 
            number="01" 
            title="Calibrated leaf diagnosis" 
            copy="Fast, verified classification backed by on-device and edge ML. Fails closed with transparent guidance." 
            testId="landing-feature-diagnosis" 
          />
          <Feature 
            icon={CloudSun} 
            number="02" 
            title="Micro-climate radar" 
            copy="Hyper-local temperature, humidity, precipitation and 7-day rainfall probability from verified weather sources." 
            testId="landing-feature-weather" 
          />
          <Feature 
            icon={Sprout} 
            number="03" 
            title="Grounded farmer assistant" 
            copy="Trilingual advisory strictly bounded to your scan, weather and soil context without hallucinations." 
            testId="landing-feature-assistant" 
          />
        </section>
      </main>
    </div>
  );
}

function LandingStat({ icon: Icon, value, label, testId }: { icon: typeof Leaf; value: string; label: string; testId: string }) {
  return (
    <div data-testid={testId}>
      <Icon className="text-[#b77731]" size={16} />
      <strong className="mt-2 block text-xl tracking-[-.04em] text-[#19352b]">{value}</strong>
      <span className="text-[11px] text-[#19352b]/60">{label}</span>
    </div>
  );
}

function Feature({ icon: Icon, number, title, copy, testId }: { icon: typeof Leaf; number: string; title: string; copy: string; testId: string }) {
  return (
    <div className="rounded-[30px] bg-[#fff8eb] p-8 shadow-[0_15px_45px_rgba(25,53,43,.05)]" data-testid={testId}>
      <div className="flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#19352b] text-[#f6c86e]">
          <Icon size={20} />
        </span>
        <span className="font-mono text-xs font-bold text-[#b77731]">{number}</span>
      </div>
      <h3 className="mt-8 font-heading text-xl font-bold tracking-[-.04em] text-[#19352b]">{title}</h3>
      <p className="mt-3 text-xs leading-6 text-[#19352b]/65">{copy}</p>
    </div>
  );
}
