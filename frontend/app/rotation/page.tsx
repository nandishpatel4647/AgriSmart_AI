"use client";

import React, { useState } from "react";
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
      const res = await resilientFetch("/api/recommend_crop", {
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
    <div className="min-h-screen bg-black text-white p-6 md:p-12 max-w-7xl mx-auto pt-24">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-emerald-400 mb-2">AI Crop Rotation Planner</h1>
        <p className="text-zinc-400 text-lg">
          Maximize yield and restore soil health. Our Machine Learning model predicts the most profitable crop to plant next based on historical yields, your previous harvest, current soil NPK, and regional climate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form */}
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-6">Current Field Conditions</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Previous Crop</label>
                <select 
                  name="previous_crop" 
                  value={formData.previous_crop}
                  onChange={handleChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
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
                <label className="block text-sm text-zinc-400 mb-2">Region</label>
                <select 
                  name="region" 
                  value={formData.region}
                  onChange={handleChange}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
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
              <label className="block text-sm text-zinc-400 mb-2">Predicted Season Rainfall (mm)</label>
              <input 
                type="number" 
                name="rainfall" 
                value={formData.rainfall}
                onChange={handleChange}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-emerald-400 mb-4">Soil NPK Levels (mg/kg)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nitrogen (N)</label>
                  <input type="number" name="n" value={formData.n} onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phosphorus (P)</label>
                  <input type="number" name="p" value={formData.p} onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Potassium (K)</label>
                  <input type="number" name="k" value={formData.k} onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white" />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl transition mt-4 disabled:opacity-50"
            >
              {loading ? "Analyzing Models..." : "Generate AI Recommendation"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-8 relative overflow-hidden">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <div className="w-24 h-24 mb-4 opacity-20 border-4 border-dashed border-zinc-500 rounded-full animate-spin-slow"></div>
              <p>Awaiting inputs for prediction</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <h2 className="text-xl font-semibold mb-2">Recommended Strategy</h2>
              <p className="text-sm text-emerald-400 mb-8">{result.soil_health_context}</p>
              
              <div className="space-y-4 flex-1">
                {result.recommendations.map((rec: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${i === 0 ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                          #{i + 1}
                        </span>
                        <span className={`text-xl font-medium ${i === 0 ? 'text-white' : 'text-zinc-300'}`}>
                          {rec.crop}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${i === 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {rec.confidence}%
                        </div>
                        <div className="text-xs text-zinc-500">Match Score</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
