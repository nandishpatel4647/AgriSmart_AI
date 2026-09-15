"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  CloudSun, 
  Droplets, 
  LayoutDashboard, 
  Leaf, 
  MessageCircle, 
  ScanLine, 
  Sprout, 
  Menu, 
  X,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard-link" },
  { to: "/detect", label: "Detect Disease", icon: ScanLine, testId: "nav-detect-link" },
  { to: "/weather", label: "Weather", icon: CloudSun, testId: "nav-weather-link" },
  { to: "/irrigation", label: "Smart Irrigation", icon: Droplets, testId: "nav-irrigation-link" },
  { to: "/sustainability", label: "Sustainability", icon: Leaf, testId: "nav-sustainability-link" },
];

const moreLinks = [
  { to: "/recommendation", label: "Crop Recommendation", icon: Sprout, testId: "nav-recommendation-link" },
  { to: "/assistant", label: "AI Assistant", icon: MessageCircle, testId: "nav-assistant-link" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreLinks.some((link) => pathname === link.to);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allLinks = [...primaryLinks, ...moreLinks];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#19352b]/15 bg-[#f5f1e8]/95 backdrop-blur-xl" data-testid="app-header">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        
        {/* Brand Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5" data-testid="header-logo-link">
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-[#19352b] text-[#f6c86e] shadow-sm">
            <Sprout size={22} />
          </span>
          <span className="font-heading text-xl font-black tracking-tight text-[#19352b]" data-testid="header-logo-text">
            AgriSmart <span className="text-[#b77731]">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex min-w-0 flex-1 items-center justify-center gap-1.5 lg:gap-2" data-testid="primary-navigation">
          {primaryLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-bold transition-all ${
                  isActive 
                    ? "bg-[#19352b] text-[#fff8eb] shadow-md scale-[1.02]" 
                    : "text-[#19352b]/85 hover:bg-[#19352b]/10 hover:text-[#19352b]"
                }`}
                data-testid={testId}
              >
                <Icon size={18} className={isActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* More ▾ Dropdown Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
                isMoreActive || moreDropdownOpen
                  ? "bg-[#19352b] text-[#fff8eb] shadow-md"
                  : "text-[#19352b]/85 hover:bg-[#19352b]/10 hover:text-[#19352b]"
              }`}
              data-testid="nav-more-dropdown-btn"
            >
              <MoreHorizontal size={18} className={isMoreActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
              <span>More</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${moreDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {moreDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#fff8eb] border-2 border-[#19352b]/15 p-2 shadow-xl z-50 space-y-1 animate-in fade-in-50 slide-in-from-top-1 duration-150"
                data-testid="nav-more-dropdown-menu"
              >
                {moreLinks.map(({ to, label, icon: Icon, testId }) => {
                  const isActive = pathname === to;
                  return (
                    <Link
                      key={to}
                      href={to}
                      onClick={() => setMoreDropdownOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isActive 
                          ? "bg-[#19352b] text-[#fff8eb]" 
                          : "text-[#19352b] hover:bg-[#19352b]/10"
                      }`}
                      data-testid={testId}
                    >
                      <Icon size={18} className={isActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right CTA Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/detect"
            className="hidden shrink-0 items-center gap-2 rounded-full bg-[#b77731] hover:bg-[#a36829] px-5 py-2.5 text-xs font-extrabold text-[#fff8eb] shadow-md transition-transform duration-200 hover:-translate-y-0.5 sm:flex cursor-pointer"
            data-testid="header-scan-cta"
          >
            <Leaf size={16} />
            <span>New Scan</span>
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex size-10 items-center justify-center rounded-2xl bg-[#19352b]/10 text-[#19352b] font-bold cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#19352b]/15 bg-[#f5f1e8] px-5 py-5 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {allLinks.map(({ to, label, icon: Icon, testId }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-extrabold ${
                  isActive ? "bg-[#19352b] text-[#fff8eb]" : "text-[#19352b] bg-white/70 hover:bg-[#19352b]/10"
                }`}
                data-testid={testId}
              >
                <Icon size={20} className={isActive ? "text-[#f6c86e]" : "text-[#b77731]"} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="pt-2">
            <Link
              href="/detect"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#b77731] py-3.5 text-sm font-extrabold text-[#fff8eb] shadow-md"
            >
              <Leaf size={18} />
              <span>Start New Disease Scan</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
