"use client";

import React, { useEffect, useState } from "react";
import { Activity, Compass, Droplets, Radio, RefreshCw, Sun, Thermometer, Wind } from "lucide-react";
import { apiGet } from "../lib/api";

export default function TelemetryPage() {
  const [data, setData] = useState({
    temperature_c: 29.6,
    humidity_pct: 56,
    soil_moisture_pct: 46.8,
    soil_ph: 6.59,
    light_lux: 1058,
    wind_speed_kmh: 4.2,
  });

  useEffect(() => {
    async function fetchSensors() {
      try {
        const res: any = await apiGet("/iot");
        if (res?.reading) {
          setData(res.reading);
        }
      } catch (e) {
        console.error("Using simulated fallback", e);
      }
    }
    fetchSensors();
    const interval = setInterval(fetchSensors, 15000);
    return () => clearInterval(interval);
  }, []);

  const sensors = [
    { title: "Air Temperature", value: `${data.temperature_c} °C`, status: "Optimal crop range", icon: Thermometer },
    { title: "Relative Humidity", value: `${data.humidity_pct} %`, status: "Moderate fungal risk", icon: Wind },
    { title: "Soil Moisture TDR", value: `${data.soil_moisture_pct} %`, status: "Root zone hydrated", icon: Droplets },
    { title: "Soil pH Level", value: `${data.soil_ph}`, status: "Optimal (6.5 – 7.0)", icon: Activity },
    { title: "Sunlight Intensity", value: `${data.light_lux} Lux`, status: "Active photosynthesis", icon: Sun },
    { title: "Field Wind Speed", value: `${data.wind_speed_kmh} km/h`, status: "Gentle breeze", icon: Compass },
  ];

  return (
    <div className="w-full" data-testid="telemetry-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="telemetry-kicker">
          <span>05</span> IOT TELEMETRY
        </div>

        {/* Heading */}
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="telemetry-heading">
              Field telemetry, <em className="font-serif font-normal italic text-[#b77731]">in rhythm.</em>
            </h1>
            <p className="mt-5 max-w-[520px] text-sm leading-6 text-[#19352b]/65">
              Documented LoRaWAN and NBIoT simulated sensor nodes streaming root-zone metrics and atmospheric conditions.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-4 py-2 text-xs font-semibold text-[#19352b]/70 shadow-2xs w-fit">
            <span className="live-dot" />
            <span>Telemetry streaming every 15s</span>
          </div>
        </div>

        {/* Hero Card */}
        <section className="mt-8 rounded-[32px] bg-[#19352b] p-7 sm:p-9 text-[#fff8eb] shadow-[0_24px_60px_rgba(25,53,43,.14)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#f6c86e]">
              <Radio size={14} /> LoRaWAN / NBIoT Node Array
            </div>
            <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-medium tracking-[-.03em] text-[#fff8eb]">
              Micro-plot Soil & Atmospheric Grid
            </h2>
            <p className="mt-2 text-xs text-white/65 max-w-[480px]">
              Hardware emulation layer calibrated to Gujarat agricultural climate profiles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-[#f6c86e]">
              6 Nodes Active
            </span>
            <span className="rounded-full bg-[#b77731] px-4 py-2 text-xs font-bold text-[#fff8eb]">
              Simulated Feed
            </span>
          </div>
        </section>

        {/* 6 Sensor Cards in Emergent Style */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="telemetry-cards-grid">
          {sensors.map((sensor, idx) => {
            const Icon = sensor.icon;
            return (
              <div 
                key={idx} 
                className="rounded-[28px] bg-[#fff8eb] p-7 shadow-[0_12px_40px_rgba(25,53,43,.04)] border border-[#19352b]/08 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1"
                data-testid={`telemetry-card-${idx}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#e9d6b5] text-[#b77731]">
                    <Icon size={20} />
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#d7e2ce] px-3 py-1 text-[10px] font-bold text-[#1f503d]">
                    <span className="live-dot" /> LIVE
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/45 block">
                    {sensor.title}
                  </span>
                  <strong className="mt-1.5 block font-heading text-3xl font-bold tracking-[-.04em] text-[#19352b]">
                    {sensor.value}
                  </strong>
                  <span className="mt-2 block text-xs font-medium text-[#b77731]">
                    {sensor.status}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
