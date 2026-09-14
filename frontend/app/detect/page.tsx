"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Eye, FileImage, Info, Leaf, LoaderCircle, ShieldAlert, Sparkles, UploadCloud, Volume2, X } from "lucide-react";
import { apiUpload } from "../lib/api";
import type { DetectionResponse, PhotoQuality } from "../lib/types";

const SAMPLE_LEAVES = [
  { name: "Tomato Late Blight", path: "/samples/tomato_late_blight.jpg", crop: "Tomato" },
  { name: "Apple Scab", path: "/samples/apple_scab.jpg", crop: "Apple" },
  { name: "Corn Common Rust", path: "/samples/corn_common_rust.jpg", crop: "Corn" },
  { name: "Potato Early Blight", path: "/samples/potato_early_blight.jpg", crop: "Potato" },
  { name: "Tulsi (Unseen Species OOD)", path: "/samples/tulsi_leaf.jpg", crop: "Unsupported" },
];

export default function DetectPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heatmapView, setHeatmapView] = useState<"side_by_side" | "heatmap_only" | "original_only">("side_by_side");

  function accept(next: File | undefined) {
    if (!next || !next.type.startsWith("image/")) return;
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setResult(null);
    setError(null);
  }

  async function selectSample(samplePath: string) {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const sampleFile = new File([blob], samplePath.split("/").pop() || "sample.jpg", { type: "image/jpeg" });
      setFile(sampleFile);
      setPreviewUrl(samplePath);
      // Run diagnosis directly
      const data = await apiUpload<DetectionResponse>("/diagnose", sampleFile);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Failed to analyze sample image");
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiUpload<DetectionResponse>("/diagnose", file);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Diagnosis failed. Please check backend status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full" data-testid="detect-page">
      <main className="relative z-10 mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header kicker & title */}
        <div className="section-kicker" data-testid="detect-page-kicker">
          <span>02</span> Diagnostic scan
        </div>
        <div className="mt-5 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <h1 className="page-heading" data-testid="detect-page-heading">
              Check a leaf with <em>calibrated</em> certainty.
            </h1>
            <p className="mt-5 max-w-[460px] text-sm leading-6 text-[#19352b]/65" data-testid="detect-page-description">
              Upload a clear field photo. The system checks sharpness, brightness, and leaf structure before running the 33-class diagnostic classifier.
            </p>

            {/* Quick Sample Selector */}
            <div className="mt-7">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/50 block mb-2.5">
                Quick Test Samples
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_LEAVES.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => selectSample(sample.path)}
                    disabled={loading}
                    className="rounded-full border border-[#19352b]/15 bg-[#fff8eb] px-3 py-1.5 text-[11px] font-semibold text-[#19352b]/80 hover:bg-[#19352b] hover:text-[#fff8eb] transition-colors cursor-pointer"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload card */}
          <div className="rounded-[32px] bg-[#fff8eb] p-7 shadow-[0_20px_55px_rgba(25,53,43,.06)] border border-[#19352b]/10 sm:p-9" data-testid="detect-upload-card">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                accept(e.dataTransfer.files?.[0]);
              }}
              className={`relative flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-6 text-center transition-colors ${
                dragging ? "border-[#b77731] bg-[#e9d6b5]/30" : "border-[#19352b]/15 bg-[#f5f1e8]/60"
              }`}
              data-testid="detect-dropzone"
            >
              {previewUrl ? (
                <div className="relative w-full flex flex-col items-center">
                  <div className="relative max-h-[220px] w-full max-w-[320px] overflow-hidden rounded-2xl shadow-sm border border-[#19352b]/10">
                    <img src={previewUrl} alt="Leaf Preview" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); }}
                    className="mt-3 text-xs font-bold text-[#b77731] underline cursor-pointer hover:text-[#19352b]"
                  >
                    Remove and choose another
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex size-12 items-center justify-center rounded-[16px] bg-[#19352b]/08 text-[#b77731] mb-4">
                    <UploadCloud size={24} />
                  </span>
                  <p className="text-sm font-bold text-[#19352b]">Drag a leaf photo here</p>
                  <p className="mt-1 text-xs text-[#19352b]/55">Supports JPG, PNG, WEBP (under 15MB)</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-4 rounded-full bg-[#19352b] px-5 py-2 text-xs font-bold text-[#fff8eb] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                    data-testid="detect-choose-button"
                  >
                    Choose Image
                  </button>
                </>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => accept(e.target.files?.[0])}
              />
            </div>

            {/* Action Bar */}
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[11px] text-[#19352b]/60 flex items-center gap-1.5">
                <Leaf size={14} className="text-[#b77731]" />
                {file ? file.name : "No image selected"}
              </span>

              <button
                type="button"
                onClick={handleScan}
                disabled={!file || loading}
                className="rounded-full bg-[#b77731] px-6 py-2.5 text-xs font-bold text-[#fff8eb] shadow-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                data-testid="detect-submit-button"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    <span>Analyzing leaf...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Run Diagnostic Scan</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Diagnostic Results Section */}
        {result && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ResultCard result={result} previewUrl={previewUrl} heatmapView={heatmapView} setHeatmapView={setHeatmapView} />
          </div>
        )}
      </main>
    </div>
  );
}

