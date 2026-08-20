import React from "react";
import Clock from "./components/Clock";
import ListenerCount from "./components/ListenerCount";
import Player from "./components/Player";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      {/* 1. Fixed background image — uses object-fit for perfect portrait+landscape on all devices */}
      <div className="fixed inset-0 -z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lofi-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ display: "block" }}
        />
        {/* Spotlight curtain overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/60" />
      </div>

      {/* 2. Fixed grain overlay */}
      <div className="fixed inset-0 -z-10 grain-overlay mix-blend-overlay opacity-15 pointer-events-none" />

      {/* 3. Fixed top row (using safe-area-insets) */}
      {/* Clock Top-Left */}
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] z-30">
        <Clock />
      </div>

      {/* Branding and Listener Count Top-Centre */}
      <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center select-none pointer-events-none gap-2">
        {/* Enhanced Glass Logo Card */}
        <div className="bg-zinc-950/60 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-auto">
          <h1 className="text-2xl md:text-3xl font-black tracking-[0.25em] bg-gradient-to-r from-rose-400 via-pink-500 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(244,63,94,0.3)] font-sans select-none leading-none pr-1">
            LO-FI
          </h1>
        </div>
        {/* Listener count badge */}
        <div className="pointer-events-auto">
          <ListenerCount />
        </div>
      </div>



      {/* 4. Bottom-anchored Glass Player */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30 flex justify-center">
        <Player />
      </div>

      {/* Credits Bottom-Right */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 hidden sm:block">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-white/80 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span>By: Dhruv Garg</span>
        </div>
      </div>

      {/* Vercel Insights integration */}
      <Analytics />
      <SpeedInsights />
    </main>
  );
}
