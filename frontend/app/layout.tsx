"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import "./globals.css";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/ScrollToTop";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en" className="h-full">
      <head>
        <title>AgriSmart AI — Farm Intelligence Dashboard</title>
        <meta name="description" content="Real-time crop telemetry, micro-location weather, and proactive disease prevention for Indian agriculture." />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased text-gray-900 bg-[#F7F9F7]">
        
        {/* Universal scroll to top on every navigation */}
        <ScrollToTop />

        {/* Top Navbar matching screenshot */}
        <Navbar />

        {/* Main Content Area with Popup Modal Page Redirect Transition */}
        <main className="flex-1 w-full min-h-screen flex flex-col">
          <AnimatePresence 
            mode="wait"
            onExitComplete={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              if (document.documentElement) document.documentElement.scrollTop = 0;
              if (document.body) document.body.scrollTop = 0;
            }}
          >
            <motion.div
              key={pathname}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{
                duration: 0.22,
                ease: [0.16, 1, 0.3, 1], // Popup modal spring ease
              }}
              className="w-full flex-1"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Clean Footer matching screenshot style */}
        <footer className="bg-white border-t border-gray-200/80 py-6 mt-12 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-gray-900 text-sm">AgriSmart AI</span>
              <span className="text-gray-400">|</span>
              <span>Intelligent Agriculture for Indian Farmers</span>
            </div>
            <p className="text-gray-400">SIH 2026 Platform</p>
          </div>
        </footer>

      </body>
    </html>
  );
}
