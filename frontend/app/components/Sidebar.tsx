"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Microscope, 
  CloudSun, 
  Droplets, 
  Radio, 
  Bot, 
  BarChart3, 
  Settings, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Disease Scanner", href: "/detect", icon: Microscope, badge: "AI Vision" },
    { label: "Weather Intelligence", href: "/weather", icon: CloudSun },
    { label: "Smart Irrigation", href: "/irrigation", icon: Droplets },
    { label: "IoT Telemetry", href: "/telemetry", icon: Radio, live: true },
    { label: "AI Assistant", href: "/assistant", icon: Bot, badge: "Voice" },
    { label: "Farm Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleNavClick = (href: string) => {
    setClickedItem(href);
    setTimeout(() => setClickedItem(null), 250);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4">
      {/* Navigation Links */}
      <div className="space-y-6">
        
        {/* Navigation Category Label */}
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900/50">
            Navigation Command
          </span>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            <span className="live-dot w-1.5 h-1.5" />
            <span>v2.6 SIH</span>
          </div>
        </div>

        {/* Links List with Animated Sliding Indicator & Icon Scale Feedback */}
        <nav className="space-y-1.5 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const isClicked = clickedItem === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors duration-150 group ${
                  isActive
                    ? "text-emerald-950 bg-gradient-to-r from-emerald-800/15 to-emerald-600/5 border border-emerald-800/20 shadow-xs"
                    : "text-emerald-900/70 hover:text-emerald-950 hover:bg-emerald-900/5"
                }`}
              >
                {/* Active Sliding Vertical Pill (180ms ease-out) */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarPill"
                    transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                    className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-gradient-to-b from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-600/50"
                  />
                )}

                {/* Icon with 1.0 -> 1.12 -> 1.0 click feedback animation */}
                <motion.div 
                  animate={{ scale: isClicked ? 1.12 : 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`p-2 rounded-xl transition-colors ${
                    isActive 
                      ? "bg-emerald-900 text-white shadow-xs" 
                      : "bg-emerald-900/5 text-emerald-800 group-hover:bg-emerald-900/10 group-hover:text-emerald-950"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </motion.div>

                <span className="flex-1 tracking-tight">{item.label}</span>

                {/* Optional Badges */}
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-950 text-emerald-300"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.live && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="live-dot w-1.5 h-1.5" />
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* SIH AI Engine Badge */}
        <div className="p-4 rounded-2xl green-gradient-bg text-white shadow-lg shadow-emerald-950/20 relative overflow-hidden group">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
              SIH AI Engine
            </span>
          </div>

          <p className="text-xs font-semibold text-emerald-100 leading-snug mb-3">
            Real-time EfficientNet-B0 + Grad-CAM Explainable AI active.
          </p>

          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 pt-2 border-t border-white/15">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              96.4% Accuracy
            </span>
            <span className="text-white/80">PyTorch CUDA</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-emerald-900/10 flex items-center justify-between text-xs text-emerald-800/60 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>API Gateways 200 OK</span>
        </div>
        <span className="font-mono text-[10px]">127.0.0.1</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-[calc(100vh-4.25rem)] sticky top-17 pl-4 py-4 pr-2">
        <div className="h-full glass-card border border-emerald-900/10 shadow-sm overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 overflow-y-auto">
            <div className="p-4 border-b border-emerald-900/10 flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-emerald-950">AgriSmart AI Navigation</span>
              <button 
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-emerald-900 hover:bg-emerald-50"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-emerald-900/10 px-4 py-2 flex items-center justify-around shadow-lg">
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl ${pathname === "/" ? "text-emerald-700 font-bold" : "text-emerald-900/60"}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </Link>
        <Link 
          href="/detect" 
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl ${pathname === "/detect" ? "text-emerald-700 font-bold" : "text-emerald-900/60"}`}
        >
          <Microscope className="w-5 h-5" />
          <span className="text-[10px]">Scan</span>
        </Link>
        <Link 
          href="/weather" 
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl ${pathname === "/weather" ? "text-emerald-700 font-bold" : "text-emerald-900/60"}`}
        >
          <CloudSun className="w-5 h-5" />
          <span className="text-[10px]">Weather</span>
        </Link>
        <Link 
          href="/assistant" 
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl ${pathname === "/assistant" ? "text-emerald-700 font-bold" : "text-emerald-900/60"}`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px]">AI Assist</span>
        </Link>
      </div>
    </>
  );
}
