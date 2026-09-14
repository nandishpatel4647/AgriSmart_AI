"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { resilientFetch } from "../app/lib/api";

// Fix leaflet icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
        alert("Farm mapped successfully!");
        setFarmName("");
        setPoints([]);
        fetchFarms();
      }
    } catch (e) {
      alert("Failed to save farm.");
    }
    setIsSaving(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[700px]">
      <div className="md:col-span-3 h-full rounded-2xl overflow-hidden border border-emerald-500/20 shadow-xl relative">
        <MapContainer center={[22.5, 72.9]} zoom={8} className="w-full h-full">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
          <MapEvents onMapClick={handleMapClick} />
          
          {/* Currently drawing polygon */}
          {points.length > 0 && (
            <Polygon positions={points} pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.3 }} />
          )}

          {/* Saved Farms */}
          {farms.map((farm) => {
            // GeoJSON to LatLng for Leaflet
            const latlngs = farm.geojson.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
            return (
              <Polygon key={farm.id} positions={latlngs} pathOptions={{ color: 'emerald', fillColor: 'emerald', fillOpacity: 0.4 }}>
                <Popup>
                  <strong>{farm.name}</strong><br/>
                  Mapped: {new Date(farm.created_at).toLocaleDateString()}
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
        
        {/* Drawing Controls Overlay */}
        <div className="absolute top-4 right-4 z-[400] bg-zinc-900/90 backdrop-blur border border-emerald-500/30 p-4 rounded-xl shadow-lg w-72">
          <h3 className="text-emerald-400 font-medium mb-2">Map New Field</h3>
          <p className="text-sm text-zinc-400 mb-4">Click on the map to draw corners of your field boundary.</p>
          
          <input 
            type="text" 
            placeholder="Farm Name (e.g. North Plot)" 
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-white mb-3 focus:outline-none focus:border-emerald-500"
            value={farmName}
            onChange={e => setFarmName(e.target.value)}
          />
          
          <div className="flex gap-2">
            <button 
              onClick={clearDrawing}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm transition"
            >
              Clear
            </button>
            <button 
              onClick={saveFarm}
              disabled={isSaving || points.length < 3 || !farmName}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Field"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Alert Sidebar */}
      <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <span>🚨</span> Crop Stress Alerts
        </h2>
        <p className="text-sm text-zinc-400 mb-6">Background AI constantly monitors satellite NDVI index for mapped fields.</p>
        
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center p-4 bg-zinc-800/50 rounded-xl border border-zinc-800 text-zinc-500">
              No stress alerts detected recently.
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl">
                <h4 className="text-red-400 font-medium mb-1">{alert.farm_name}</h4>
                <p className="text-xs text-zinc-300 mb-2">{alert.message}</p>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>NDVI: {alert.ndvi_value}</span>
                  <span>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
