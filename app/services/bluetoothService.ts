"use client";

export interface BluetoothLog {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

export type BluetoothConnectionState = "idle" | "connecting" | "connected" | "error";

export class BluetoothService {
  private static instance: BluetoothService | null = null;
  public connectionState: BluetoothConnectionState = "idle";
  public connectedDeviceName: string | null = null;
  public connectedDeviceId: string | null = null;
  public gattServer: any = null;
  public bluetoothDevice: any = null;
  public logs: BluetoothLog[] = [];
  public isHudVisible: boolean = false;
  public showIosModal: boolean = false;

  private listeners: Set<() => void> = new Set();

  private constructor() {
    if (typeof window !== "undefined") {
      this.auditEnvironment();
    }
  }

  public static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("[BluetoothService] Listener notification error:", e);
      }
    });
  }

  public toggleHud(forceState?: boolean): void {
    this.isHudVisible = forceState !== undefined ? forceState : !this.isHudVisible;
    this.notify();
  }

  public closeIosModal(): void {
    this.showIosModal = false;
    this.notify();
  }

  public clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  public addLog(message: string, type: "info" | "success" | "warn" | "error" = "info"): void {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const logItem: BluetoothLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: time,
      message,
      type,
    };
    this.logs.push(logItem);
    if (this.logs.length > 80) this.logs.shift();
    this.notify();

    console[type === "error" ? "error" : type === "warn" ? "warn" : "log"](
      `[BluetoothService] ${message}`
    );
  }

  public auditEnvironment(): {
    isSecure: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    hasWebBluetooth: boolean;
    hasAudioOutput: boolean;
  } {
    const isSecure = typeof window !== "undefined" && window.isSecureContext === true;
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const hasWebBluetooth = typeof navigator !== "undefined" && "bluetooth" in navigator;
    const hasAudioOutput =
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "selectAudioOutput" in (navigator as any).mediaDevices;

    this.addLog(`Context: ${isSecure ? "HTTPS (Secure Context Verified)" : "INSECURE Context (HTTP)"}`, isSecure ? "success" : "error");
    this.addLog(`Device: ${isIOS ? "Apple iOS (WebKit)" : isAndroid ? "Android (Blink)" : "Desktop Browser"}`);
    this.addLog(`Web Bluetooth: ${hasWebBluetooth ? "SUPPORTED" : "UNAVAILABLE (Apple WebKit policy on iOS)"}`, hasWebBluetooth ? "success" : "warn");

    return { isSecure, isIOS, isAndroid, hasWebBluetooth, hasAudioOutput };
  }

  /**
   * Connect to Bluetooth device.
   * MUST be executed directly from a user click event to preserve transient user activation.
   */
  public async connect(targetAudioElement?: HTMLAudioElement | null): Promise<boolean> {
    this.isHudVisible = true;
    this.connectionState = "connecting";
    this.notify();

    this.addLog("User gesture registered. Starting connection sequence...", "info");

    // 1. Enforce HTTPS / Secure Context
    if (typeof window !== "undefined" && !window.isSecureContext) {
      const err = "Security Error: Web Bluetooth requires HTTPS. Ensure the site is running on a secure HTTPS domain.";
      this.addLog(err, "error");
      this.connectionState = "error";
      this.notify();
      return false;
    }

    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // 2. iOS Fallback: WebKit does not support Web Bluetooth
    if (isIOS) {
      this.addLog("[iOS Route] Apple WebKit does not permit Web Bluetooth API access in browsers.", "warn");
      this.addLog("[iOS Route] Triggering native iOS Bluetooth / AirPlay audio routing sheet...", "info");

      if (targetAudioElement && typeof (targetAudioElement as any).webkitShowPlaybackTargetPicker === "function") {
        try {
          (targetAudioElement as any).webkitShowPlaybackTargetPicker();
          this.addLog("Presented native iOS playback target picker sheet.", "success");
          this.connectionState = "connected";
          this.connectedDeviceName = "iOS Bluetooth / AirPlay";
          this.notify();
          return true;
        } catch (e: any) {
          this.addLog(`iOS Picker notice: ${e.message || e}`, "warn");
        }
      }

      this.showIosModal = true;
      this.connectionState = "idle";
      this.notify();
      return false;
    }

    // 3. Android & Desktop: Web Bluetooth API
    if (!("bluetooth" in navigator)) {
      this.addLog("Web Bluetooth API ('navigator.bluetooth') is unsupported in this browser.", "error");
      await this.tryAudioSinkFallback(targetAudioElement);
      return false;
    }

    try {
      this.addLog("Opening native Bluetooth device scan dialog...", "info");

      // SYNCHRONOUS: Immediate requestDevice without preceding delays to maintain user gesture
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "generic_access",
          0x1848, // Media Control Service (MCS)
          0x1800, // Generic Access
          0x180a, // Device Information
        ],
      });

      this.bluetoothDevice = device;
      this.connectedDeviceName = device.name || "Bluetooth Device";
      this.connectedDeviceId = device.id;
      this.addLog(`Selected device: "${this.connectedDeviceName}" (ID: ${device.id})`, "success");

      device.addEventListener("gattserverdisconnected", () => {
        this.addLog(`Device "${this.connectedDeviceName}" disconnected.`, "warn");
        this.connectionState = "idle";
        this.connectedDeviceName = null;
        this.connectedDeviceId = null;
        this.gattServer = null;
        this.notify();
      });

      this.addLog("Connecting to GATT server...", "info");
      this.gattServer = await device.gatt.connect();
      this.connectionState = "connected";
      this.addLog(`Connected successfully to "${this.connectedDeviceName}"!`, "success");

      // Also route audio sink if available
      await this.tryAudioSinkFallback(targetAudioElement);

      this.notify();
      return true;
    } catch (err: any) {
      this.handleBluetoothError(err);
      this.connectionState = "error";
      this.notify();
      return false;
    }
  }

  private async tryAudioSinkFallback(audioElement?: HTMLAudioElement | null): Promise<void> {
    if (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "selectAudioOutput" in (navigator as any).mediaDevices &&
      audioElement
    ) {
      try {
        this.addLog("Prompting browser audio output selection (selectAudioOutput)...", "info");
        const device = await (navigator as any).mediaDevices.selectAudioOutput();
        if ("setSinkId" in audioElement) {
          await (audioElement as any).setSinkId(device.deviceId);
          this.connectedDeviceName = device.label || this.connectedDeviceName || "Bluetooth Audio Sink";
          this.connectionState = "connected";
          this.addLog(`Audio successfully routed to: ${this.connectedDeviceName}`, "success");
          this.notify();
        }
      } catch (err: any) {
        if (err.name !== "NotFoundError") {
          this.addLog(`Audio sink notice: ${err.message || err.name}`, "warn");
        }
      }
    }
  }

  public disconnect(): void {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
    this.connectionState = "idle";
    this.connectedDeviceName = null;
    this.connectedDeviceId = null;
    this.gattServer = null;
    this.bluetoothDevice = null;
    this.addLog("Disconnected by user.", "info");
    this.notify();
  }

  private handleBluetoothError(err: any): void {
    const name = err?.name || "UnknownError";
    const msg = err?.message || String(err);

    this.addLog(`ERROR: [${name}] - ${msg}`, "error");

    switch (name) {
      case "NotFoundError":
        this.addLog("Explanation: User cancelled the device selection or no compatible devices were discovered.", "warn");
        break;
      case "SecurityError":
        this.addLog("Explanation: User gesture was revoked or blocked by browser permissions policy.", "error");
        break;
      case "NotSupportedError":
        this.addLog("Explanation: Web Bluetooth is disabled or not supported in this browser version.", "error");
        break;
      case "NetworkError":
        this.addLog("Explanation: GATT server connection failed. The peripheral may be out of range, busy, or paired elsewhere.", "error");
        break;
      default:
        this.addLog(`Explanation: ${msg}`, "warn");
        break;
    }
  }
}

export const getBluetoothService = (): BluetoothService => BluetoothService.getInstance();
