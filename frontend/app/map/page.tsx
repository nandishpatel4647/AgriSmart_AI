"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import Leaflet map component with ssr disabled
const MapWithNoSSR = dynamic(() => import("../../components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[700px] w-full bg-zinc-900 rounded-2xl border border-emerald-500/20">
      <div className="text-emerald-500 flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading Satellite Maps...</p>
      </div>
    </div>
  )
});

export default function MapPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 max-w-7xl mx-auto pt-24">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-emerald-400 mb-2">Farm Mapping & Monitoring</h1>
        <p className="text-zinc-400 text-lg">
          Draw your field boundaries using GPS coordinates. AgriSmart AI will continuously monitor these regions via satellite to detect early signs of crop stress (NDVI).
        </p>
      </div>
      
      <Suspense fallback={<div>Loading map component...</div>}>
        <MapWithNoSSR />
      </Suspense>
    </div>
  );
}
