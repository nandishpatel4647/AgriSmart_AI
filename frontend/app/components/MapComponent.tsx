"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { resilientFetch } from "../lib/api";

// Fix leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function calculatePolygonArea(latlngs: any[]): { acres: number; hectares: number; sqMeters: number } {
  if (!latlngs || latlngs.length < 3) return { acres: 0, hectares: 0, sqMeters: 0 };
  const R = 6378137; // Earth radius in meters
  let area = 0;
  const coords = latlngs.map((p) => ({
    lat: (p.lat ?? p[0]) * (Math.PI / 180),
    lng: (p.lng ?? p[1]) * (Math.PI / 180),
  }));

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += (coords[j].lng - coords[i].lng) * (2 + Math.sin(coords[i].lat) + Math.sin(coords[j].lat));
  }
  area = Math.abs((area * R * R) / 2.0);

  const acres = area * 0.000247105;
  const hectares = area * 0.0001;
  return {
    sqMeters: Math.round(area),
    acres: Number(acres.toFixed(2)),
    hectares: Number(hectares.toFixed(2)),
  };
}

function MapEvents({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
  });
  return null;
}

export default function MapComponent() {
  const [points, setPoints] = useState<L.LatLngExpression[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [farmName, setFarmName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [indexMode, setIndexMode] = useState<"NDVI" | "NDWI" | "NDRE">("NDVI");

  useEffect(() => {
    fetchFarms();
    fetchAlerts();
  }, []);

  const fetchFarms = async () => {
    try {
      const res = await resilientFetch("/api/farms");
      const data = await res.json();
      if (data.success) {
        setFarms(data.farms);
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const fetchAlerts = async () => {
    try {
      const res = await resilientFetch("/api/alerts");
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFarm = async (farmId: number) => {
    if (!confirm("Are you sure you want to delete this mapped field?")) return;
    try {
      const res = await resilientFetch(`/api/farms/${farmId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchFarms();
        fetchAlerts();
      }
    } catch (e) {
      alert("Failed to delete farm.");
    }
  };

  const exportGeoJSON = () => {
    if (farms.length === 0) return alert("No mapped fields to export.");
    const featureCollection = {
      type: "FeatureCollection",
      features: farms.map((f) => ({
        type: "Feature",
        properties: { name: f.name, created_at: f.created_at, id: f.id },
        geometry: f.geojson,
      })),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(featureCollection, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AgriSmart_Farm_Fields_${new Date().toISOString().split("T")[0]}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    setPoints([...points, e.latlng]);
  };

  const clearDrawing = () => {
    setPoints([]);
  };

  const saveFarm = async () => {
    if (points.length < 3) return alert("Please draw at least 3 points to form a field.");
    if (!farmName) return alert("Please enter a farm name.");

    setIsSaving(true);
    
    // Create GeoJSON Polygon
    const coordinates = [...points, points[0]].map((p: any) => [p.lng, p.lat]);
    const geojson = {
      type: "Polygon",
      coordinates: [coordinates]
    };

    try {
      const res = await resilientFetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: farmName, geojson: JSON.stringify(geojson) }),
      });
      const data = await res.json();
      if (data.success) {
        setFarmName("");
        setPoints([]);
        fetchFarms();
      }
    } catch (e) {
      alert("Failed to save farm.");
    }
    setIsSaving(false);
  };

  // Real-time active drawing area
  const drawingArea = points.length >= 3 ? calculatePolygonArea(points as any[]) : { acres: 0, hectares: 0 };

  // Total acreage mapped
  const totalAcres = farms.reduce((sum, f) => {
    const latlngs = f.geojson.coordinates[0].map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));
    return sum + calculatePolygonArea(latlngs).acres;
  }, 0).toFixed(2);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Analytics Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg text-2xl">📐</div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Total Mapped Area</div>
            <div className="text-2xl font-bold text-emerald-400">{totalAcres} <span className="text-sm font-normal text-zinc-400">Acres</span></div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg text-2xl">🗺️</div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Registered Fields</div>
            <div className="text-2xl font-bold text-white">{farms.length} <span className="text-sm font-normal text-zinc-400">Plots</span></div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-2xl">🚨</div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Active Stress Alerts</div>
            <div className="text-2xl font-bold text-red-400">{alerts.length}</div>
          </div>
        </div>

        <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-lg text-2xl">📡</div>
          <div>
            <div className="text-xs text-zinc-400 font-medium">Satellite Health Index</div>
            <div className="text-2xl font-bold text-teal-400">{indexMode} <span className="text-xs text-zinc-400 font-normal">Active</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[720px]">
        <div className="md:col-span-3 h-full rounded-2xl overflow-hidden border border-emerald-500/20 shadow-xl relative">
          
          {/* Layer Index Switcher Bar */}
          <div className="absolute top-4 left-4 z-[400] bg-zinc-900/90 backdrop-blur border border-emerald-500/30 p-1.5 rounded-xl shadow-lg flex gap-1">
            <button
              onClick={() => setIndexMode("NDVI")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${indexMode === "NDVI" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              NDVI (Canopy)
            </button>
            <button
              onClick={() => setIndexMode("NDWI")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${indexMode === "NDWI" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              NDWI (Moisture)
            </button>
            <button
              onClick={() => setIndexMode("NDRE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${indexMode === "NDRE" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              NDRE (Nitrogen)
            </button>
          </div>

          {/* Export GeoJSON Button */}
          <div className="absolute bottom-4 left-4 z-[400]">
            <button
              onClick={exportGeoJSON}
              className="bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur border border-emerald-500/40 text-emerald-400 px-3 py-2 rounded-xl text-xs font-medium shadow-lg transition flex items-center gap-2"
            >
              <span>📥</span> Export GeoJSON
            </button>
          </div>

          <MapContainer center={[22.5, 72.9]} zoom={8} className="w-full h-full">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri World Imagery"
            />
            <MapEvents onMapClick={handleMapClick} />
            
            {/* Currently drawing polygon */}
            {points.length > 0 && (
              <Polygon positions={points} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.35 }} />
            )}

            {/* Saved Farms */}
            {farms.map((farm) => {
              const latlngs = farm.geojson.coordinates[0].map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));
              const areaInfo = calculatePolygonArea(latlngs);
              
              // Dynamic fill color based on spectral index mode
              const strokeColor = indexMode === "NDVI" ? "#10b981" : indexMode === "NDWI" ? "#3b82f6" : "#a855f7";
              
              return (
                <Polygon 
                  key={farm.id} 
                  positions={latlngs.map((p: { lat: number; lng: number }) => [p.lat, p.lng])} 
                  pathOptions={{ color: strokeColor, fillColor: strokeColor, fillOpacity: 0.4 }}
                >
                  <Popup>
                    <div className="p-1 max-w-xs">
                      <h4 className="font-bold text-emerald-600 text-sm mb-1">{farm.name}</h4>
                      <div className="text-xs text-gray-700 space-y-1 mb-3">
                        <p><strong>Area:</strong> {areaInfo.acres} Acres ({areaInfo.hectares} Ha)</p>
                        <p><strong>Mapped Date:</strong> {new Date(farm.created_at).toLocaleDateString()}</p>
                        <p><strong>Active Index:</strong> {indexMode}</p>
                      </div>
                      <button
                        onClick={() => deleteFarm(farm.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded transition"
                      >
                        Delete Field
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
          </MapContainer>
          
          {/* Drawing Controls Overlay */}
          <div className="absolute top-4 right-4 z-[400] bg-zinc-900/90 backdrop-blur border border-emerald-500/30 p-4 rounded-xl shadow-lg w-80">
            <h3 className="text-emerald-400 font-medium mb-1">Map New Field</h3>
            <p className="text-xs text-zinc-400 mb-3">Click on the satellite map to mark field corners.</p>
            
            {points.length > 0 && (
              <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-2.5 mb-3 text-xs flex justify-between items-center text-zinc-300">
                <span>Points Marked: <strong className="text-emerald-400">{points.length}</strong></span>
                {points.length >= 3 && (
                  <span>Size: <strong className="text-emerald-400">{drawingArea.acres} Acres</strong> ({drawingArea.hectares} Ha)</span>
                )}
              </div>
            )}

            <input 
              type="text" 
              placeholder="Farm Name (e.g. North Plot)" 
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-sm text-white mb-3 focus:outline-none focus:border-emerald-500"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
            />
            
            <div className="flex gap-2">
              <button 
                onClick={clearDrawing}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-xs font-medium transition"
              >
                Clear
              </button>
              <button 
                onClick={saveFarm}
                disabled={isSaving || points.length < 3 || !farmName}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Field"}
              </button>
            </div>
          </div>
        </div>
        
        {/* Alert Sidebar */}
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5 overflow-y-auto flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-emerald-400 mb-2 flex items-center gap-2">
              <span>🚨</span> Crop Stress Alerts
            </h2>
            <p className="text-xs text-zinc-400 mb-4">AI engine continuously scans satellite indices for stress indicators.</p>
            
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center p-4 bg-zinc-800/40 rounded-xl border border-zinc-800 text-zinc-500 text-xs">
                  No stress alerts detected recently.
                </div>
              ) : (
                alerts.map((alert) => {
                  const isWaterDeficit = alert.message.includes("WATER") || alert.message.includes("water");
                  const isNutrient = alert.message.includes("NUTRIENT") || alert.message.includes("chlorophyll");
                  
                  return (
                    <div key={alert.id} className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-red-400 font-medium text-xs">{alert.farm_name}</h4>
                        <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded font-mono">NDVI {alert.ndvi_value}</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 mb-2.5 leading-relaxed">{alert.message}</p>
                      
                      {/* Action Trigger Buttons */}
                      <div className="flex gap-2 mt-2 pt-2 border-t border-red-500/20">
                        {isWaterDeficit ? (
                          <Link 
                            href="/irrigation" 
                            className="flex-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-[10px] py-1 rounded text-center transition font-medium"
                          >
                            💧 Open Irrigation
                          </Link>
                        ) : (
                          <Link 
                            href="/detect" 
                            className="flex-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[10px] py-1 rounded text-center transition font-medium"
                          >
                            🔬 Disease Scan
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
            Satellite Scan Frequency: Every 60s
          </div>
        </div>
      </div>
    </div>
  );
}

