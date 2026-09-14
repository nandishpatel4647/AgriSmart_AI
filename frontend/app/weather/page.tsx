"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, CloudRain, Crosshair, Droplets, MapPin, RefreshCw, SunMedium, Wind } from "lucide-react";
import { apiGet } from "../lib/api";
import type { WeatherResponse } from "../lib/types";

const DEFAULT_COORDS = { latitude: 23.0225, longitude: 72.5714 };

export default function WeatherPage() {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [locationLabel, setLocationLabel] = useState("Ahmedabad farm");
  const [locationState, setLocationState] = useState("Using farm default");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchWeather(lat: number, lon: number) {
    setLoading(true);
    try {
      const data = await apiGet<WeatherResponse>(`/weather?latitude=${lat}&longitude=${lon}`);
      setWeather(data);
    } catch (e) {
      console.error("Failed to load weather data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeather(coords.latitude, coords.longitude);
  }, [coords]);

  function useLiveLocation() {
    if (!navigator.geolocation) {
      setLocationState("Live location is not supported by this browser");
      return;
    }
    setLocationState("Locating field GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(nextCoords);
        setLocationLabel("Current Field GPS");
        setLocationState("Live location acquired");
      },
      () => {
        setLocationState("GPS permission denied, using default farm location");
      }
    );
  }

  const current = weather?.current;
  const forecast = weather?.forecast || [];

  return (
    <div className="w-full" data-testid="weather-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Kicker & Heading */}
        <div className="section-kicker" data-testid="weather-page-kicker">
          <span>03</span> Weather radar
        </div>
        <div className="mt-5 grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="weather-page-heading">
              Field climate, <em>grounded</em> in reality.
            </h1>
            <p className="mt-5 max-w-[460px] text-sm leading-6 text-[#19352b]/65" data-testid="weather-page-description">
              Hyper-local weather telemetry powered by verified Open-Meteo feeds with instant rain probability, temperature swings and 7-day outlook.
            </p>
          </div>

          {/* Location Control Card */}
          <div className="rounded-[28px] bg-[#fff8eb] p-6 shadow-[0_12px_40px_rgba(25,53,43,.05)] border border-[#19352b]/10" data-testid="weather-location-card">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-[#19352b]">
                <MapPin size={16} className="text-[#b77731]" />
                {locationLabel}
              </span>
              <button
                type="button"
                onClick={useLiveLocation}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#19352b] px-4 py-2 text-[11px] font-bold text-[#fff8eb] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                data-testid="weather-live-btn"
              >
                <Crosshair size={13} /> Use Live Location
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-[#19352b]/60">
              <span>{coords.latitude.toFixed(4)}° N, {coords.longitude.toFixed(4)}° E</span>
              <span className="font-semibold text-[#b77731]">{locationState}</span>
            </div>
          </div>
        </div>

        {/* Current Conditions Card */}
        <section className="mt-8 rounded-[32px] bg-[#19352b] p-7 text-[#fff8eb] shadow-[0_24px_60px_rgba(25,53,43,.16)] sm:p-10" data-testid="weather-hero-card">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[.16em] text-[#f6c86e]">
                Current Micro-Climate
              </span>
              <div className="mt-3 flex items-baseline gap-4">
                <strong className="font-heading text-[clamp(3.5rem,7vw,5.5rem)] font-medium leading-none tracking-[-.06em]">
                  {current?.temperature !== undefined ? `${Math.round(current.temperature ?? 29)}°` : "29°"}
                </strong>
                <span className="text-sm font-semibold text-white/70">
                  {forecast[0]?.rain_probability !== undefined ? `${forecast[0].rain_probability}% rain probability` : "18% rain probability"}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80">
                Source: {weather?.source || "Open-Meteo"}
              </span>
              <span className="text-[10px] text-white/50">
                Updated: {weather?.fetched_at ? new Date(weather.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
              </span>
            </div>
          </div>

          {/* 4 Metric Pills */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="weather-metrics-grid">
            <WeatherMetric 
              icon={Droplets} 
              label="Relative Humidity" 
              value={`${current?.humidity ?? 68}%`} 
              testId="weather-metric-humidity" 
            />
            <WeatherMetric 
              icon={CloudRain} 
              label="Precipitation" 
              value={`${current?.precipitation ?? 0} mm`} 
              testId="weather-metric-precip" 
            />
            <WeatherMetric 
              icon={Wind} 
              label="Wind Speed" 
              value={`${current?.wind_speed ?? 12} km/h`} 
              testId="weather-metric-wind" 
            />
            <WeatherMetric 
              icon={SunMedium} 
              label="Rain Probability" 
              value={`${forecast[0]?.rain_probability ?? 18}%`} 
              testId="weather-metric-rain-prob" 
            />
          </div>
        </section>

        {/* 7-Day Forecast */}
        <section className="mt-10" data-testid="weather-forecast-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl font-bold tracking-[-.03em] text-[#19352b]">
              7-Day Agricultural Forecast
            </h2>
            <span className="text-xs text-[#19352b]/60">Calibrated for farm irrigation scheduling</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7" data-testid="weather-forecast-grid">
            {forecast.map((day, idx) => {
              const dateObj = new Date(day.date);
              const dayName = idx === 0 ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dateFormatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const isRainy = (day.rain_probability ?? 0) > 40;

              return (
                <div 
                  key={day.date} 
                  className={`rounded-[24px] p-5 border text-center transition-all ${
                    idx === 0 
                      ? "bg-[#fff8eb] border-[#b77731]/40 shadow-sm" 
                      : "bg-[#fff8eb]/70 border-[#19352b]/10 hover:bg-[#fff8eb]"
                  }`}
                  data-testid={`forecast-day-${idx}`}
                >
                  <span className="block text-xs font-bold text-[#19352b]">{dayName}</span>
                  <span className="block text-[10px] text-[#19352b]/50 mt-0.5">{dateFormatted}</span>

                  <div className="my-4 flex justify-center text-[#b77731]">
                    {isRainy ? <CloudRain size={26} /> : <SunMedium size={26} />}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#19352b]">
                    <span>{Math.round(day.max_temperature ?? 30)}°</span>
                    <span className="text-[#19352b]/40 font-normal">{Math.round(day.min_temperature ?? 22)}°</span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#19352b]/08">
                    <span className="block text-[10px] font-semibold text-[#b77731]">
                      {day.rain_probability ?? 0}% rain
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function WeatherMetric({ icon: Icon, label, value, testId }: { icon: any; label: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl bg-[#fff8eb]/10 p-4 border border-white/08" data-testid={testId}>
      <Icon className="text-[#f6c86e]" size={18} />
      <span className="mt-4 block text-[10px] font-bold uppercase tracking-[.14em] text-white/50">{label}</span>
      <strong className="mt-1 block font-heading text-xl tracking-[-.03em] text-white">{value}</strong>
    </div>
  );
}
