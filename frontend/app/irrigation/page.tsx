"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Droplets, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Waves } from "lucide-react";

export default function IrrigationPage() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeInUp">
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
          <Droplets className="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Precision Irrigation Engine</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">Smart Irrigation Advisor</h1>
        <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
          Automated soil moisture monitoring and evapotranspiration calculation to optimize water usage.
        </p>
      </div>

      <div className="glass-card p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-900/10 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-emerald-950">Field Soil Moisture & Water Saving</h3>
            <p className="text-xs text-emerald-800/70">Telemetry readings from root-depth TDR sensors</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            ~320 Liters Water Saved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-900/5 border border-emerald-900/10 text-center">
            <span className="text-xs font-bold text-emerald-800/60 block uppercase">CURRENT SOIL MOISTURE</span>
            <span className="font-serif text-4xl font-extrabold text-emerald-950 block mt-2">68%</span>
            <span className="text-xs font-semibold text-emerald-600 block mt-1">Optimal Root Hydration</span>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-900/5 border border-emerald-900/10 text-center">
            <span className="text-xs font-bold text-emerald-800/60 block uppercase">24H RAINFALL FORECAST</span>
            <span className="font-serif text-4xl font-extrabold text-emerald-950 block mt-2">12 mm</span>
            <span className="text-xs font-semibold text-blue-600 block mt-1">Expected Tomorrow</span>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-900/5 border border-emerald-900/10 text-center">
            <span className="text-xs font-bold text-emerald-800/60 block uppercase">AI DECISION</span>
            <span className="font-serif text-3xl font-extrabold text-emerald-700 block mt-2">WAIT</span>
            <span className="text-xs font-semibold text-emerald-800 block mt-1">Postpone Watering</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl green-gradient-bg text-white space-y-2">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">🤖 AI IRRIGATION SUMMARY</span>
          <p className="text-xs leading-relaxed font-medium">
            Natural rainfall expected in the next 24 hours will provide sufficient moisture for root depth. Postponing drip irrigation saves energy and prevents waterlogging.
          </p>
        </div>
      </div>
    </div>
  );
}
