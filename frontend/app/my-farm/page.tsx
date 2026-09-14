"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Leaf, 
  MapPin, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Microscope, 
  ArrowRight, 
  Clock, 
  User as UserIcon, 
  Edit3, 
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Activity,
  Sparkles
} from "lucide-react";
import { useAuth, fetchFarmOverview, FarmOverview, updateProfile } from "../lib/auth";

export default function MyFarmPage() {
  const { user, isLoggedIn, loading: authLoading, refreshUser } = useAuth();
  const [overview, setOverview] = useState<FarmOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFarmSize, setEditFarmSize] = useState("");
  const [editCrops, setEditCrops] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const availableCrops = ["Tomato", "Potato", "Corn", "Grape", "Apple", "Bell Pepper", "Cherry", "Peach", "Strawberry"];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || "Failed to load farm overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isLoggedIn, authLoading]);

  const openEditModal = () => {
    if (!user) return;
    setEditName(user.name || "");
    setEditLocation(user.location || "");
    setEditFarmSize(user.farm_size || "");
    setEditCrops(user.primary_crops || []);
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: editName,
        location: editLocation,
        farm_size: editFarmSize,
        primary_crops: editCrops,
      });
      await refreshUser();
      await loadData();
      setShowEditModal(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCrop = (crop: string) => {
    setEditCrops(prev => 
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  // 1. Loading State
  if (authLoading || (isLoggedIn && loading && !overview)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-emerald-950">Loading your farm overview...</p>
      </div>
    );
  }

  // 2. Unauthenticated State (Guest View of My Farm)
  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 animate-fadeInUp">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
            <Leaf className="w-8 h-8 text-emerald-700" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Farmer Personalization
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#0d281e]">
              My Farm Workspace
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Create a free account or log in to track your crops, maintain recent crop health records, and access your personal diagnosis history.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup?redirect=/my-farm"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Free Farmer Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login?redirect=/my-farm"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs transition-all flex items-center justify-center"
            >
              Log In to Existing Farm
            </Link>
          </div>

          <div className="pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-3">
              Want to diagnose a leaf right now without signing in?
            </p>
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

  const farmer = overview?.farmer || user;
  const recentHealth = overview?.recent_crop_health || [];
  const recentScans = overview?.recent_scans || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeInUp">
      
      {/* 1. FARMER PROFILE HEADER CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* Farmer Details */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-serif text-2xl font-black shadow-md shrink-0">
              {farmer?.name ? farmer.name.charAt(0).toUpperCase() : "F"}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#0d281e]">
                  {farmer?.name || "Farmer"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified Farmer
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 font-medium">
                {farmer?.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{farmer.location}</span>
                  </span>
                )}
                {farmer?.farm_size && (
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{farmer.farm_size}</span>
                  </span>
                )}
                {farmer?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Member since {new Date(farmer.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                  </span>
                )}
              </div>

              {/* Primary Crops Pills */}
              {farmer?.primary_crops && farmer.primary_crops.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <span className="text-[11px] font-bold text-gray-600">Primary Crops:</span>
                  {farmer.primary_crops.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions & Scan Counter */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-center">
              <span className="text-[10px] font-bold text-emerald-800/80 uppercase block">SAVED SCANS</span>
              <span className="font-serif text-2xl font-black text-emerald-950 block">
                {overview?.total_scans ?? 0}
              </span>
            </div>

            <button
              onClick={openEditModal}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Edit Farm Details</span>
            </button>

            <Link
              href="/detect"
              className="px-5 py-2.5 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Microscope className="w-4 h-4" />
              <span>Scan New Crop</span>
            </Link>
          </div>

        </div>
      </div>

      {/* 2. RECENT CROP HEALTH SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              <h2 className="font-serif text-xl font-bold text-[#0d281e]">
                Recent Crop Health
              </h2>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Status derived from the farmer&apos;s latest saved scans.
            </p>
          </div>

          <span className="text-[11px] font-semibold text-emerald-800/80 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
            🌿 Derived from saved diagnoses
          </span>
        </div>

        {/* Empty State for Recent Crop Health */}
        {recentHealth.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200/90 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Leaf className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-gray-900">
                No saved crop scans yet.
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Scan your crop leaves in the AI Disease Scanner and save the diagnosis to start monitoring Recent Crop Health.
              </p>
            </div>
            <Link
              href="/detect"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl green-gradient-bg text-white font-bold text-xs shadow-md hover:opacity-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Scan Your First Crop</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentHealth.map((item, idx) => (
              <div 
                key={idx}
                className={`bg-white rounded-3xl p-5 border shadow-xs space-y-3 transition-all ${
                  item.status === "Healthy" 
                    ? "border-emerald-300 hover:border-emerald-400" 
                    : "border-amber-300 hover:border-amber-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">
                      {item.crop.toLowerCase().includes("tomato") ? "🍅" :
                       item.crop.toLowerCase().includes("potato") ? "🥔" :
                       item.crop.toLowerCase().includes("corn") ? "🌽" :
                       item.crop.toLowerCase().includes("apple") ? "🍎" :
                       item.crop.toLowerCase().includes("grape") ? "🍇" : "🌿"}
                    </span>
                    <div>
                      <h4 className="font-serif text-base font-bold text-gray-900">
                        {item.crop}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Latest scan: {new Date(item.latest_scan_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                    item.status === "Healthy"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}>
                    {item.status === "Healthy" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                    )}
                    <span>{item.status}</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-semibold text-gray-500">Condition:</span>
                    <span className="font-bold text-gray-900">{item.condition}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-semibold text-gray-500">Severity:</span>
                    <span className="font-bold text-emerald-800">{item.severity}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-snug">
                  {item.description}
                </p>

                <div className="pt-1">
                  <Link
                    href={`/history?crop=${item.crop}`}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>View all {item.crop} scans</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. RECENT SCANS LIST */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0d281e]">
              Recent Scans
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Chronological feed of your saved diagnostic scans.
            </p>
          </div>

          <Link
            href="/history"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All Scans ({overview?.total_scans ?? 0})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-200/80 text-center text-xs text-gray-500">
            No saved crop scans yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentScans.map((scan) => (
              <div 
                key={scan.id} 
                className="bg-white rounded-3xl p-5 border border-gray-200 shadow-2xs space-y-3 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {scan.crop_family}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(scan.scanned_at).toLocaleDateString()}</span>
                  </span>
                </div>

                <div>
                  <h4 className="font-serif text-base font-bold text-gray-900 truncate">
                    {scan.disease_name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-gray-600">
                      Confidence: {(scan.confidence * 100).toFixed(1)}%
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-semibold text-purple-700">
                      {scan.severity}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <Link
                    href={`/history?scanId=${scan.id}`}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>View Diagnosis & Guidance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-emerald-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Edit Farm Profile
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Farmer Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Location (State / Region)</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Anand, Gujarat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Farm Size</label>
                <input
                  type="text"
                  value={editFarmSize}
                  onChange={(e) => setEditFarmSize(e.target.value)}
                  placeholder="e.g. 5 acres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">Primary Crops</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCrops.map((c) => {
                    const active = editCrops.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCrop(c)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          active 
                            ? "bg-emerald-700 text-white shadow-2xs" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl green-gradient-bg text-white font-bold shadow-xs hover:opacity-95"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
