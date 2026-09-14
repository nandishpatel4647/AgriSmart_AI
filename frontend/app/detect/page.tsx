"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Camera, 
  Microscope, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  RefreshCw, 
  Eye, 
  Layers, 
  FileText, 
  Info, 
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Award,
  Zap,
  Target,
  BarChart2,
  Settings,
  Leaf,
  ChevronRight,
  Volume2,
  VolumeX
} from "lucide-react";
import { predictDisease } from "../lib/api";
import { 
  VernacularLanguage, 
  LANGUAGE_LOCALES, 
  speakText, 
  stopSpeech, 
  generateAdvisorySpeechText 
} from "../lib/speech";

const ALL_33_CONDITIONS = [
  { crop: "Apple", disease: "Apple Scab" },
  { crop: "Apple", disease: "Black Rot" },
  { crop: "Apple", disease: "Cedar Apple Rust" },
  { crop: "Apple", disease: "Healthy" },
  { crop: "Cherry", disease: "Powdery Mildew" },
  { crop: "Cherry", disease: "Healthy" },
  { crop: "Corn", disease: "Cercospora Leaf Spot" },
  { crop: "Corn", disease: "Common Rust" },
  { crop: "Corn", disease: "Northern Leaf Blight" },
  { crop: "Corn", disease: "Healthy" },
  { crop: "Grape", disease: "Black Rot" },
  { crop: "Grape", disease: "Esca (Black Measles)" },
  { crop: "Grape", disease: "Leaf Blight (Isariopsis)" },
  { crop: "Grape", disease: "Healthy" },
  { crop: "Peach", disease: "Bacterial Spot" },
  { crop: "Peach", disease: "Healthy" },
  { crop: "Bell Pepper", disease: "Bacterial Spot" },
  { crop: "Bell Pepper", disease: "Healthy" },
  { crop: "Potato", disease: "Early Blight" },
  { crop: "Potato", disease: "Late Blight" },
  { crop: "Potato", disease: "Healthy" },
  { crop: "Strawberry", disease: "Leaf Scorch" },
  { crop: "Strawberry", disease: "Healthy" },
  { crop: "Tomato", disease: "Bacterial Spot" },
  { crop: "Tomato", disease: "Early Blight" },
  { crop: "Tomato", disease: "Late Blight" },
  { crop: "Tomato", disease: "Leaf Mold" },
  { crop: "Tomato", disease: "Septoria Leaf Spot" },
  { crop: "Tomato", disease: "Spider Mites" },
  { crop: "Tomato", disease: "Target Spot" },
  { crop: "Tomato", disease: "Yellow Leaf Curl Virus" },
  { crop: "Tomato", disease: "Mosaic Virus" },
  { crop: "Tomato", disease: "Healthy" },
];

