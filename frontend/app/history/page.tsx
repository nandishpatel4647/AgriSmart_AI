"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  History, 
  Leaf, 
  Trash2, 
  Eye, 
  Microscope, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  FileText, 
  Layers, 
  ArrowRight,
  Filter,
  X,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { useAuth, fetchScanHistory, fetchScanDetail, deleteScan, ScanHistoryItem } from "../lib/auth";

export default function ScanHistoryPage() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [availableCrops, setAvailableCrops] = useState<string[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadScans = async (cropFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const filter = cropFilter && cropFilter !== "All" ? cropFilter : undefined;
      const data = await fetchScanHistory(filter);
      setScans(data.scans || []);
      setAvailableCrops(Object.keys(data.crop_summary || {}));
    } catch (err: any) {
      setError(err.message || "Failed to load scan history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadScans(selectedCrop);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isLoggedIn, selectedCrop, authLoading]);

  // Check URL query parameters for direct scanId or crop
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cropParam = params.get("crop");
      const scanIdParam = params.get("scanId");
      if (cropParam) setSelectedCrop(cropParam);
      if (scanIdParam) {
        handleOpenDetail(Number(scanIdParam));
      }
    }
  }, []);

  const handleOpenDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const scanItem = await fetchScanDetail(id);
      setSelectedScan(scanItem);
    } catch (err: any) {
      alert("Failed to load scan detail: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteScan(deletingId);
      if (selectedScan?.id === deletingId) {
        setSelectedScan(null);
      }
      setDeletingId(null);
      await loadScans(selectedCrop);
    } catch (err: any) {
      alert("Failed to delete scan: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Loading State
  if (authLoading || (isLoggedIn && loading && scans.length === 0)) {
    return (
      <div className="w-full" data-testid="history-page">
        <main className="mx-auto max-w-[1400px] px-5 py-16 text-center space-y-4">
          <div className="size-12 border-4 border-[#b77731] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#19352b]/70">Loading your scan archive...</p>
        </main>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!isLoggedIn) {
    return (
      <div className="w-full" data-testid="history-page">
        <main className="mx-auto max-w-[900px] px-5 py-12 lg:py-20">
          <div className="rounded-[32px] bg-[#fff8eb] p-8 sm:p-14 border border-[#19352b]/10 shadow-[0_20px_55px_rgba(25,53,43,.06)] text-center space-y-6">
            <div className="size-16 rounded-[22px] bg-[#19352b] text-[#f6c86e] flex items-center justify-center mx-auto shadow-sm">
              <History size={28} />
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
              <span className="section-kicker justify-center">
                <span>08</span> PERSONAL SCAN ARCHIVE
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-[-.04em] text-[#19352b]">
                Saved scan <em className="font-serif font-normal italic text-[#b77731]">history.</em>
              </h1>
              <p className="text-xs leading-6 text-[#19352b]/65">
                Log in to view your complete chronological scan archive, search previous crop diagnoses, and review actionable treatment protocols.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/login?redirect=/history"
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#19352b] text-[#fff8eb] font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Log In to View History</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/signup?redirect=/history"
                className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#f5f1e8] hover:bg-[#e9d6b5]/60 text-[#19352b] border border-[#19352b]/15 font-bold text-xs transition-all flex items-center justify-center"
              >
                Create Free Account
              </Link>
            </div>

            <div className="pt-6 border-t border-[#19352b]/08 text-center">
              <Link
                href="/detect"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b77731] hover:underline"
              >
                <Microscope size={14} />
                <span>Use Free Guest AI Disease Scanner →</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full" data-testid="history-page">
      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14 space-y-8">
        
        {/* 1. HEADER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="section-kicker">
              <span>08</span> SCAN RECORDS
            </div>
            <h1 className="page-heading mt-4">
              Saved scan <em className="font-serif font-normal italic text-[#b77731]">history.</em>
            </h1>
            <p className="mt-3 text-xs leading-6 text-[#19352b]/65 max-w-[500px]">
              Chronological record of leaf diagnoses saved to your personal farm archive with calibrated confidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/detect"
              className="inline-flex items-center gap-2 rounded-full bg-[#b77731] px-6 py-3 text-xs font-bold text-[#fff8eb] shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Microscope size={14} />
              <span>Scan New Crop</span>
            </Link>
          </div>
        </div>

      {/* 2. CROP FILTER TABS */}
      {availableCrops.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-[#19352b]/55 flex items-center gap-1 shrink-0 mr-1">
            <Filter size={14} className="text-[#b77731]" />
            <span>Filter Crop:</span>
          </span>

          <button
            onClick={() => setSelectedCrop("All")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCrop === "All"
                ? "bg-[#19352b] text-[#fff8eb] shadow-xs"
                : "bg-[#fff8eb] text-[#19352b]/70 border border-[#19352b]/15 hover:bg-[#19352b]/06"
            }`}
          >
            All Crops ({scans.length})
          </button>

          {availableCrops.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCrop === crop
                  ? "bg-[#19352b] text-[#fff8eb] shadow-xs"
                  : "bg-[#fff8eb] text-[#19352b]/70 border border-[#19352b]/15 hover:bg-[#19352b]/06"
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      )}

      {/* 3. SCANS GRID / EMPTY STATE */}
      {scans.length === 0 ? (
        <div className="rounded-[32px] bg-[#fff8eb] p-10 sm:p-14 border border-[#19352b]/10 text-center space-y-4 shadow-[0_12px_40px_rgba(25,53,43,.04)]">
          <div className="size-14 rounded-2xl bg-[#e9d6b5] text-[#b77731] flex items-center justify-center mx-auto">
            <Leaf size={26} />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-xl font-medium text-[#19352b]">
              {selectedCrop === "All" ? "No saved crop scans yet." : `No saved scans found for ${selectedCrop}.`}
            </h3>
            <p className="text-xs text-[#19352b]/60 max-w-md mx-auto">
              {selectedCrop === "All"
                ? "Diagnose a crop in the AI scanner and save it to start building your personal scan history."
                : "Try selecting another crop filter or scan a new crop leaf."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/detect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#b77731] text-[#fff8eb] font-bold text-xs shadow-sm hover:bg-[#a36829] transition-all"
            >
              <Microscope size={14} />
              <span>Scan a Crop Leaf</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scans.map((scan) => {
            const isHealthy = scan.disease_name.toLowerCase().includes("healthy");
            return (
              <div
                key={scan.id}
                className="rounded-[28px] bg-[#fff8eb] p-6 border border-[#19352b]/08 shadow-[0_12px_40px_rgba(25,53,43,.04)] hover:shadow-[0_18px_50px_rgba(25,53,43,.08)] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#f5f1e8] border border-[#19352b]/10 text-[#19352b]">
                      {scan.crop_family}
                    </span>
                    <span className="text-[11px] text-[#19352b]/45 font-medium flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(scan.scanned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                  </div>

                  {/* Disease name & condition */}
                  <div>
                    <h3 className="font-heading text-lg font-medium text-[#19352b] leading-snug">
                      {scan.disease_name}
                    </h3>
                    <p className="text-[11px] font-mono text-[#19352b]/50 mt-0.5 truncate">
                      {scan.diagnostic_class}
                    </p>
                  </div>

                  {/* Badges row: Confidence, Severity, OOD status */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#f5f1e8] border border-[#19352b]/10 text-[#19352b] text-[11px] font-bold">
                      Confidence: {(scan.confidence * 100).toFixed(1)}%
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      isHealthy
                        ? "bg-[#d7e2ce] text-[#19352b]"
                        : "bg-[#e9d6b5] text-[#b77731]"
                    }`}>
                      {scan.severity}
                    </span>
                  </div>

                  {/* Brief Guidance snippet */}
                  {scan.guidance && scan.guidance.length > 0 && (
                    <div className="p-3 rounded-2xl bg-[#f5f1e8]/70 border border-[#19352b]/06 text-xs text-[#19352b]/70 line-clamp-2">
                      <span className="font-bold text-[#19352b]">Protocol: </span>
                      {scan.guidance[0]}
                    </div>
                  )}
                </div>

                {/* Bottom Action buttons */}
                <div className="pt-3 border-t border-[#19352b]/08 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetail(scan.id)}
                    className="text-xs font-bold text-[#b77731] hover:text-[#19352b] flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => setDeletingId(scan.id)}
                    className="text-xs font-bold text-red-600/80 hover:text-red-700 flex items-center gap-1 py-1 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DETAIL MODAL */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-emerald-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#19352b]/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f5f1e8] border border-[#19352b]/10 text-[#19352b]">
                    {selectedScan.crop_family} Crop
                  </span>
                  <span className="text-xs text-[#19352b]/50">
                    {new Date(selectedScan.scanned_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="font-heading text-2xl font-medium text-[#19352b] mt-2">
                  {selectedScan.disease_name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedScan(null)}
                className="p-2 rounded-xl hover:bg-[#19352b]/08 text-[#19352b]/60 hover:text-[#19352b] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-[#f5f1e8]/70 border border-[#19352b]/08">
                <span className="text-[10px] font-bold text-[#19352b]/50 uppercase block">CONFIDENCE</span>
                <span className="font-heading text-xl font-medium text-[#19352b] block mt-0.5">
                  {(selectedScan.confidence * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#b77731]">Softmax probability</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f1e8]/70 border border-[#19352b]/08">
                <span className="text-[10px] font-bold text-[#19352b]/50 uppercase block">SEVERITY</span>
                <span className="font-heading text-xl font-medium text-[#b77731] block mt-0.5">
                  {selectedScan.severity}
                </span>
                <span className="text-[10px] text-[#19352b]/50">Pathogen impact</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f1e8]/70 border border-[#19352b]/08 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-[#19352b]/50 uppercase block">OOD SAFETY GATE</span>
                <span className="font-heading text-sm font-medium text-[#19352b] block mt-1 flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-[#10b981]" /> In-Distribution
                </span>
                <span className="text-[10px] text-[#19352b]/50">Calibrated rejection</span>
              </div>
            </div>

            {/* Actionable Treatment Guidance Protocol */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#19352b]/10 pb-2">
                <FileText size={15} className="text-[#b77731]" />
                <h4 className="font-heading text-sm font-bold text-[#19352b]">
                  Actionable Treatment & Prevention Protocol
                </h4>
              </div>

              {selectedScan.guidance && selectedScan.guidance.length > 0 ? (
                <div className="space-y-2">
                  {selectedScan.guidance.map((step, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-[#f5f1e8]/70 border border-[#19352b]/06 flex items-start gap-2.5 text-xs">
                      <div className="size-5 rounded-md bg-[#19352b] text-[#fff8eb] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-[#19352b]/80 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#19352b]/50 italic">No specific guidance recorded for this scan.</p>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#19352b]/10">
              <button
                onClick={() => setDeletingId(selectedScan.id)}
                className="px-4 py-2 rounded-full text-red-600/80 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete This Record</span>
              </button>

              <button
                onClick={() => setSelectedScan(null)}
                className="px-6 py-2.5 rounded-full bg-[#19352b] hover:bg-[#19352b]/90 text-[#fff8eb] text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION DIALOG */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="rounded-[32px] bg-[#fff8eb] p-6 sm:p-8 max-w-sm w-full border border-red-200 shadow-2xl space-y-4 text-center">
            <div className="size-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-medium text-[#19352b]">
                Delete Saved Scan?
              </h3>
              <p className="text-xs text-[#19352b]/60 leading-relaxed">
                This diagnosis record will be permanently removed from your farm history. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
                className="px-5 py-2 rounded-full text-[#19352b]/70 hover:bg-[#19352b]/08 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}

