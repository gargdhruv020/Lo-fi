"use client";

class AudioService {
  private static instance: AudioService | null = null;
  public audioA: HTMLAudioElement | null = null;
  public audioB: HTMLAudioElement | null = null;
  public activeSlot: "A" | "B" = "A";
  public bgAudioElement: HTMLAudioElement | null = null;
  public audioContext: AudioContext | null = null;
  public wakeLock: any = null;
  public isPlaying: boolean = false;
  private silentOscillator: OscillatorNode | null = null;
  private worker: Worker | null = null;

  private constructor() {
    if (typeof window === "undefined") return;

    // 1. Dual Audio Instance Setup — persistent audioA and audioB in memory
    if (!(window as any).__lofiAudioA) {
      const elA = document.createElement("audio");
      elA.preload = "auto";
      elA.crossOrigin = "anonymous";
      elA.className = "hidden";
      document.body.appendChild(elA);
      (window as any).__lofiAudioA = elA;
    }
    this.audioA = (window as any).__lofiAudioA;

    if (!(window as any).__lofiAudioB) {
      const elB = document.createElement("audio");
      elB.preload = "auto";
      elB.crossOrigin = "anonymous";
      elB.className = "hidden";
      document.body.appendChild(elB);
      (window as any).__lofiAudioB = elB;
    }
    this.audioB = (window as any).__lofiAudioB;

    // Secondary Session-Keeper / Silence element for Android Chrome continuous session lock
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

  public get activeAudio(): HTMLAudioElement | null {
    return this.activeSlot === "A" ? this.audioA : this.audioB;
  }

  public get inactiveAudio(): HTMLAudioElement | null {
    return this.activeSlot === "A" ? this.audioB : this.audioA;
  }

  // Legacy fallback accessor for backwards compatibility
  public get audioElement(): HTMLAudioElement | null {
    return this.activeAudio;
  }

  // 2. Non-Destructive Source Loading & Dual-Audio Buffer Swap with Secondary Session-Keeper
  public swapAndPlay(
    newUrl: string,
    volume: number = 0.8,
    isMuted: boolean = false,
    initialTime?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetAudio = this.inactiveAudio;
      const currentAudio = this.activeAudio;

      if (!targetAudio) {
        reject("No target audio element available");
        return;
      }

      // Re-assert MediaSession playbackState synchronously before updating source
      this.affirmPlaybackState(true);

      // Trigger micro-playback on secondary session-keeper element to maintain continuous Android Chrome session thread
      if (this.bgAudioElement) {
        this.bgAudioElement.play().catch(() => {});
      }

      // Load new source into INACTIVE audio element while current is still active
      targetAudio.src = newUrl;
      targetAudio.volume = isMuted ? 0 : volume;
      targetAudio.load();

      if (typeof initialTime === "number" && initialTime > 0) {
        try {
          targetAudio.currentTime = initialTime;
        } catch (e) {}
      }

      const playPromise = targetAudio.play();
      if (playPromise) {
        playPromise
          .then(() => {
            // Swap active slot pointer seamlessly once target audio starts playing
            this.activeSlot = this.activeSlot === "A" ? "B" : "A";

            // Non-destructively pause old audio WITHOUT clearing .src = ""
            if (currentAudio && !currentAudio.paused) {
              currentAudio.pause();
            }

            // Immediately re-assert playback state to lock OS notification
            this.setPlaybackState(true);
            resolve();
          })
          .catch((err) => {
            console.warn("Dual-audio swap play failed:", err);
            reject(err);
          });
      } else {
        this.activeSlot = this.activeSlot === "A" ? "B" : "A";
        if (currentAudio && !currentAudio.paused) {
          currentAudio.pause();
        }
        this.setPlaybackState(true);
        resolve();
      }
    });
  }

  // 3. Immediate Playback State Affirmation
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
        const active = this.activeAudio;
        if (this.isPlaying && active && active.paused) {
          active.play().catch(() => {});
        }
      };
    } catch (e) {}
  }

  public setPlaybackState(playing: boolean): void {
    this.affirmPlaybackState(playing);

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
    const active = this.activeAudio;
    if (this.isPlaying && active && active.paused) {
      active.play().catch(() => {});
    }
    if (this.isPlaying && this.bgAudioElement && this.bgAudioElement.paused) {
      this.bgAudioElement.play().catch(() => {});
    }
  }
}

export const getAudioService = () => AudioService.getInstance();
