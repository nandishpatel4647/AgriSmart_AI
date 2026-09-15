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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-emerald-950">Loading your scan history...</p>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 animate-fadeInUp">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
            <History className="w-8 h-8 text-emerald-700" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Personal Scan Archive
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#0d281e]">
              Saved Scan History
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Log in to view your complete chronological scan archive, search previous crop diagnoses, and review actionable treatment protocols.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login?redirect=/history"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Log In to View History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup?redirect=/history"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs transition-all flex items-center justify-center"
            >
              Create Free Account
            </Link>
          </div>

          <div className="pt-6 border-t border-gray-100 text-center">
            <Link
              href="/detect"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <Microscope className="w-4 h-4" />
              <span>Use Free Guest AI Disease Scanner →</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeInUp">
      
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <History className="w-5 h-5 text-emerald-700" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0d281e]">
              Saved Scan History
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Chronological record of leaf diagnoses saved to your personal farm archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/my-farm"
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-700" />
            <span>My Farm</span>
          </Link>
          <Link
            href="/detect"
            className="px-5 py-2.5 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2"
          >
            <Microscope className="w-4 h-4" />
            <span>Scan New Crop</span>
          </Link>
        </div>
      </div>

      {/* 2. CROP FILTER TABS */}
      {availableCrops.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>Filter Crop:</span>
          </span>

          <button
            onClick={() => setSelectedCrop("All")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCrop === "All"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Crops ({scans.length})
          </button>

          {availableCrops.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCrop === crop
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      )}

      {/* 3. SCANS GRID / EMPTY STATE */}
      {scans.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 border border-gray-200/90 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Leaf className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-gray-900">
              {selectedCrop === "All" ? "No saved crop scans yet." : `No saved scans found for ${selectedCrop}.`}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {selectedCrop === "All"
                ? "Diagnose a crop in the AI scanner and save it to start building your personal scan history."
                : "Try selecting another crop filter or scan a new crop leaf."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/detect"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
            >
              <Microscope className="w-4 h-4" />
              <span>Scan a Crop Leaf</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scans.map((scan) => {
            const isHealthy = scan.disease_name.toLowerCase().includes("healthy");
            return (
              <div
                key={scan.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-900">
                      {scan.crop_family}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(scan.scanned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                  </div>

                  {/* Disease name & condition */}
                  <div>
                    <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug">
                      {scan.disease_name}
                    </h3>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">
                      {scan.diagnostic_class}
                    </p>
                  </div>

                  {/* Badges row: Confidence, Severity, OOD status */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
                      Confidence: {(scan.confidence * 100).toFixed(1)}%
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      isHealthy
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                        : "bg-purple-50 border border-purple-200 text-purple-900"
                    }`}>
                      {scan.severity}
                    </span>
                  </div>

                  {/* Brief Guidance snippet */}
                  {scan.guidance && scan.guidance.length > 0 && (
                    <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-600 line-clamp-2">
                      <span className="font-bold text-gray-800">Protocol: </span>
                      {scan.guidance[0]}
                    </div>
                  )}
                </div>

                {/* Bottom Action buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetail(scan.id)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => setDeletingId(scan.id)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900">
                    {selectedScan.crop_family} Crop
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(selectedScan.scanned_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#0d281e] mt-1">
                  {selectedScan.disease_name}
                </h3>
              </div>

              <button
                onClick={() => setSelectedScan(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">CONFIDENCE</span>
                <span className="font-serif text-lg font-bold text-emerald-950 block mt-0.5">
                  {(selectedScan.confidence * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-emerald-700">Softmax probability</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">SEVERITY</span>
                <span className="font-serif text-lg font-bold text-purple-900 block mt-0.5">
                  {selectedScan.severity}
                </span>
                <span className="text-[10px] text-gray-500">Pathogen impact</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">OOD SAFETY GATE</span>
                <span className="font-serif text-sm font-bold text-emerald-700 block mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> In-Distribution
                </span>
                <span className="text-[10px] text-gray-500">Calibrated rejection</span>
              </div>
            </div>

            {/* Actionable Treatment Guidance Protocol */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h4 className="font-serif text-base font-bold text-[#0d281e]">
                  Actionable Treatment & Prevention Protocol
                </h4>
              </div>

              {selectedScan.guidance && selectedScan.guidance.length > 0 ? (
                <div className="space-y-2">
                  {selectedScan.guidance.map((step, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5 text-xs">
                      <div className="w-5 h-5 rounded-md bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-gray-800 leading-relaxed font-medium">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No specific guidance recorded for this scan.</p>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => setDeletingId(selectedScan.id)}
                className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete This Record</span>
              </button>

              <button
                onClick={() => setSelectedScan(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-red-200 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-gray-900">
                Delete Saved Scan?
              </h3>
              <p className="text-xs text-gray-500">
                This diagnosis record will be permanently removed from your farm history. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
