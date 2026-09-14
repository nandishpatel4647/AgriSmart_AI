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
        <title>AgriSmart AI — Intelligent Agriculture</title>
        <meta name="description" content="Calibrated leaf diagnosis, micro-climate weather radar, and grounded farm intelligence." />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased text-[#19352b] bg-[#f5f1e8]">
        {/* Universal scroll to top on every navigation */}
        <ScrollToTop />

        {/* Ambient subtle leaf-vein texture from Emergent */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] leaf-veins" aria-hidden="true" />

        {/* Emergent AppHeader Navbar (shown only on internal pages, landing page has its own minimal header) */}
        {pathname !== "/" && <Navbar />}

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 w-full min-h-[calc(100vh-140px)] flex flex-col">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full flex-1 flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Emergent Site Footer */}
        <footer className="relative z-10 border-t border-[#19352b]/10 px-5 py-8 sm:px-8 lg:px-12 bg-[#f5f1e8]" data-testid="site-footer">
          <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-4 text-xs text-[#19352b]/55 sm:flex-row sm:items-center">
            <span className="font-heading text-sm font-semibold text-[#19352b]" data-testid="footer-brand">AgriSmart AI</span>
            <span data-testid="footer-note">Intelligent agriculture for a more sustainable future.</span>
            <span data-testid="footer-disclaimer">Production Ready · 33 Diagnostic Classes</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
