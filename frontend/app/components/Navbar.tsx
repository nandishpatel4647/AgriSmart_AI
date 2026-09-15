"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudSun, LayoutDashboard, Leaf, MessageCircle, ScanLine, Sprout, Menu, X } from "lucide-react";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard-link" },
  { to: "/detect", label: "Detect Disease", icon: ScanLine, testId: "nav-detect-link" },
  { to: "/weather", label: "Weather", icon: CloudSun, testId: "nav-weather-link" },
  { to: "/recommendation", label: "Crop Recommendation", icon: Sprout, testId: "nav-recommendation-link" },
  { to: "/assistant", label: "AI Assistant", icon: MessageCircle, testId: "nav-assistant-link" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#19352b]/15 bg-[#f5f1e8]/95 backdrop-blur-xl" data-testid="app-header">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        
        {/* Brand Logo - Large Farmer Friendly Branding */}
        <Link href="/" className="flex shrink-0 items-center gap-3" data-testid="header-logo-link">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-[#19352b] text-[#f6c86e] shadow-sm">
            <Sprout size={24} />
          </span>
          <span className="font-heading text-2xl font-black tracking-tight text-[#19352b]" data-testid="header-logo-text">
            AgriSmart <span className="text-[#b77731]">AI</span>
          </span>
        </Link>

        {/* Primary Desktop Navigation - Large Legible Buttons */}
        <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-2 lg:gap-3" data-testid="primary-navigation">
          {primaryLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-base font-bold transition-all ${
                  isActive 
                    ? "bg-[#19352b] text-[#fff8eb] shadow-md scale-[1.02]" 
                    : "text-[#19352b]/85 hover:bg-[#19352b]/10 hover:text-[#19352b]"
                }`}
                data-testid={testId}
              >
                <Icon size={19} className={isActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/detect"
            className="hidden shrink-0 items-center gap-2.5 rounded-full bg-[#b77731] hover:bg-[#a36829] px-6 py-3 text-sm font-extrabold text-[#fff8eb] shadow-md transition-transform duration-200 hover:-translate-y-0.5 sm:flex cursor-pointer"
            data-testid="header-scan-cta"
          >
            <Leaf size={18} />
            <span>New Scan</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex size-11 items-center justify-center rounded-2xl bg-[#19352b]/10 text-[#19352b] font-bold"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#19352b]/15 bg-[#f5f1e8] px-5 py-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {primaryLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-base font-extrabold ${
                  isActive ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b] bg-white/70 hover:bg-[#19352b]/10"
                }`}
                data-testid={testId}
              >
                <Icon size={22} className={isActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="pt-2">
            <Link
              href="/detect"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#b77731] px-5 py-3.5 text-base font-extrabold text-[#fff8eb] shadow-md"
            >
              <Leaf size={20} />
              <span>New Scan</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
