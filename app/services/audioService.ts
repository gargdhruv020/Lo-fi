"use client";

class AudioService {
  private static instance: AudioService | null = null;
  public audioElement: HTMLAudioElement | null = null;
  public audioContext: AudioContext | null = null;
  public wakeLock: any = null;
  public isPlaying: boolean = false;

  private constructor() {
    if (typeof window === "undefined") return;

    // 1. One persistent HTML5 <audio> element singleton — never unmounts or re-creates
    if (!(window as any).__lofiAudioSingleton) {
      const audio = document.createElement("audio");
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.className = "hidden";
      document.body.appendChild(audio);
      (window as any).__lofiAudioSingleton = audio;
    }
    this.audioElement = (window as any).__lofiAudioSingleton;

    // 2. Visibility & Lifecycle Recovery
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

  // Synchronously prime / unlock audio element on first user gesture (fix first-click mobile issue)
  public primeUserGesture(): void {
    if (this.audioElement) {
      this.ensureAudioContext();
      const p = this.audioElement.play();
      if (p) {
        p.then(() => {
          if (!this.isPlaying) {
            this.audioElement?.pause();
          }
        }).catch(() => {});
      }
    }
  }

  public playSource(
    url: string,
    volume: number = 0.8,
    isMuted: boolean = false,
    initialTime?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = this.audioElement;
      if (!audio) {
        reject("No audio element available");
        return;
      }

      audio.src = url;
      audio.volume = isMuted ? 0 : volume;
      audio.load();

      if (typeof initialTime === "number" && initialTime > 0) {
        try {
          audio.currentTime = initialTime;
        } catch (e) {}
      }

      const p = audio.play();
      if (p) {
        p.then(() => {
          this.setPlaybackState(true);
          resolve();
        }).catch((err) => {
          console.warn("Audio play failed:", err);
          reject(err);
        });
      } else {
        this.setPlaybackState(true);
        resolve();
      }
    });
  }

  public affirmPlaybackState(playing: boolean): void {
    this.isPlaying = playing;
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
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

  public setPlaybackState(playing: boolean): void {
    this.affirmPlaybackState(playing);

    if (playing) {
      this.requestWakeLock();
      this.ensureAudioContext();
    } else {
      this.releaseWakeLock();
    }
  }

  public resumePlaybackIfNeeded(): void {
    if (this.isPlaying && this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => {});
    }
  }
}

export const getAudioService = () => AudioService.getInstance();
