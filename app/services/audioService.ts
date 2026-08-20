"use client";

class AudioService {
  private static instance: AudioService | null = null;
  public audioElement: HTMLAudioElement | null = null;
  public bgAudioElement: HTMLAudioElement | null = null;
  public audioContext: AudioContext | null = null;
  public wakeLock: any = null;
  public isPlaying: boolean = false;
  private silentOscillator: OscillatorNode | null = null;
  private worker: Worker | null = null;

  private constructor() {
    if (typeof window === "undefined") return;

    // 1. Global Audio Service Singleton — persistent DOM audio node that never unmounts
    if (!(window as any).__lofiAudioSingleton) {
      const audio = document.createElement("audio");
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.className = "hidden";
      document.body.appendChild(audio);
      (window as any).__lofiAudioSingleton = audio;
    }
    this.audioElement = (window as any).__lofiAudioSingleton;

    if (!(window as any).__lofiBgAudioSingleton) {
      const bgAudio = document.createElement("audio");
      bgAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
      bgAudio.loop = true;
      bgAudio.className = "hidden";
      document.body.appendChild(bgAudio);
      (window as any).__lofiBgAudioSingleton = bgAudio;
    }
    this.bgAudioElement = (window as any).__lofiBgAudioSingleton;

    // Setup background worker heartbeat
    this.initBackgroundWorker();

    // 2. Visibility & Lifecycle Recovery Guard
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && document.visibilityState === "visible") {
          this.ensureAudioContext();
          if (this.isPlaying) {
            this.requestWakeLock();
            this.resumePlaybackIfNeeded();
          }
        }
      });
    }
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public ensureAudioContext(): void {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.audioContext) {
      try {
        this.audioContext = new AudioCtx();
      } catch (e) {}
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  public async requestWakeLock(): Promise<void> {
    if (typeof window !== "undefined" && "wakeLock" in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      } catch (e) {}
    }
  }

  public async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {}
      this.wakeLock = null;
    }
  }

  public startSilentStream(): void {
    if (typeof window === "undefined") return;
    try {
      this.ensureAudioContext();
      if (!this.audioContext) return;

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }

      if (!this.silentOscillator) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "sine";
        osc.frequency.value = 50;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        this.silentOscillator = osc;
      }
    } catch (e) {}
  }

  public stopSilentStream(): void {
    if (this.silentOscillator) {
      try {
        (this.silentOscillator as any).stop?.();
        this.silentOscillator.disconnect();
      } catch (e) {}
      this.silentOscillator = null;
    }
  }

  private initBackgroundWorker(): void {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;
    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => { self.postMessage('tick'); }, 1000);
          } else if (e.data === 'stop') {
            if (timer) { clearInterval(timer); timer = null; }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = () => {
        if (this.isPlaying && this.audioElement && this.audioElement.paused) {
          this.audioElement.play().catch(() => {});
        }
      };
    } catch (e) {}
  }

  public setPlaybackState(playing: boolean): void {
    this.isPlaying = playing;
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }

    if (playing) {
      this.requestWakeLock();
      this.ensureAudioContext();
      this.startSilentStream();
      this.worker?.postMessage("start");
    } else {
      this.releaseWakeLock();
      this.stopSilentStream();
      this.worker?.postMessage("stop");
    }
  }

  public resumePlaybackIfNeeded(): void {
    if (this.isPlaying && this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {});
    }
    if (this.isPlaying && this.bgAudioElement && this.bgAudioElement.paused) {
      this.bgAudioElement.play().catch(() => {});
    }
  }
}

export const getAudioService = () => AudioService.getInstance();
