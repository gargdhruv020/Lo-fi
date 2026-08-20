"use client";

import { useEffect, useState } from "react";

export default function ListenerCount() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    // Generate a unique session ID for this browser tab session
    let sessionId = sessionStorage.getItem("hustle_session_id");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("hustle_session_id", sessionId);
    }

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/listeners", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (data && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch (err) {
        console.warn("Error updating active listener count:", err);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-white/80 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-md">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
      </span>
      <span>{count.toLocaleString()} listening</span>
    </div>
  );
}
