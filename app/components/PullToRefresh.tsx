"use client";

import React, { useState, useEffect, useRef } from "react";

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isThresholdMet, setIsThresholdMet] = useState(false);

  const startYRef = useRef(0);
  const isCandidateRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const THRESHOLD = 80; // Distance in pixels required to trigger refresh

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      // 1. Precise scroll detection: only track if window is at the top
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 1 || e.touches.length !== 1) {
        isCandidateRef.current = false;
        return;
      }

      // 2. Viewport boundary guard: only allow pull-to-refresh if pulling from the upper part of the screen (top 150px)
      const touchY = e.touches[0].clientY;
      if (touchY > 150) {
        isCandidateRef.current = false;
        return;
      }

      // 3. Nested scrollable container guard: prevent refresh if starting pull inside a scrollable container (e.g. tracklist)
      let target = e.target as HTMLElement | null;
      let isInsideScrollable = false;
      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll" || target.classList.contains("overflow-y-auto")) && 
          target.scrollHeight > target.clientHeight
        ) {
          isInsideScrollable = true;
          break;
        }
        target = target.parentElement;
      }

      if (isInsideScrollable) {
        isCandidateRef.current = false;
        return;
      }

      // If all guards pass, mark as candidate
      startYRef.current = touchY;
      isCandidateRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isCandidateRef.current || e.touches.length !== 1) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop > 1) {
        isCandidateRef.current = false;
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setIsThresholdMet(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const rawDiff = currentY - startYRef.current;

      if (rawDiff > 0) {
        // Apply resistance damping factor so pull feels smooth & natural
        const dampenedDistance = Math.min(130, Math.pow(rawDiff, 0.85) * 2.2);
        pullDistanceRef.current = dampenedDistance;
        setPullDistance(dampenedDistance);
        setIsThresholdMet(dampenedDistance >= THRESHOLD);

        // Prevent default overscroll to stop browser fights
        if (e.cancelable && rawDiff > 10) {
          e.preventDefault();
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setIsThresholdMet(false);
      }
    };

    const handleTouchEnd = () => {
      if (!isCandidateRef.current) return;
      isCandidateRef.current = false;

      if (pullDistanceRef.current >= THRESHOLD) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);
        // Trigger page reload
        setTimeout(() => {
          window.location.reload();
        }, 200);
      } else {
        // Smoothly animate back to top
        setPullDistance(0);
        setIsThresholdMet(false);
        pullDistanceRef.current = 0;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-200 ease-out"
      style={{
        transform: `translate(-50%, ${isRefreshing ? "1.25rem" : `${Math.min(pullDistance * 0.6, 60)}px`})`,
      }}
    >
      <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] flex items-center gap-2.5 text-xs font-medium text-white/90">
        <svg
          className={`w-4 h-4 text-rose-400 transition-transform duration-200 ${
            isRefreshing
              ? "animate-spin"
              : isThresholdMet
              ? "rotate-180 text-rose-300"
              : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>
          {isRefreshing
            ? "Refreshing..."
            : isThresholdMet
            ? "Release to refresh"
            : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
