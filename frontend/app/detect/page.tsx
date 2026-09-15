"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, FileImage, Leaf, LoaderCircle, ScanLine, Shield, ShieldAlert, Sparkles, UploadCloud, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiUpload } from "../lib/api";
import type { DetectionResponse } from "../lib/types";

const SAMPLE_LEAVES = [
  { name: "Tomato Late Blight", path: "/samples/tomato_late_blight.jpg" },
  { name: "Apple Scab", path: "/samples/apple_scab.jpg" },
  { name: "Corn Common Rust", path: "/samples/corn_common_rust.jpg" },
  { name: "Potato Early Blight", path: "/samples/potato_early_blight.jpg" },
  { name: "Tulsi (Unseen Species OOD)", path: "/samples/tulsi_leaf.jpg" },
];

export default function DetectPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanStage, setScanStage] = useState<number>(0); // 0: idle, 1: brightness, 2: blur, 3: leaf check, 4: complete
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function accept(next: File | undefined) {
    if (!next || !next.type.startsWith("image/")) return;
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setResult(null);
    setError(null);
    setScanStage(0);
  }

  async function selectSample(samplePath: string) {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setScanStage(1);
      setTimeout(() => setScanStage(2), 350);
      setTimeout(() => setScanStage(3), 700);

      const res = await fetch(samplePath);
      const blob = await res.blob();
      const sampleFile = new File([blob], samplePath.split("/").pop() || "sample.jpg", { type: "image/jpeg" });
      setFile(sampleFile);
      setPreviewUrl(samplePath);

      // Run diagnosis
      const data = await apiUpload<DetectionResponse>("/diagnose", sampleFile);
      setResult(data);
      setScanStage(4);

      // Auto-scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e: any) {
      setError(e.message || "Failed to analyze sample image");
      setScanStage(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setScanStage(1);

    const t1 = setTimeout(() => setScanStage(2), 400);
    const t2 = setTimeout(() => setScanStage(3), 800);
    const t3 = setTimeout(() => setScanStage(4), 1200);

    try {
      const data = await apiUpload<DetectionResponse>("/diagnose", file);
      setResult(data);
      setScanStage(4);

      // Auto-scroll down smoothly
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (e: any) {
      setError(e.message || "Diagnosis failed. Please check backend connection.");
      setScanStage(0);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setLoading(false);
    }
  }

  return (
    <div className="w-full" data-testid="detect-page">
      <main className="relative z-10 mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        
        {/* Header kicker */}
        <div className="section-kicker" data-testid="detect-page-kicker">
          <span>01</span> CROP DISEASE DIAGNOSIS
        </div>

        {/* Title area - Large Farmer Friendly Headline */}
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-heading text-[clamp(2.8rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-tight text-[#19352b]" data-testid="detect-page-heading">
              Give us a <em className="font-serif font-normal italic text-[#b77731]">leaf.</em>
            </h1>
            <p className="mt-4 max-w-[580px] text-base sm:text-lg font-semibold text-[#19352b]/80" data-testid="detect-page-description">
              Upload a clear crop leaf photo for instant 33-class disease diagnosis and actionable farmer precautions.
            </p>
          </div>

          {/* Right Floating Badge */}
          <div className="flex items-center gap-2.5 rounded-full border-2 border-[#19352b]/20 bg-[#fff8eb] px-5 py-2.5 text-sm font-extrabold text-[#19352b] shadow-sm w-fit">
            <Shield size={18} className="text-[#b77731]" />
            <span>Open-Set Rejection Active</span>
          </div>
        </div>

        {/* Two-Column Layout */}
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Left Card: Upload & Preview Card */}
          <div 
            className="rounded-[36px] bg-[#fff8eb] p-8 sm:p-9 shadow-md border-2 border-[#19352b]/15 flex flex-col justify-between"
            data-testid="detect-upload-card"
          >
            {previewUrl ? (
              <div className="relative h-[420px] sm:h-[460px] w-full overflow-hidden rounded-[28px] border-2 border-[#19352b]/15 shadow-sm bg-[#19352b]">
                <img 
                  src={previewUrl} 
                  alt="Selected leaf preview" 
                  className="h-full w-full object-cover" 
                />
                
                {/* Bottom gradient fade */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-6 pt-16 px-6 flex items-end justify-between">
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-black uppercase tracking-widest text-[#f6c86e] block mb-1">
                      READY FOR DIAGNOSIS
                    </span>
                    <strong className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[280px] block">
                      {file?.name || "crop_leaf.jpg"}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-full bg-[#19352b] hover:bg-[#11241d] text-white px-6 py-2.5 text-sm font-extrabold border border-white/20 transition-all cursor-pointer shadow-md shrink-0"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Dropzone State */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  accept(e.dataTransfer.files?.[0]);
                }}
                className={`relative flex min-h-[400px] flex-col items-center justify-center rounded-[28px] border-3 border-dashed p-8 text-center transition-colors ${
                  dragging ? "border-[#b77731] bg-[#e9d6b5]/40" : "border-[#19352b]/20 bg-[#f5f1e8]/60"
                }`}
                data-testid="detect-dropzone"
              >
                <span className="flex size-16 items-center justify-center rounded-2xl bg-[#fff8eb] text-[#b77731] shadow-sm mb-5">
                  <UploadCloud size={32} />
                </span>
                <h3 className="text-2xl font-heading font-extrabold tracking-tight text-[#19352b]">
                  Drop a crop photo here
                </h3>
                <p className="mt-3 text-base font-semibold text-[#19352b]/70 max-w-[320px]">
                  JPG, PNG or WEBP. One clear leaf with natural lighting.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-7 flex items-center gap-2.5 rounded-full bg-[#19352b] px-8 py-3.5 text-base font-extrabold text-[#fff8eb] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer shadow-md"
                  data-testid="detect-choose-button"
                >
                  <FileImage size={18} /> Choose Image File
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => accept(e.target.files?.[0])}
            />

            {/* Action Button */}
            {file && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#b77731] hover:bg-[#a36829] py-4 text-lg font-black text-[#fff8eb] shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <LoaderCircle size={24} className="animate-spin" /> : <ScanLine size={24} />}
                  <span>{loading ? "Analyzing Leaf Image..." : "Analyze Disease & Action Plan"}</span>
                </button>
              </div>
            )}

            {/* Quick Sample Leaves Strip */}
            <div className="mt-6 pt-5 border-t-2 border-[#19352b]/10">
              <span className="text-xs font-black uppercase tracking-wider text-[#19352b]/60 block mb-3">
                Or test with sample field leaves:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_LEAVES.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => selectSample(sample.path)}
                    disabled={loading}
                    className="rounded-full border-2 border-[#19352b]/15 bg-[#fff8eb] px-4 py-1.5 text-xs font-bold text-[#19352b] hover:bg-[#19352b] hover:text-[#fff8eb] transition-colors cursor-pointer"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Card: Forest Green Card */}
          <div 
            className="rounded-[36px] bg-[#19352b] p-8 sm:p-10 text-[#fff8eb] shadow-lg flex flex-col justify-between border-2 border-[#19352b]"
            data-testid="detect-info-card"
          >
            <div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-[#fff8eb]/10 text-[#f6c86e] mb-6">
                <Leaf size={28} />
              </span>

              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-[#fff8eb]">
                Verifiable & Honest<br />Disease Detection.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/85 font-medium">
                Our ConvNeXt classifier evaluates your photo for leaf sharpness, crop family match, and disease severity.
              </p>

              {/* Quality Checklist */}
              <div className="mt-8 pt-6 border-t border-white/15 space-y-4">
                <div className={`flex items-center gap-3.5 text-sm sm:text-base font-bold ${scanStage >= 1 ? "text-[#f6c86e]" : "text-white/70"}`}>
                  <CheckCircle2 size={20} className={scanStage >= 1 ? "text-[#f6c86e]" : "text-white/40"} />
                  <span>Image Sharpness & Exposure Check</span>
                </div>
                <div className={`flex items-center gap-3.5 text-sm sm:text-base font-bold ${scanStage >= 2 ? "text-[#f6c86e]" : "text-white/70"}`}>
                  <CheckCircle2 size={20} className={scanStage >= 2 ? "text-[#f6c86e]" : "text-white/40"} />
                  <span>Botanical Leaf-Foliage Detection</span>
                </div>
                <div className={`flex items-center gap-3.5 text-sm sm:text-base font-bold ${scanStage >= 3 ? "text-[#f6c86e]" : "text-white/70"}`}>
                  <CheckCircle2 size={20} className={scanStage >= 3 ? "text-[#f6c86e]" : "text-white/40"} />
                  <span>33-Class ConvNeXt Classification</span>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/15">
              <span className="text-xs font-black text-[#f6c86e] uppercase tracking-wider block">SUPPORTED CROPS</span>
              <p className="mt-1 text-sm font-bold text-white/90">
                Tomato, Potato, Corn, Grape, Apple, Bell Pepper, Cherry, Peach, Strawberry.
              </p>
            </div>
          </div>

        </section>

        {/* SECTION 5 DIAGNOSTIC RESULT DISPLAY */}
        {result && (
          <section ref={resultRef} className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-[36px] bg-[#fff8eb] p-8 sm:p-12 shadow-xl border-3 border-[#19352b]">
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#19352b]/15 pb-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#b77731]">
                    DIAGNOSIS RESULT
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#19352b] tracking-tight mt-1">
                    {result.crop} — {result.disease_label}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#19352b] px-5 py-2 text-sm font-extrabold text-[#f6c86e]">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </span>
                  {result.ood_status === "out_of_distribution" ? (
                    <span className="rounded-full bg-red-600 px-5 py-2 text-sm font-extrabold text-white">
                      REJECTED (OOD)
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-extrabold text-white">
                      IN-DISTRIBUTION
                    </span>
                  )}
                </div>
              </div>

              {/* Guidance Bullet Points - Large Farmer Friendly Fonts */}
              <div className="mt-8 grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="text-xl font-black text-[#19352b] flex items-center gap-2">
                    <CheckCircle2 className="text-[#b77731]" size={22} /> Actionable Precautionary Guidance
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {result.precautionary_guidance?.map((step: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 rounded-2xl bg-white p-4 border-2 border-[#19352b]/10 font-bold text-[#19352b] text-base shadow-xs">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#19352b] text-xs font-black text-[#f6c86e]">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Additional Info Box */}
                <div className="rounded-3xl bg-[#d7e2ce] p-6 border-2 border-[#19352b]/15 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#19352b] uppercase tracking-wider">
                      Agronomic Summary
                    </h3>
                    <p className="mt-3 text-base font-bold text-[#19352b]/85 leading-relaxed">
                      This diagnostic report is computed using transfer learning on held-out test data. Refer to AI Assistant for voice explanations in Hindi or Gujarati.
                    </p>
                  </div>

                  <div className="mt-6">
                    <Link
                      href="/assistant"
                      className="inline-flex items-center gap-2.5 rounded-full bg-[#19352b] px-6 py-3 text-sm font-extrabold text-[#fff8eb] shadow-md"
                    >
                      <MessageCircle size={18} /> Ask AI Assistant about treatment
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

      </main>
    </div>
  );
}
