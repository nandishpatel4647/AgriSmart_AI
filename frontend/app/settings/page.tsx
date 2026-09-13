"use client";

import React from "react";
import { Settings, User, Bell, Globe, Shield, Radio } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeInUp">
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
          <Settings className="w-3.5 h-3.5 text-emerald-400" />
          <span>Platform Settings & Telemetry Gateway</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">System Settings</h1>
        <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
          Manage farm profile, alert thresholds, API endpoints, and IoT node configuration.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="font-serif text-lg font-bold text-emerald-950 border-b border-emerald-900/10 pb-3">
          Farmer & Platform Configuration
        </h3>

        <div className="space-y-4 max-w-xl">
          <div>
            <label className="text-xs font-bold text-emerald-900/80 block mb-1">Farm Owner Name</label>
            <input type="text" defaultValue="Parth Darji" className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/5 border border-emerald-900/10 text-xs font-semibold text-emerald-950" />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-900/80 block mb-1">Location Coordinates</label>
            <input type="text" defaultValue="Anand, Gujarat (22.5645° N, 72.9289° E)" className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/5 border border-emerald-900/10 text-xs font-semibold text-emerald-950" />
          </div>
          <div>
            <label className="text-xs font-bold text-emerald-900/80 block mb-1">FastAPI Backend Endpoint</label>
            <input type="text" defaultValue="http://127.0.0.1:8000" className="w-full px-4 py-2.5 rounded-xl bg-emerald-900/5 border border-emerald-900/10 text-xs font-semibold text-emerald-950" />
          </div>
        </div>
      </div>
    </div>
  );
}
