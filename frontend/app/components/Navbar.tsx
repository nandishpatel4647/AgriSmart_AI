"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudSun, LayoutDashboard, Leaf, MessageCircle, ScanLine, Sprout, Menu, X, ChevronDown, Compass, RefreshCw, Radio, MapPin } from "lucide-react";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard-link" },
  { to: "/detect", label: "Detect Disease", icon: ScanLine, testId: "nav-detect-link" },
  { to: "/weather", label: "Weather", icon: CloudSun, testId: "nav-weather-link" },
  { to: "/assistant", label: "AI Assistant", icon: MessageCircle, testId: "nav-assistant-link" },
];

const secondaryLinks = [
  { to: "/recommendation", label: "Crop Recommendation", icon: Sprout },
  { to: "/map", label: "Satellite Map", icon: MapPin },
  { to: "/rotation", label: "Crop Rotation", icon: RefreshCw },
  { to: "/telemetry", label: "IoT Sensors", icon: Radio },
  { to: "/history", label: "Scan History", icon: Compass },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#19352b]/10 bg-[#f5f1e8]/90 backdrop-blur-xl" data-testid="app-header">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
        
        {/* Brand Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" data-testid="header-logo-link">
          <span className="flex size-9 items-center justify-center rounded-[13px] bg-[#19352b] text-[#f6c86e] shadow-xs">
            <Sprout size={20} />
          </span>
          <span className="font-heading text-[17px] font-extrabold tracking-[-0.04em]" data-testid="header-logo-text">
            AgriSmart <span className="text-[#b77731]">AI</span>
          </span>
        </Link>

        {/* Primary Desktop Navigation */}
        <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-2" data-testid="primary-navigation">
          {primaryLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                className={`nav-route ${isActive ? "nav-route-active" : ""}`}
                data-testid={testId}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* More Tools Dropdown (Opens on Hover as requested) */}
          <div 
            className="relative py-2"
            onMouseEnter={() => setMoreDropdownOpen(true)}
            onMouseLeave={() => setMoreDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`nav-route flex items-center gap-1.5 cursor-pointer ${moreDropdownOpen ? "bg-[#19352b]/10 text-[#19352b]" : ""}`}
              aria-expanded={moreDropdownOpen}
            >
              <span>More</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${moreDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {moreDropdownOpen && (
              <div 
                className="absolute left-0 top-[90%] pt-1 w-52 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="rounded-2xl border border-[#19352b]/15 bg-[#fff8eb] p-2 shadow-[0_16px_40px_rgba(25,53,43,0.14)]">
                  {secondaryLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      href={to}
                      onClick={() => setMoreDropdownOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
                        pathname === to ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b]/80 hover:bg-[#19352b]/08 hover:text-[#19352b]"
                      }`}
                    >
                      <Icon size={15} className="text-[#b77731] shrink-0" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/detect"
            className="hidden shrink-0 items-center gap-2 rounded-full bg-[#b77731] hover:bg-[#a36829] px-5 py-2.5 text-xs font-bold text-[#fff8eb] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 sm:flex cursor-pointer"
            data-testid="header-scan-cta"
          >
            <Leaf size={14} />
            <span>New scan</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex size-9 items-center justify-center rounded-xl bg-[#19352b]/08 text-[#19352b]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#19352b]/10 bg-[#f5f1e8] px-5 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {primaryLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                  isActive ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b]/70 hover:bg-[#19352b]/06"
                }`}
                data-testid={testId}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-[#19352b]/10">
            <span className="px-4 text-[10px] font-bold uppercase tracking-wider text-[#19352b]/40">Field Tools</span>
            {secondaryLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                href={to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#19352b]/70 hover:bg-[#19352b]/06"
              >
                <Icon size={14} className="text-[#b77731]" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/detect"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#b77731] py-3 text-xs font-bold text-[#fff8eb]"
            >
              <Leaf size={14} />
              <span>Start New Scan</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
