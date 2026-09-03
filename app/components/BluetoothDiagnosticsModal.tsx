"use client";

import React, { useEffect, useState } from "react";
import { getBluetoothService, BluetoothLog, BluetoothConnectionState } from "../services/bluetoothService";

export const BluetoothDiagnosticsModal: React.FC<{ audioElement?: HTMLAudioElement | null }> = ({ audioElement }) => {
  const [logs, setLogs] = useState<BluetoothLog[]>([]);
  const [isHudVisible, setIsHudVisible] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [connectionState, setConnectionState] = useState<BluetoothConnectionState>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const service = getBluetoothService();
    const update = () => {
      setLogs([...service.logs]);
      setIsHudVisible(service.isHudVisible);
      setShowIosModal(service.showIosModal);
      setConnectionState(service.connectionState);
      setDeviceName(service.connectedDeviceName);
    };

    update();
    const unsubscribe = service.subscribe(update);
    return () => unsubscribe();
  }, []);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. ON-SCREEN FLOATING BLUETOOTH DIAGNOSTICS HUD                          */}
      {/* ========================================================================= */}
      {isHudVisible && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[420px] max-h-[300px] bg-zinc-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 z-[99999] flex flex-col font-mono text-[11px] text-zinc-300 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* HUD Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 select-none">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === "connected"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : connectionState === "connecting"
                    ? "bg-amber-400 animate-ping"
                    : connectionState === "error"
                    ? "bg-rose-500"
                    : "bg-zinc-500"
                }`}
              />
              <span className="font-semibold text-white tracking-wide text-xs">
                Bluetooth Diagnostics
              </span>
              {deviceName && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 truncate max-w-[120px]">
                  {deviceName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyLogs}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white/80 transition-colors text-[10px]"
                title="Copy all logs to clipboard"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => getBluetoothService().clearLogs()}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-white/80 transition-colors text-[10px]"
                title="Clear console output"
              >
                Clear
              </button>
              <button
                onClick={() => getBluetoothService().toggleHud(false)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs"
                title="Minimize console"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Logs Terminal Body */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-white/20 select-text">
            {logs.length === 0 ? (
              <div className="text-white/40 text-center py-4">No events logged yet. Tap Connect to begin.</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`leading-relaxed break-words text-[10.5px] ${
                    log.type === "error"
                      ? "text-rose-400 font-semibold"
                      : log.type === "warn"
                      ? "text-amber-300"
                      : log.type === "success"
                      ? "text-emerald-300 font-medium"
                      : "text-zinc-400"
                  }`}
                >
                  <span className="text-zinc-600 mr-1.5">[{log.timestamp}]</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. IOS BLUETOOTH / AIRPLAY NATIVE ROUTING MODAL                           */}
      {/* ========================================================================= */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100000] animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl p-6 max-w-sm w-full text-center text-white shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">iOS Bluetooth Connection</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Apple iOS restricts browsers from using Web Bluetooth directly. Your Bluetooth headphones and car audio connect seamlessly through your iPhone’s native audio system:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left text-xs text-zinc-300 space-y-2 mb-5 leading-normal">
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400">1.</span>
                <span>Swipe down from top-right corner to open <b>Control Center</b>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400">2.</span>
                <span>Tap the <b>AirPlay / Audio card</b> icon in the music tile.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400">3.</span>
                <span>Select your <b>Bluetooth Headphones or Car Audio</b>.</span>
              </div>
            </div>
            <button
              onClick={() => getBluetoothService().closeIosModal()}
              className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-rose-900/30 active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
