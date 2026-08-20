"use client";

import React, { useState, useEffect, useRef } from "react";

export default function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);

  const THRESHOLD = 75;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      // Only initiate pull-to-refresh when scrolled to the very top
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollTop <= 0 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (scrollTop <= 0 && deltaY > 0) {
        // Apply dampening resistance function
        const distance = Math.min(100, Math.pow(deltaY, 0.85));
        pullDistanceRef.current = distance;
        setPullDistance(distance);

        // Prevent native overscroll bounce if pulling significantly
        if (deltaY > 10 && e.cancelable) {
          e.preventDefault();
        }
      } else {
        isPullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      isPullingRef.current = false;

      if (pullDistanceRef.current >= THRESHOLD) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);

        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
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

  if (pullDistance <= 0 && !isRefreshing) return null;

  const progressRatio = Math.min(1, pullDistance / THRESHOLD);
  const isPastThreshold = pullDistance >= THRESHOLD;

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-150 ease-out"
      style={{
        transform: `translate(-50%, ${isRefreshing ? 12 : Math.max(-60, pullDistance - 60)}px)`,
        opacity: Math.max(0, Math.min(1, (pullDistance - 15) / 30)),
      }}
    >
      <div className="flex items-center gap-2.5 bg-zinc-950/85 backdrop-blur-2xl border border-white/15 px-4 py-2 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-xs font-medium text-white/90">
        {isRefreshing ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-rose-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent font-semibold">
              Refreshing...
            </span>
          </>
        ) : (
          <>
            <div
              className="transition-transform duration-200"
              style={{ transform: `rotate(${isPastThreshold ? 180 : progressRatio * 180}deg)` }}
            >
              <svg
                className="w-4 h-4 text-rose-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <span className={isPastThreshold ? "text-rose-400 font-semibold" : "text-zinc-300"}>
              {isPastThreshold ? "Release to refresh" : "Pull down to refresh"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