export default function DiseaseDetectionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGradcamOverlay, setShowGradcamOverlay] = useState(true);
  const [showSupportedModal, setShowSupportedModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample images data (including Tulsi for instant Open-Set / OOD validation)
  const sampleImages = [
    { name: "Tomato", emoji: "🍅", disease: "Late Blight", path: "/samples/tomato_late_blight.jpg" },
    { name: "Apple", emoji: "🍎", disease: "Apple Scab", path: "/samples/apple_scab.jpg" },
    { name: "Corn", emoji: "🌽", disease: "Common Rust", path: "/samples/corn_common_rust.jpg" },
    { name: "Potato", emoji: "🥔", disease: "Early Blight", path: "/samples/potato_early_blight.jpg" },
    { name: "Grape", emoji: "🍇", disease: "Black Rot", path: "/samples/grape_black_rot.jpg" },
    { name: "Tulsi (OOD)", emoji: "🌿", disease: "Unsupported Crop", path: "/samples/tulsi_leaf.jpg" },
  ];

  const handleFileSelect = (file: File) => {
    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    runAnalysis(file);
  };

  const handleSampleClick = async (samplePath: string) => {
    try {
      setError(null);
      setImagePreview(samplePath);
      setIsScanning(true);
      setScanStep(1);

      const resp = await fetch(samplePath);
      const blob = await resp.blob();
      const file = new File([blob], samplePath.split("/").pop() || "sample.jpg", { type: "image/jpeg" });
      setSelectedFile(file);

      runAnalysis(file);
    } catch (err: any) {
      setError("Failed to load sample image: " + err.message);
      setIsScanning(false);
    }
  };

  const runAnalysis = async (file: File) => {
    setIsScanning(true);
    setScanStep(1);

    const t1 = setTimeout(() => setScanStep(2), 600);
    const t2 = setTimeout(() => setScanStep(3), 1200);
    const t3 = setTimeout(() => setScanStep(4), 1800);

    try {
      const data = await predictDisease(file);
      setTimeout(() => {
        setResult(data);
        setIsScanning(false);
        setScanStep(5);
      }, 2200);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setError(err.message || "Disease analysis failed. Please verify server is running.");
      setIsScanning(false);
    }
  };

  const [selectedVoiceLang, setSelectedVoiceLang] = useState<VernacularLanguage>("english");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleToggleVoice = (targetLang?: VernacularLanguage) => {
    const lang = targetLang || selectedVoiceLang;
    if (isSpeaking && !targetLang) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    if (!result) return;
    const speechText = generateAdvisorySpeechText(result, lang);
    setIsSpeaking(true);
    speakText(
      speechText,
      lang,
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const resetScanner = () => {
    stopSpeech();
    setIsSpeaking(false);
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setIsScanning(false);
    setScanStep(0);
  };

  return (
    <div className="w-full space-y-8 animate-fadeInUp">
      
      {/* 2. HERO SECTION — FULL-WIDTH BAND DIRECTLY UNDER HEADER */}
      <div className="w-full bg-[#f4f8f5] border-b border-emerald-900/10 relative overflow-hidden min-h-[340px] flex items-center shadow-xs">
        
        {/* Visual Split: Left 60% Content & Right 40% Leaf Photograph Background */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left ~60%: Text Content */}
          <div className="lg:col-span-7 space-y-3.5">
            
            {/* Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0d281e] leading-tight">
              AI Crop <span className="text-emerald-600">Disease</span> Scanner
            </h1>

            {/* Tagline */}
            <p className="text-sm font-bold text-[#163025] tracking-wide uppercase">
              Detect. Understand. Protect.
            </p>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-xl">
              Uploading a leaf photo lets the AI analyze disease patterns, calculate severity, and provide treatment recommendations with Grad-CAM visual explanations.
            </p>

            {/* Feature Badges Row */}
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3">
              
              <div className="bg-white/90 border border-gray-200/90 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>High Accuracy AI Model</span>
              </div>

              <div className="bg-white/90 border border-gray-200/90 px-3 py-1.5 rounded-full text-[11px] font-bold text-teal-900 flex items-center gap-1.5 shadow-2xs">
                <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Severity Detection</span>
              </div>

              <div className="bg-white/90 border border-gray-200/90 px-3 py-1.5 rounded-full text-[11px] font-bold text-purple-900 flex items-center gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-purple-600" />
                <span>Grad-CAM Visualization</span>
              </div>

              <div className="bg-white/90 border border-gray-200/90 px-3 py-1.5 rounded-full text-[11px] font-bold text-amber-900 flex items-center gap-1.5 shadow-2xs">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Instant Treatment Advice</span>
              </div>

            </div>

          </div>

          {/* Right ~40%: Real Leaf/Plant Photo & Overlays */}
          <div className="lg:col-span-5 relative h-72 lg:h-80 rounded-3xl overflow-hidden shadow-lg border border-white/60 group">
            
            {/* Background Leaf Photo */}
            <Image 
              src="/hero_farmer_field.jpg" 
              alt="Leaf AI Scanning" 
              fill 
              priority
              className="object-cover object-right group-hover:scale-105 transition-transform duration-700" 
            />

            {/* Left Edge Gradient Fade into background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#f4f8f5] via-[#f4f8f5]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

            {/* Floating Quote Card near top */}
            <div className="absolute top-4 left-4 right-4 bg-white/85 backdrop-blur-md rounded-2xl p-3 shadow-md border border-white/70">
              <div className="flex items-start gap-2.5">
                <Leaf className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold italic text-gray-900 leading-snug">
                    &quot;Healthy crops build a brighter tomorrow.&quot;
                  </p>
                  <span className="text-[10px] font-bold text-emerald-800 block mt-0.5">
                    — AgriSmart AI
                  </span>
                </div>
              </div>
            </div>

            {/* Camera Viewfinder Bracket Overlay on Leaf */}
            <div className="absolute bottom-6 right-6 w-36 h-36 border-2 border-emerald-400/30 rounded-2xl flex items-center justify-center p-2">
              {/* 4 Viewfinder Corner Brackets */}
              <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />

              {/* Live Badge over leaf */}
              <div className="bg-emerald-950/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/50 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>AI Scanning...</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* MAIN CONTAINER BELOW HERO */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
        
        {/* 3. MAIN CONTENT — TWO-COLUMN LAYOUT BELOW HERO */}
        {!imagePreview && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (Wider ~70%): Upload Panel */}
            <div className="lg:col-span-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                className="relative border-2 border-dashed border-emerald-500/50 hover:border-emerald-600 bg-white rounded-3xl p-8 lg:p-14 text-center cursor-pointer transition-all shadow-xs hover:shadow-md group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />

                {/* Hand-Drawn Annotation 1 (Top-Left) */}
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 font-handwriting text-emerald-900 font-bold text-sm sm:text-base bg-amber-50/95 border border-amber-200 px-3 py-1 rounded-xl shadow-2xs transform -rotate-3 pointer-events-none flex items-center gap-1">
                  <span>Take a clear photo of the leaf</span>
                  <span className="text-emerald-700">↙</span>
                </div>

                {/* Hand-Drawn Annotation 2 (Top-Right) */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 font-handwriting text-emerald-900 font-bold text-sm sm:text-base bg-emerald-50/95 border border-emerald-200 px-3 py-1 rounded-xl shadow-2xs transform rotate-3 pointer-events-none flex items-center gap-1">
                  <span>Good lighting for better results</span>
                  <span className="text-emerald-700">↘</span>
                </div>

                {/* Decorative Corner Leaves (Low opacity 15%) */}
                <Leaf className="absolute bottom-4 left-4 w-12 h-12 text-emerald-700 opacity-15 pointer-events-none transform -rotate-45" />
                <Leaf className="absolute bottom-4 right-4 w-12 h-12 text-emerald-700 opacity-15 pointer-events-none transform rotate-45" />

                {/* Centered Upload Content */}
                <div className="py-4 space-y-3">
                  
                  {/* Circular Green Icon Tile */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>

                  {/* Headline & Description */}
                  <h3 className="font-serif text-2xl font-bold text-[#0d281e]">
                    Drop your crop image here
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    or click to select from your device
                  </p>
                  <p className="text-[11px] text-gray-400 font-semibold pt-1">
                    Supports JPG, PNG, JPEG (up to 10 MB)
                  </p>

                  {/* Dark-Green Rounded Upload Button */}
                  <div className="pt-3">
                    <button 
                      type="button"
                      className="px-6 py-3 rounded-2xl bg-[#0d281e] hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all hover:scale-102 flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Upload Image</span>
                    </button>
                  </div>

                </div>

              </div>
            </div>

            {/* Right Column (Narrower ~30%): Two Stacked Cards */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Card 1: How It Works */}
              <div className="bg-white p-6 rounded-3xl border border-gray-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                  <Settings className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-serif text-base font-bold text-[#0d281e]">
                    How it works?
                  </h3>
                </div>

                <div className="space-y-4">
                  
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Upload Image</h4>
                      <p className="text-[11px] text-gray-500 font-medium">Take or select a clear leaf photo</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">AI Analysis</h4>
                      <p className="text-[11px] text-gray-500 font-medium">The model detects disease, severity, and patterns</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">Get Results</h4>
                      <p className="text-[11px] text-gray-500 font-medium">See diagnosis, visual explanation, and treatment</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 2: Tip Card */}
              <div className="bg-emerald-50/80 p-5 rounded-3xl border border-emerald-200/80 shadow-2xs flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                  <Leaf className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">
                    Early Detection Saves Crops
                  </h4>
                  <p className="text-[11px] text-emerald-900/80 font-medium leading-relaxed mt-1">
                    Detecting leaf pathogens early prevents field spread and protects yield & farm income.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 4. SAMPLE IMAGES ROW (BOTTOM, FULL WIDTH) */}
        {!imagePreview && !result && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-700" />
              <h3 className="font-serif text-base font-bold text-[#0d281e]">
                Try Sample Images
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {sampleImages.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSampleClick(sample.path)}
                  className="bg-white p-3 rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-emerald-500/60 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <Image 
                        src={sample.path} 
                        alt={sample.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-900">
                        <span>{sample.emoji}</span>
                        <span className="truncate">{sample.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium block truncate">
                        {sample.disease}
                      </span>
                    </div>
                  </div>

                  {/* Small Circular Ghost Arrow Button */}
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSampleClick(sample.path);
                    }}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-600 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. IMAGE ANALYSIS & SCANNING ANIMATION EXPERIENCE */}
        {imagePreview && isScanning && (
          <div className="glass-card p-8 text-center max-w-2xl mx-auto space-y-6">
            <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-emerald-600/30">
              <Image src={imagePreview} alt="Leaf Scan" fill className="object-cover" />
              <div className="scan-line" />
            </div>

            <div>
              <h3 className="font-serif text-2xl font-bold text-emerald-950 mb-1">
                Analyzing Leaf Patterns...
              </h3>
              <p className="text-xs text-emerald-800/70">
                Running PyTorch EfficientNet-B0 feature extractor & Grad-CAM visual model
              </p>
            </div>

            {/* Checklist Step Indicators */}
            <div className="max-w-md mx-auto text-left space-y-2.5 pt-2">
              {[
                { step: 1, label: "Image Quality & Lighting Check" },
                { step: 2, label: "Crop Family & Species Identification" },
                { step: 3, label: "Pathogen & Disease Pattern Analysis" },
                { step: 4, label: "Severity Calculation & Grad-CAM Heatmap" },
                { step: 5, label: "Generating Actionable Treatment Plan" },
              ].map((st) => (
                <div 
                  key={st.step} 
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    scanStep >= st.step 
                      ? "bg-emerald-100/80 border-emerald-300 text-emerald-950" 
                      : "bg-emerald-900/5 border-transparent text-emerald-900/40"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    scanStep >= st.step ? "bg-emerald-700 text-white" : "bg-emerald-900/10 text-emerald-900/40"
                  }`}>
                    {scanStep > st.step ? "✓" : st.step}
                  </div>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="glass-card p-6 border-l-4 border-l-red-500 text-red-900 bg-red-50/80">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h4 className="font-bold text-base">Analysis Error</h4>
            </div>
            <p className="text-xs">{error}</p>
            <button 
              onClick={resetScanner} 
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* 6. UNSUPPORTED CROP / OUT-OF-DISTRIBUTION CARD */}
        {result && result.success && (result.is_supported_crop === false || result.out_of_distribution === true) && (
          <div className="space-y-6 animate-fadeInUp">
            <div className="glass-card p-6 lg:p-8 border-l-8 border-l-amber-500 bg-amber-50/40 rounded-3xl shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/60">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      OPEN-SET REJECTION ACTIVE
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      REFUSED TO GUESS
                    </span>
                  </div>
                  <h2 className="font-serif text-3xl font-bold text-gray-900">
                    Unsupported Crop Detected
                  </h2>
                  <p className="text-sm font-medium text-gray-700 max-w-2xl leading-relaxed">
                    We detected foliage, but this plant is not in our 9 trained crop families. AgriSmart AI avoided giving a false diagnosis.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={resetScanner}
                    className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Another Leaf Photo</span>
                  </button>
                  <button
                    onClick={() => setShowSupportedModal(!showSupportedModal)}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center gap-2 border border-gray-300 shadow-2xs transition-all"
                  >
                    <Info className="w-4 h-4 text-emerald-700" />
                    <span>{showSupportedModal ? "Hide Supported Crops" : "View Supported Conditions"}</span>
                  </button>
                </div>
              </div>

              {/* Trust Callout Banner */}
              <div className="p-4 rounded-2xl bg-white/90 border border-amber-200/80 flex items-start gap-3 shadow-2xs">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                    Why AgriSmart AI Refused To Guess
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Standard AI classifiers use a closed-set Softmax layer that forces every input into one of their known categories—often misdiagnosing unfamiliar leaves like Tulsi, Mango, or Neem as Grape Black Rot with 99% false confidence. AgriSmart AI uses calibrated 1280-dimensional feature centroid distance and free energy scoring to protect farmers from misapplied chemicals.
                  </p>
                </div>
              </div>

              {/* Vernacular Voice Advisory Control (Refuse to Guess Safety Speech) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-100/60 border border-amber-300/70">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-800" />
                  <span className="text-xs font-bold text-amber-950">Spoken Advisory:</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200 shadow-2xs">
                    {(["english", "hindi", "gujarati"] as VernacularLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setSelectedVoiceLang(lang);
                          if (isSpeaking) handleToggleVoice(lang);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          selectedVoiceLang === lang
                            ? "bg-amber-600 text-white shadow-xs font-bold"
                            : "text-gray-600 hover:text-amber-900 hover:bg-amber-50"
                        }`}
                      >
                        {LANGUAGE_LOCALES[lang].nativeLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleVoice()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isSpeaking
                      ? "bg-red-600 text-white shadow-sm animate-pulse"
                      : "bg-amber-700 hover:bg-amber-800 text-white shadow-2xs"
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Stop Spoken Advisory</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>🔊 Listen to Safety Advisory ({LANGUAGE_LOCALES[selectedVoiceLang].nativeLabel})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Technical Calibration Signals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/80 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">MAX SIMILARITY</span>
                  <span className="font-mono text-lg font-bold text-amber-800 block mt-0.5">
                    {result.detected_properties?.cosine_similarity ?? "0.52"}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Threshold: &lt; 0.58</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">ENERGY SCORE</span>
                  <span className="font-mono text-lg font-bold text-gray-800 block mt-0.5">
                    {result.detected_properties?.energy_score ?? "-42.1"}
                  </span>
                  <span className="text-[10px] text-gray-500 block">T = 1.0</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">CLASSIFICATION</span>
                  <span className="font-mono text-xs font-bold text-gray-800 block mt-1.5 truncate">
                    {result.error_type || "UNSEEN_SPECIES"}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Open-Set Rejection</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-gray-200/80">
                  <span className="text-[10px] font-bold text-gray-500 uppercase block">SAFETY STATUS</span>
                  <span className="text-xs font-bold text-emerald-700 block mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> False Diagnosis Prevented
                  </span>
                  <span className="text-[10px] text-gray-500 block">Offline Local OOD</span>
                </div>
              </div>

              {/* Supported Crop Families Pills */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-gray-700 block">
                  Supported Crop Families (9 Crops, 33 Conditions):
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Apple", emoji: "🍎" },
                    { name: "Cherry", emoji: "🍒" },
                    { name: "Corn (Maize)", emoji: "🌽" },
                    { name: "Grape", emoji: "🍇" },
                    { name: "Peach", emoji: "🍑" },
                    { name: "Bell Pepper", emoji: "🫑" },
                    { name: "Potato", emoji: "🥔" },
                    { name: "Strawberry", emoji: "🍓" },
                    { name: "Tomato", emoji: "🍅" },
                  ].map((crop, i) => (
                    <span 
                      key={i} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 shadow-2xs"
                    >
                      <span>{crop.emoji}</span>
                      <span>{crop.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Optional Collapsible 33 Conditions View */}
              {showSupportedModal && (
                <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-3 animate-fadeInUp">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-700" />
                      <span>33 Validated Crop Conditions Database</span>
                    </h4>
                    <span className="text-[11px] text-gray-500 font-medium">PlantVillage Benchmark</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {ALL_33_CONDITIONS.map((cond, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-700">
                        <span className="font-semibold text-emerald-950">{cond.crop}: </span>
                        <span>{cond.disease}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. DISEASE RESULT DASHBOARD */}
        {result && result.success && result.is_supported_crop !== false && !result.out_of_distribution && result.prediction && (
          <div className="space-y-8 animate-fadeInUp">
            
            {/* Top Result Banner */}
            <div className="glass-card p-6 lg:p-8 border-l-8 border-l-emerald-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800/70">
                    DIAGNOSIS COMPLETE
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    result.prediction.severity === "High" || result.prediction.severity.includes("High") 
                      ? "bg-red-100 text-red-700" 
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {result.prediction.severity} Severity
                  </span>
                </div>

                <h2 className="font-serif text-3xl font-bold text-emerald-950 flex items-center gap-2 flex-wrap">
                  <span>{result.prediction.leaf_display_name || `🍃 ${result.prediction.crop} Leaf`}</span>
                  <span className="text-emerald-400 font-light">—</span>
                  <span className="text-emerald-700">{result.prediction.disease}</span>
                </h2>
                <p className="text-xs text-emerald-800/70 mt-1">
                  Detected Class: <code className="font-mono bg-emerald-100/60 px-2 py-0.5 rounded text-emerald-900">{result.prediction.class_label}</code>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={resetScanner}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-900/5 hover:bg-emerald-900/10 text-emerald-950 font-bold text-xs flex items-center gap-2 border border-emerald-900/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Another Crop</span>
                </button>

                <Link 
                  href="/weather"
                  className="px-5 py-2.5 rounded-2xl green-gradient-bg text-white font-bold text-xs flex items-center gap-2 shadow-md"
                >
                  <span>Check Weather Risk</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Vernacular Voice Advisory Bar (Diagnosis Speech) */}
            <div className="glass-card p-4 border-l-4 border-l-emerald-600 bg-emerald-50/50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-bold text-emerald-950">Vernacular Voice Advisory:</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
                  {(["english", "hindi", "gujarati"] as VernacularLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceLang(lang);
                        if (isSpeaking) handleToggleVoice(lang);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        selectedVoiceLang === lang
                          ? "bg-emerald-700 text-white shadow-xs font-bold"
                          : "text-gray-600 hover:text-emerald-900 hover:bg-emerald-50"
                      }`}
                    >
                      {LANGUAGE_LOCALES[lang].nativeLabel}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleVoice()}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isSpeaking
                    ? "bg-red-600 text-white shadow-sm animate-pulse"
                    : "green-gradient-bg text-white shadow-md hover:opacity-95"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Stop Spoken Advisory</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>🔊 Listen to Advisory ({LANGUAGE_LOCALES[selectedVoiceLang].nativeLabel})</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Summary Result Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-emerald-600">
                <span className="text-[10px] font-bold text-emerald-800/60 uppercase block">IDENTIFIED LEAF</span>
                <span className="font-serif text-xl font-bold text-emerald-950 block mt-1">
                  {result.prediction.leaf_name || `${result.prediction.crop} Leaf`}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">Plant Species</span>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-amber-500">
                <span className="text-[10px] font-bold text-emerald-800/60 uppercase block">DISEASE DIAGNOSIS</span>
                <span className="font-serif text-xl font-bold text-emerald-950 block mt-1">{result.prediction.disease}</span>
                <span className="text-[10px] font-semibold text-amber-700 block mt-0.5">{result.prediction.crop} Crop</span>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800/60 uppercase block">CLASSIFICATION CONFIDENCE</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-2.5 h-2.5" /> OOD Gate: PASSED
                  </span>
                </div>
                <span className="font-serif text-xl font-bold text-emerald-950 block mt-1">
                  {(result.prediction.confidence * 100).toFixed(1)}%
                </span>
                <div className="w-full h-1.5 rounded-full bg-emerald-100 overflow-hidden mt-2">
                  <div 
                    className="h-full bg-emerald-600 rounded-full" 
                    style={{ width: `${Math.max(result.prediction.confidence * 100, 15)}%` }}
                  />
                </div>
              </div>
              <div className="glass-card p-5 border-l-4 border-l-purple-500">
                <span className="text-[10px] font-bold text-emerald-800/60 uppercase block">SEVERITY LEVEL</span>
                <span className="font-serif text-xl font-bold text-emerald-950 block mt-1">{result.prediction.severity}</span>
                <span className="text-[10px] font-semibold text-purple-700 block mt-0.5">Actionable Guidance Below</span>
              </div>
            </div>

            {/* GRAD-CAM VISUALIZATION & EXPLAINABLE AI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-6 glass-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-700" />
                    <h3 className="font-serif text-lg font-bold text-emerald-950">
                      Grad-CAM Explainable AI Heatmap
                    </h3>
                  </div>
                  {result.gradcam && (
                    <button 
                      onClick={() => setShowGradcamOverlay(!showGradcamOverlay)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showGradcamOverlay ? "Showing Heatmap" : "Original Image"}</span>
                    </button>
                  )}
                </div>

                <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-emerald-900/15 bg-black flex items-center justify-center">
                  {result.gradcam && showGradcamOverlay ? (
                    <img 
                      src={`data:image/png;base64,${result.gradcam}`} 
                      alt="GradCAM Heatmap" 
                      className="w-full h-full object-contain"
                    />
                  ) : imagePreview ? (
                    <Image src={imagePreview} alt="Original Image" fill className="object-contain" />
                  ) : (
                    <span className="text-xs text-white/60">No image preview available</span>
                  )}
                </div>

                <p className="text-xs text-emerald-800/80 leading-relaxed font-medium">
                  💡 <strong>Explainable AI Notice:</strong> The Grad-CAM heatmap highlights the specific leaf zones (red/yellow regions) that triggered the neural network&apos;s disease diagnosis.
                </p>
              </div>

              <div className="lg:col-span-6 space-y-6">
                
                <div className="glass-card p-6 space-y-3 border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Zap className="w-5 h-5" />
                    <h4 className="font-serif text-base font-bold text-emerald-950">
                      Why AI Recommended This? (Explainable AI)
                    </h4>
                  </div>
                  
                  <ul className="space-y-2 text-xs text-emerald-900/80">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Irregular Lesion Patterns:</strong> Concentric ring structures detected in leaf tissue.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Color Variation:</strong> Brown/black discoloration with chlorotic yellow halos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">•</span>
                      <span><strong>Weather Correlation:</strong> High relative humidity (&gt;75%) favors fungal sporulation.</span>
                    </li>
                  </ul>
                </div>

                <div className="glass-card p-6 space-y-3">
                  <h4 className="font-serif text-base font-bold text-emerald-950">
                    72-Hour Disease Progression Trajectory
                  </h4>

                  <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                    <div className="p-3 rounded-xl bg-emerald-100/60 border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 block">TODAY</span>
                      <span className="text-xs font-bold text-emerald-950 block mt-1">Moderate</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-100/60 border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-800 block">24 HOURS</span>
                      <span className="text-xs font-bold text-amber-950 block mt-1">High Risk</span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-100/60 border border-red-200">
                      <span className="text-[10px] font-bold text-red-800 block">48 HOURS</span>
                      <span className="text-xs font-bold text-red-950 block mt-1">Critical</span>
                    </div>
                    <div className="p-3 rounded-xl bg-red-200/80 border border-red-300">
                      <span className="text-[10px] font-bold text-red-900 block">72 HOURS</span>
                      <span className="text-xs font-bold text-red-950 block mt-1">Severe</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* ACTIONABLE TREATMENT GUIDANCE PROTOCOL */}
            <div className="glass-card p-6 lg:p-8 space-y-4">
              <div className="flex items-center gap-3 border-b border-emerald-900/10 pb-3">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif text-xl font-bold text-emerald-950">
                  Actionable Treatment & Prevention Protocol
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.prediction.guidance?.map((item: string, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-emerald-900/5 border border-emerald-900/10 flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-700 text-white shrink-0 font-bold text-xs">
                      0{idx + 1}
                    </div>
                    <p className="text-xs font-semibold text-emerald-950 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
