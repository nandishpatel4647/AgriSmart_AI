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
