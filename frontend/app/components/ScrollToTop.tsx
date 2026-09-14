"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop Component
 * Ensures that every page across the entire website always starts at the very top (y = 0)
 * on initial load, client-side navigation, or browser back/forward transitions.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable browser default scroll restoration so it doesn't restore random scroll positions
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };

    // 1. Immediate scroll
    scrollToTop();

    // 2. Next animation frame (catches React state updates)
    const raf = requestAnimationFrame(scrollToTop);

    // 3. Short timeout fallback (catches image/layout shifts)
    const timer = setTimeout(scrollToTop, 60);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
