"use client";

import React from "react";
import { BarChart3, TrendingUp, ShieldCheck, Award, Layers } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeInUp">
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Historical Analytics & Sustainability Intelligence</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">Farm Analytics & Metrics</h1>
        <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
          Track crop health progress, disease occurrence history, and water saving efficiency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6">
          <span className="text-xs font-bold text-emerald-800/60 uppercase block">CROP HEALTH INDEX</span>
          <span className="font-serif text-3xl font-extrabold text-emerald-950 block mt-2">92.4%</span>
          <span className="text-xs font-semibold text-emerald-600 block mt-1">+6.2% from last season</span>
        </div>
        <div className="glass-card p-6">
          <span className="text-xs font-bold text-emerald-800/60 uppercase block">PREVENTED OUTBREAKS</span>
          <span className="font-serif text-3xl font-extrabold text-emerald-950 block mt-2">14 Fields</span>
          <span className="text-xs font-semibold text-emerald-600 block mt-1">Early warning interventions</span>
        </div>
        <div className="glass-card p-6">
          <span className="text-xs font-bold text-emerald-800/60 uppercase block">WATER SAVING RATIO</span>
          <span className="font-serif text-3xl font-extrabold text-emerald-950 block mt-2">32%</span>
          <span className="text-xs font-semibold text-emerald-600 block mt-1">1,280 Liters total saved</span>
        </div>
      </div>
    </div>
  );
}
