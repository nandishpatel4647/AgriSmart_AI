"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { LoaderCircle, MapPin, Satellite, Shield } from "lucide-react";

// Dynamically import Leaflet map component with ssr disabled
const MapWithNoSSR = dynamic(() => import("../../components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] w-full bg-[#fff8eb] rounded-[28px] border border-[#19352b]/10">
      <div className="text-[#19352b] flex flex-col items-center gap-3">
        <LoaderCircle size={32} className="animate-spin text-[#b77731]" />
        <p className="text-xs font-bold text-[#19352b]/60">Loading Satellite Field Map…</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="w-full" data-testid="map-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header Kicker */}
        <div className="section-kicker" data-testid="map-kicker">
          <span>06</span> SATELLITE RADAR
        </div>

        {/* Heading */}
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="map-heading">
              Farm mapping & <em className="font-serif font-normal italic text-[#b77731]">vegetation index.</em>
            </h1>
            <p className="mt-5 max-w-[540px] text-sm leading-6 text-[#19352b]/65">
              Draw your plot boundaries using GPS coordinates. AgriSmart AI monitors vegetation health (NDVI), canopy water (NDWI), and chlorophyll vigor (NDRE).
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-4 py-2 text-xs font-semibold text-[#19352b]/70 shadow-2xs w-fit">
            <Satellite size={14} className="text-[#b77731]" />
            <span>Sentinel-2 Spectral Feeds</span>
          </div>
        </div>

        {/* Map Wrapper Card */}
        <div className="mt-8 rounded-[32px] overflow-hidden border border-[#19352b]/12 bg-[#fff8eb] p-3 shadow-[0_20px_60px_rgba(25,53,43,.06)]">
          <Suspense fallback={
            <div className="flex h-[600px] items-center justify-center bg-[#fff8eb] rounded-[24px]">
              <LoaderCircle className="animate-spin text-[#b77731]" size={32} />
            </div>
          }>
            <MapWithNoSSR />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
