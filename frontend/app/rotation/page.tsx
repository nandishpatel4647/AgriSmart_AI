"use client";

import React, { useState } from "react";
import { ArrowUpRight, Check, Leaf, LoaderCircle, RefreshCw, Sparkles, Sprout } from "lucide-react";
import { resilientFetch } from "../lib/api";

export default function RotationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    previous_crop: "Corn",
    n: 40,
    p: 40,
    k: 40,
    rainfall: 800,
    region: "North"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ["n", "p", "k", "rainfall"].includes(name) ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await resilientFetch("/api/predict_rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        alert(data.detail || "Prediction failed");
      }
    } catch (err) {
      alert("Failed to reach server");
    }
    setLoading(false);
  };

  return (
    <div className="w-full" data-testid="rotation-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">

        {/* Header Kicker */}
        <div className="section-kicker" data-testid="rotation-kicker">
          <span>07</span> CROP INTELLIGENCE
        </div>

        {/* Heading */}
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="rotation-heading">
              AI crop <em className="font-serif font-normal italic text-[#b77731]">rotation planner.</em>
            </h1>
            <p className="mt-5 max-w-[540px] text-sm leading-6 text-[#19352b]/65">
              Maximize yield and restore soil health. Predicts the most profitable crop to plant next based on historical yields, previous harvest, NPK, and rainfall.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-4 py-2 text-xs font-semibold text-[#19352b]/70 shadow-2xs w-fit">
            <Sparkles size={14} className="text-[#b77731]" />
            <span>Agronomic Succession AI</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Form Card */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 sm:p-9 shadow-[0_15px_45px_rgba(25,53,43,.05)] border border-[#19352b]/10">
            <h2 className="font-heading text-2xl font-bold tracking-[-.03em] text-[#19352b] mb-6">
              Current Field Conditions
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#19352b]/50 mb-2">Previous Crop</label>
                  <select
                    name="previous_crop"
                    value={formData.previous_crop}
                    onChange={handleChange}
                    className="field-control"
                  >
                    <option>Corn</option>
                    <option>Wheat</option>
                    <option>Cotton</option>
                    <option>Soybeans</option>
                    <option>Legumes</option>
                    <option>Peanuts</option>
                    <option>Sugarcane</option>
                    <option>Rice</option>
                    <option>None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#19352b]/50 mb-2">Region</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className="field-control"
                  >
                    <option>North</option>
                    <option>South</option>
                    <option>East</option>
                    <option>West</option>
                    <option>Central</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#19352b]/50 mb-2">Predicted Season Rainfall (mm)</label>
                <input
                  type="number"
                  name="rainfall"
                  value={formData.rainfall}
                  onChange={handleChange}
                  className="field-control"
                />
              </div>

              <div className="pt-4 border-t border-[#19352b]/10">
                <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731] block mb-3">
                  Soil NPK Levels (mg/kg)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#19352b]/60 mb-1">Nitrogen (N)</label>
                    <input type="number" name="n" value={formData.n} onChange={handleChange} className="field-control text-center font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#19352b]/60 mb-1">Phosphorus (P)</label>
                    <input type="number" name="p" value={formData.p} onChange={handleChange} className="field-control text-center font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#19352b]/60 mb-1">Potassium (K)</label>
                    <input type="number" name="k" value={formData.k} onChange={handleChange} className="field-control text-center font-mono" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#b77731] hover:bg-[#a36829] text-[#fff8eb] font-bold py-3.5 text-xs transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="animate-spin" size={16} />
                    <span>Analyzing Agronomic Succession…</span>
                  </>
                ) : (
                  <>
                    <span>Generate AI Recommendation</span>
                    <ArrowUpRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Card */}
          <div className="rounded-[32px] bg-[#19352b] p-7 sm:p-9 text-[#fff8eb] shadow-[0_24px_60px_rgba(25,53,43,.14)] flex flex-col justify-between">
            {!result ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white/08 text-[#f6c86e] mb-4">
                  <Sprout size={26} />
                </span>
                <h3 className="font-heading text-xl text-white font-medium">Awaiting Field Inputs</h3>
                <p className="mt-2 text-xs text-white/50 max-w-[260px]">
                  Fill in your previous crop and soil nutrient values to calculate the optimal next planting cycle.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#f6c86e]">
                      Recommended Crop Strategy
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/80">
                      Succession Model
                    </span>
                  </div>

                  <p className="text-xs text-white/70 mb-6 leading-relaxed">
                    {result.soil_health_context}
                  </p>

                  <div className="space-y-3">
                    {result.recommendations?.map((rec: any, i: number) => (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl border transition-all ${i === 0
                            ? 'bg-[#fff8eb]/15 border-[#f6c86e]/40 shadow-xs'
                            : 'bg-white/05 border-white/10'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center size-8 rounded-full text-xs font-bold ${i === 0 ? 'bg-[#f6c86e] text-[#19352b]' : 'bg-white/15 text-white/70'
                              }`}>
                              #{i + 1}
                            </span>
                            <span className="font-heading text-lg font-bold text-white">
                              {rec.crop}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`font-heading text-2xl font-bold ${i === 0 ? 'text-[#f6c86e]' : 'text-white/60'}`}>
                              {rec.confidence}%
                            </span>
                            <span className="block text-[9px] uppercase tracking-wider text-white/45">Match Score</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-white/50">
                  <Check size={14} className="text-[#f6c86e]" />
                  <span>Calibrated to replenish soil Nitrogen and prevent pathogen carry-over.</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
