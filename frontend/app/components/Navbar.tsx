"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MapPin, 
  Sun, 
  Bell, 
  ChevronDown, 
  Leaf,
  LayoutDashboard,
  Microscope,
  CloudSun,
  Bot,
  Map,
  Sprout
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Detect Disease", href: "/detect", icon: Microscope },
    { label: "Map & Monitor", href: "/map", icon: Map },
    { label: "Crop Rotation", href: "/rotation", icon: Sprout },
    { label: "Weather", href: "/weather", icon: CloudSun },
    { label: "Assistant", href: "/assistant", icon: Bot },
  ];

  return (
    <header className="bg-white border-b border-gray-200/90 sticky top-0 z-50 py-2.5 shadow-xs w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* 1. Left: Logo Mark + Wordmark + Tagline */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Leaf className="w-5 h-5 fill-white text-emerald-700" />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center text-xl font-extrabold tracking-tight leading-none">
              <span className="text-[#0d281e]">AgriSmart</span>
              <span className="text-emerald-600 ml-1">AI</span>
            </div>
            <span className="text-[10px] font-medium text-gray-400 mt-0.5 tracking-tight">
              Smarter Farms. Healthier Tomorrow.
            </span>
          </div>
        </Link>

        {/* 2. Center-Left: Nav items with rounded-full active pills */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-semibold"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-gray-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 3. Right: Location Chip, Weather, Notification Bell, Profile Avatar */}
        <div className="flex items-center gap-3 lg:gap-4 shrink-0">
          
          {/* Location Chip in Light Gray Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ahmedabad, GJ</span>
          </div>

          {/* Weather Chip */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>29°C</span>
          </div>

          {/* Notification Bell Icon with Red Dot Badge */}
          <button 
            type="button" 
            aria-label="Notifications"
            className="relative p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Profile Avatar with Chevron */}
          <div className="flex items-center gap-1.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs group-hover:bg-emerald-800 transition-colors">
              F
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>

        </div>

      </div>
    </header>
  );
}