function ResultCard({ 
  result, 
  previewUrl, 
  heatmapView, 
  setHeatmapView 
}: { 
  result: DetectionResponse; 
  previewUrl: string | null;
  heatmapView: "side_by_side" | "heatmap_only" | "original_only";
  setHeatmapView: (v: "side_by_side" | "heatmap_only" | "original_only") => void;
}) {
  const isOod = result.is_ood || result.ood_status === "UNSEEN_SPECIES_DETECTED" || result.ood_status === "NON_PLANT_IMAGE";
  const isNonPlant = result.ood_status === "NON_PLANT_IMAGE";
  const quality = result.photo_quality;

  return (
    <div className="rounded-[32px] bg-[#fff8eb] p-7 sm:p-10 border border-[#19352b]/12 shadow-[0_24px_60px_rgba(25,53,43,.08)]" data-testid="detect-result-card">
      
      {/* Top Status & Quality row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#19352b]/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-[#19352b] text-[#f6c86e]">
            {isOod ? <ShieldAlert size={20} /> : <Leaf size={20} />}
          </span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#19352b]/50 block">Diagnostic Result</span>
            <span className="text-xs font-bold text-[#19352b]">{result.crop || "Unknown Crop"}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {isNonPlant ? (
            <span className="rounded-full bg-[#19352b] px-3.5 py-1.5 text-[10px] font-bold text-[#f6c86e] tracking-wide" data-testid="detect-nonplant-badge">
              NON-LEAF OBJECT DETECTED
            </span>
          ) : isOod ? (
            <span className="rounded-full bg-[#b77731] px-3.5 py-1.5 text-[10px] font-bold text-[#fff8eb] tracking-wide" data-testid="detect-ood-badge">
              OPEN-SET REJECTION ACTIVE
            </span>
          ) : (
            <span className="rounded-full bg-[#19352b] px-3.5 py-1.5 text-[10px] font-bold text-[#f6c86e] tracking-wide" data-testid="detect-status-badge">
              CALIBRATED · 99.7% ACCURACY
            </span>
          )}

          {result.confidence !== null && (
            <span className="rounded-full border border-[#19352b]/15 bg-[#f5f1e8] px-3 py-1.5 text-[11px] font-bold text-[#19352b]">
              {(result.confidence * 100).toFixed(1)}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Main result layout */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        
        {/* Left Column: Heading, guidance, notes */}
        <div>
          {isOod ? (
            <div className="rounded-2xl bg-[#e9d6b5]/50 border border-[#b77731]/30 p-6">
              <h2 className="font-heading text-2xl font-bold tracking-[-.03em] text-[#19352b]">
                {result.leaf_display_name || result.disease_label}
              </h2>
              <p className="mt-3 text-xs leading-6 text-[#19352b]/75">
                {result.analysis_note}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="font-heading text-3xl font-bold tracking-[-.04em] text-[#19352b]" data-testid="detect-disease-label">
                {result.disease_label}
              </h2>
              <p className="mt-3 text-xs leading-6 text-[#19352b]/70" data-testid="detect-analysis-note">
                {result.analysis_note}
              </p>
            </div>
          )}

          {/* Precautionary Guidance */}
          {result.precautionary_guidance && result.precautionary_guidance.length > 0 && (
            <div className="mt-7">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#b77731] block mb-3">
                Precautionary Action Plan
              </span>
              <div className="space-y-2.5">
                {result.precautionary_guidance.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs leading-5 text-[#19352b]/80">
                    <Check size={15} className="text-[#b77731] shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Quality Signals */}
          {quality && (
            <div className="mt-7 pt-6 border-t border-[#19352b]/10 grid grid-cols-3 gap-3">
              <Quality title="Sharpness" value={`${Math.round(quality.sharpness_score)}/100`} testId="quality-sharpness" />
              <Quality title="Brightness" value={`${Math.round(quality.brightness_score)}/100`} testId="quality-brightness" />
              <Quality title="Structure" value={quality.leaf_likelihood === "leaf_candidate" ? "Leaf" : quality.leaf_likelihood} testId="quality-structure" />
            </div>
          )}
        </div>

        {/* Right Column: Visualizer with Real Grad-CAM Heatmap */}
        <div>
          <div className="rounded-2xl border border-[#19352b]/12 bg-[#f5f1e8] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#19352b]/50">
                Spatial Attention Heatmap
              </span>
              
              {result.gradcam_url && (
                <div className="flex rounded-lg bg-white/70 p-0.5 border border-[#19352b]/10 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setHeatmapView("side_by_side")}
                    className={`px-2 py-1 rounded-md transition-colors ${heatmapView === "side_by_side" ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b]/60"}`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapView("heatmap_only")}
                    className={`px-2 py-1 rounded-md transition-colors ${heatmapView === "heatmap_only" ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b]/60"}`}
                  >
                    Heatmap
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapView("original_only")}
                    className={`px-2 py-1 rounded-md transition-colors ${heatmapView === "original_only" ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b]/60"}`}
                  >
                    Original
                  </button>
                </div>
              )}
            </div>

            {/* Images display */}
            <div className="grid gap-3 sm:grid-cols-2">
              {(heatmapView === "side_by_side" || heatmapView === "original_only") && previewUrl && (
                <div className={`relative overflow-hidden rounded-xl border border-[#19352b]/10 shadow-xs ${heatmapView === "original_only" ? "sm:col-span-2" : ""}`}>
                  <img src={previewUrl} alt="Original Leaf" className="w-full h-48 object-cover" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-[#19352b]/80 px-2 py-0.5 text-[9px] font-bold text-white">
                    Original
                  </span>
                </div>
              )}

              {(heatmapView === "side_by_side" || heatmapView === "heatmap_only") && (
                <div className={`relative overflow-hidden rounded-xl border border-[#19352b]/10 shadow-xs ${heatmapView === "heatmap_only" ? "sm:col-span-2" : ""}`}>
                  {result.gradcam_url ? (
                    <>
                      <img 
                        src={result.gradcam_url.startsWith("http") ? result.gradcam_url : `http://localhost:8000${result.gradcam_url}`} 
                        alt="Grad-CAM Lesion Heatmap" 
                        className="w-full h-48 object-cover" 
                      />
                      <span className="absolute bottom-2 left-2 rounded-md bg-[#b77731] px-2 py-0.5 text-[9px] font-bold text-white">
                        HiResCAM Heatmap
                      </span>
                    </>
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-[#e9d6b5]/30 text-center p-4">
                      <span className="text-xs text-[#19352b]/60">Heatmap generated for verified diseased leaves</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <p className="mt-3 text-[10px] leading-4 text-[#19352b]/50">
              * Red and amber regions indicate the precise leaf features driving the neural network's prediction.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

function Quality({ title, value, testId }: { title: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f1e8] p-3 text-center" data-testid={testId}>
      <span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#19352b]/50">{title}</span>
      <strong className="mt-1 block text-sm tracking-[-.02em] text-[#19352b]">{value}</strong>
    </div>
  );
}
