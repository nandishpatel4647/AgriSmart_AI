"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CloudRain, CloudSun, MessageCircle, ScanLine, Sparkles, Sprout, Wind, Thermometer, CheckCircle2 } from "lucide-react";

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
