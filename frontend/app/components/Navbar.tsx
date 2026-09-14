"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Sprout,
  History,
  UserCheck,
  LogOut,
  LogIn,
  UserPlus
} from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseNavItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Detect Disease", href: "/detect", icon: Microscope },
  ];

  const authenticatedNavItems = [
    { label: "My Farm", href: "/my-farm", icon: Sprout },
    { label: "Scan History", href: "/history", icon: History },
  ];

  const secondaryNavItems = [
    { label: "Map & Monitor", href: "/map", icon: Map },
    { label: "Crop Rotation", href: "/rotation", icon: Sprout },
    { label: "Weather", href: "/weather", icon: CloudSun },
    { label: "Assistant", href: "/assistant", icon: Bot },
  ];

  const navItems = isLoggedIn 
    ? [...baseNavItems, ...authenticatedNavItems, ...secondaryNavItems]
    : [...baseNavItems, ...secondaryNavItems];

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/");
  };

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
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-100 text-emerald-800 shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-semibold"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-700" : "text-gray-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 3. Right: Location Chip, Weather, Notification Bell, Profile / Auth */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Location Chip */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{user?.location || "Ahmedabad, GJ"}</span>
          </div>

          {/* Weather Chip */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-700">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>29°C</span>
          </div>

          {/* Notification Bell */}
          <button 
            type="button" 
            aria-label="Notifications"
            className="relative p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Profile / Auth Dropdown */}
          <div className="relative" ref={dropdownRef}>
            {isLoggedIn && user ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-950 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.name ? user.name[0].toUpperCase() : "F"}
                </div>
                <span className="text-xs font-bold hidden sm:inline max-w-[100px] truncate">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="px-3 py-1 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="px-3.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-full shadow-xs transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Dropdown Menu */}
            {dropdownOpen && isLoggedIn && user && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-200/90 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                  {user.location && (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {user.location}
                    </p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/my-farm"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                  >
                    <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                    <span>My Farm</span>
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scan History</span>
                  </Link>
                </div>

                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
