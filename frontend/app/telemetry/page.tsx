"use client";

import React from "react";
import { Radio, Activity, Thermometer, Wind, Sun, Droplets, Compass } from "lucide-react";

export default function TelemetryPage() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeInUp">
      <div className="glass-card p-6 lg:p-8 green-gradient-bg text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>LoRaWAN / NBIoT Live Node Network</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">IoT Telemetry Monitoring</h1>
        <p className="text-emerald-100 text-sm max-w-xl font-medium mt-1">
          Real-time field sensor readings streaming every 30 seconds from field nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Air Temperature", value: "29.6 °C", status: "Normal", icon: Thermometer },
          { title: "Relative Humidity", value: "56 %", status: "High Fungal Risk", icon: Wind },
          { title: "Soil Moisture TDR", value: "46.8 %", status: "Hydrated", icon: Droplets },
          { title: "Soil pH Level", value: "6.59", status: "Optimal (6.5-7.0)", icon: Activity },
          { title: "Sunlight Intensity", value: "1058 Lux", status: "High Sun", icon: Sun },
          { title: "Wind Direction & Speed", value: "4 km/h SW", status: "Gentle", icon: Compass },
        ].map((sensor, idx) => {
          const Icon = sensor.icon;
          return (
            <div key={idx} className="glass-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="live-dot w-2 h-2" />
                  LIVE
                </span>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800/60 uppercase block">{sensor.title}</span>
                <span className="font-serif text-2xl font-bold text-emerald-950 block mt-1">{sensor.value}</span>
                <span className="text-xs font-semibold text-emerald-600 block mt-1">{sensor.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
