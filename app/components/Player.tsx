"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { getHustleCatalog, CatalogTrack } from "../data/catalog";

export default function Player() {
  // Load entire catalog
  const catalog = useMemo(() => getHustleCatalog(), []);

  // Client-side tracks state, initialized with standard catalog for SSR stability
  const [tracks, setTracks] = useState<CatalogTrack[]>(catalog);
  const [downloadedTracks, setDownloadedTracks] = useState<Set<string>>(new Set());

  // Fetch downloaded tracks on mount
  useEffect(() => {
    fetch("/api/downloaded")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.files)) {
          setDownloadedTracks(new Set(data.files));
        }
      })
      .catch((err) => console.warn("Failed to load initial downloaded tracks:", err));
  }, []);

  // State Management
  const [currentTrackId, setCurrentTrackId] = useState<string>(() => {
    const defaultCatalog = getHustleCatalog();
    return defaultCatalog.length > 0 ? defaultCatalog[0].id : "";
  });
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  // Catalog panel states
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | "all" | "favourites">("favourites");
  const [searchQuery, setSearchQuery] = useState("");

  const playerRef = useRef<HTMLDivElement | null>(null);
  const isSwappingSource = useRef(false);
  const activeTrackIdRef = useRef(currentTrackId);
  const currentIndexRef = useRef<number>(0);
  const tracksRef = useRef<CatalogTrack[]>(catalog);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const useNativeAudioRef = useRef(false);
  const shouldPlayOnReadyRef = useRef(false);
  const queuedVideoIdRef = useRef<string | null>(null);

  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silentNodeRef = useRef<AudioNode | null>(null);
  const bgWorkerRef = useRef<Worker | null>(null);

  // Screen Wake Lock API helper functions to prevent mobile tab deep sleep
  const requestWakeLock = async () => {
    if (typeof window !== "undefined" && "wakeLock" in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn("Wake Lock request failed:", err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn("Wake Lock release failed:", err);
      }
      wakeLockRef.current = null;
    }
  };

  // Audio Context State Maintenance helper to prevent Web Audio / AudioContext pause on focus loss
  const ensureAudioContext = () => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioCtx();
      } catch (e) {}
    }

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  };

  // Web Audio silent processing node — keeps mobile audio graph active during mobile backgrounding
  const startSilentAudioNode = () => {
    if (typeof window === "undefined") return;
    try {
      ensureAudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (!silentNodeRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // Inaudible gain
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        silentNodeRef.current = osc;
      }
    } catch (e) {
      console.warn("Failed to start Web Audio silent processing node:", e);
    }
  };

  const stopSilentAudioNode = () => {
    if (silentNodeRef.current) {
      try {
        (silentNodeRef.current as any).stop?.();
        silentNodeRef.current.disconnect();
      } catch (e) {}
      silentNodeRef.current = null;
    }
  };

  // Load YouTube Iframe Player API script dynamically on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Intercept MediaSession calls to prevent YouTube iframe from hijacking controls
    if ("mediaSession" in navigator) {
      const originalSetActionHandler = navigator.mediaSession.setActionHandler;
      navigator.mediaSession.setActionHandler = function (action, callback) {
        // Prevent clearing next/prev track action handlers
        if ((action === "nexttrack" || action === "previoustrack") && !callback) {
          return;
        }
        return originalSetActionHandler.call(navigator.mediaSession, action, callback);
      };

      // Intercept metadata sets to prevent YouTube from replacing our song info
      try {
        const mediaSessionProto = Object.getPrototypeOf(navigator.mediaSession);
        const originalDescriptor = Object.getOwnPropertyDescriptor(mediaSessionProto, "metadata");
        if (originalDescriptor && originalDescriptor.set) {
          Object.defineProperty(navigator.mediaSession, "metadata", {
            configurable: true,
            enumerable: true,
            get() {
              return originalDescriptor.get ? originalDescriptor.get.call(this) : null;
            },
            set(value) {
              // If the metadata is from YouTube (does not match our current track title), block it!
              if (
                (window as any).__customTrackTitle &&
                value &&
                value.title !== (window as any).__customTrackTitle
              ) {
                return;
              }
              return originalDescriptor.set!.call(this, value);
            },
          });
        }
      } catch (err) {
        console.warn("Failed to patch mediaSession.metadata descriptor:", err);
      }
    }
    
    const initOnScriptLoad = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        initYoutubePlayer("jfKfPfyJRdk");
      }
    };

    if ((window as any).YT) {
      initOnScriptLoad();
      return;
    }

    // Setup global callback for YouTube script
    (window as any).onYouTubeIframeAPIReady = () => {
      initOnScriptLoad();
    };
    
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  const updateMediaSession = () => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !currentTrack) return;

    (window as any).__customTrackTitle = currentTrack.title;

    // Force our metadata to override the YouTube iframe's metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: `Lo-Fi Radio — ${currentTrack.season === 1 ? "90s & 2000s" : currentTrack.season === 2 ? "Retro & Golden Era" : "Modern & Indie"}`,
      artwork: [
        { src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" },
      ],
    });

    // Re-bind action handlers to ensure they point to our controller instead of YouTube's defaults
    navigator.mediaSession.setActionHandler("play", () => {
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePrev();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleNext();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (useNativeAudioRef.current && nativeAudioRef.current) {
        const newTime = Math.max(0, nativeAudioRef.current.currentTime - 10);
        nativeAudioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function" && typeof player.seekTo === "function") {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime, true);
          setCurrentTime(newTime);
        }
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (useNativeAudioRef.current && nativeAudioRef.current) {
        const newTime = Math.min(nativeAudioRef.current.duration || 0, nativeAudioRef.current.currentTime + 10);
        nativeAudioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function" && typeof player.seekTo === "function") {
          const newTime = Math.min(player.getDuration() || 0, player.getCurrentTime() + 10);
          player.seekTo(newTime, true);
          setCurrentTime(newTime);
        }
      }
    });
  };

  const startTimeSyncInterval = () => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      if (useNativeAudioRef.current && nativeAudioRef.current) {
        // Native audio is the active engine
        const audio = nativeAudioRef.current;
        if (!audio.paused && !isSeeking) {
          setCurrentTime(audio.currentTime || 0);
          setDuration(audio.duration || 0);
          updateMediaPosition();
          updateMediaSession();
        }
      } else {
        // YouTube iframe is the active engine
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function" && typeof player.getPlayerState === "function") {
          const state = player.getPlayerState();
          if (state === 1 && !isSeeking) {
            setCurrentTime(player.getCurrentTime() || 0);
            setDuration(player.getDuration() || 0);
            updateMediaPosition();
            updateMediaSession();
          }
        }
      }
    }, 500);
  };

  const stopTimeSyncInterval = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimeSyncInterval();
  }, []);

  useEffect(() => {
    activeTrackIdRef.current = currentTrackId;
  }, [currentTrackId]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Initialize tracks and starting track on client mount (preventing SSR hydration mismatches)
  useEffect(() => {
    // Defer state updates to next tick to avoid synchronous cascading renders linter warning
    const timer = setTimeout(() => {
      setTracks(catalog);
      tracksRef.current = catalog;
      if (catalog.length > 0) {
        setCurrentTrackId(catalog[0].id);
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [catalog]);

  // Click outside to close catalog drawer automatically
  useEffect(() => {
    if (!isCatalogOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(event.target as Node)) {
        setIsCatalogOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCatalogOpen]);

  // Current track object
  const currentTrack = useMemo(() => {
    return tracks.find((t) => t.id === currentTrackId) || catalog[0];
  }, [tracks, catalog, currentTrackId]);

  // Filtered tracks list based on Season and Search query
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const matchesSeason =
        activeSeason === "all" ||
        (activeSeason === "favourites" ? !!track.isFavourite : track.season === activeSeason);
      const matchesSearch =
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeason && matchesSearch;
    });
  }, [tracks, activeSeason, searchQuery]);

  // Centralized playTrack method to guarantee synchronous playback trigger within the click context
  // Centralized playTrack method to guarantee direct, clean playback of the requested track from start
  const initYoutubePlayer = (initialVideoId: string) => {
    if (typeof window === "undefined" || !(window as any).YT || !(window as any).YT.Player || !ytContainerRef.current) return;

    ytPlayerRef.current = new (window as any).YT.Player(ytContainerRef.current, {
      height: "200",
      width: "200",
      videoId: initialVideoId,
      playerVars: {
        autoplay: 0, // Disable automatic play on instantiation to respect security policies
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(isMuted ? 0 : volume * 100);
          if (shouldPlayOnReadyRef.current) {
            const videoIdToPlay = queuedVideoIdRef.current || initialVideoId;
            event.target.loadVideoById(videoIdToPlay);
            event.target.playVideo();
            bgAudioRef.current?.play().catch(() => {});
            setIsPlaying(true);
            setIsLoadingTrack(false);
            startTimeSyncInterval();
            updateMediaSession();
            shouldPlayOnReadyRef.current = false;
          }
        },
        onStateChange: (event: any) => {
          // ENDED is 0, PLAYING is 1, PAUSED is 2
          if (event.data === 0) {
            stopTimeSyncInterval();
            bgAudioRef.current?.pause();
            handleEnded();
          } else if (event.data === 1) {
            setIsPlaying(true);
            setIsLoadingTrack(false);
            bgAudioRef.current?.play().catch(() => {});
            startTimeSyncInterval();
            updateMediaSession();
          } else if (event.data === 2) {
            setIsPlaying(false);
            bgAudioRef.current?.pause();
            stopTimeSyncInterval();
          }
        },
        onError: (event: any) => {
          console.error("YouTube Player encountered an error code:", event.data);
          setIsLoadingTrack(false);
          handleAudioError();
        }
      }
    });
  };

  // Helper to stop the native audio element
  const stopNativeAudio = () => {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.pause();
      nativeAudioRef.current.removeAttribute("src");
      nativeAudioRef.current.load();
    }
  };

  // Helper to stop the YouTube iframe
  const stopYoutubePlayer = () => {
    const player = ytPlayerRef.current;
    if (player && typeof player.pauseVideo === "function") {
      try { player.pauseVideo(); } catch {}
    }
  };

  // Start playback via native audio element (supports mobile background)
  const startNativeAudio = (audioUrl: string) => {
    const audio = nativeAudioRef.current;
    if (!audio) return false;

    useNativeAudioRef.current = true;
    stopYoutubePlayer();

    audio.src = audioUrl;
    audio.volume = isMuted ? 0 : volume;
    audio.load();

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          if (activeTrackIdRef.current === activeTrackIdRef.current) {
            setIsPlaying(true);
            setIsLoadingTrack(false);
            startTimeSyncInterval();
            updateMediaSession();
          }
        })
        .catch(() => {
          // Native audio failed — fall back to YouTube iframe
          console.warn("Native audio play failed, falling back to YouTube iframe");
          useNativeAudioRef.current = false;
        });
    }
    return true;
  };

  // Start playback via YouTube iframe (fallback for desktop / when Invidious fails)
  const startYoutubePlayback = (videoId: string) => {
    useNativeAudioRef.current = false;
    stopNativeAudio();

    const player = ytPlayerRef.current;
    if (player && typeof player.loadVideoById === "function") {
      player.loadVideoById(videoId);
      player.playVideo();
      bgAudioRef.current?.play().catch(() => {});
      setIsPlaying(true);
      setIsLoadingTrack(false);
      startTimeSyncInterval();
      updateMediaSession();
    } else {
      // Queue it for when the player becomes ready
      queuedVideoIdRef.current = videoId;
      shouldPlayOnReadyRef.current = true;
    }
  };

  // Centralized playTrack method — tries native audio for mobile background, falls back to YouTube iframe
  const playTrack = (track: CatalogTrack, explicitIndex?: number) => {
    if (!track) return;

    const activePlaylist = tracksRef.current.length > 0 ? tracksRef.current : catalog;
    const idx = explicitIndex !== undefined ? explicitIndex : activePlaylist.findIndex((t) => t.id === track.id);
    const validIndex = idx !== -1 ? idx : 0;

    setCurrentIndex(validIndex);
    currentIndexRef.current = validIndex;
    setCurrentTrackId(track.id);
    activeTrackIdRef.current = track.id;
    setIsLoadingTrack(true);
    setIsPlaying(false);
    stopTimeSyncInterval();
    stopNativeAudio();
    bgAudioRef.current?.pause();

    // Secure browser user-gesture token by executing a play command synchronously
    const player = ytPlayerRef.current;
    if (player && typeof player.playVideo === "function") {
      try {
        player.playVideo();
        player.pauseVideo();
      } catch (e) {}
    }

    // Secure background keep-alive + native audio permissions synchronously in click handler
    bgAudioRef.current?.play().then(() => bgAudioRef.current?.pause()).catch(() => {});
    if (nativeAudioRef.current) {
      nativeAudioRef.current.play().then(() => nativeAudioRef.current?.pause()).catch(() => {});
    }

    // Fetch the YouTube Video ID (and optionally a direct audio URL)
    const queryParams = new URLSearchParams({
      id: track.id,
      title: track.title,
      artist: track.artist,
      season: String(track.season),
    });

    fetch(`/api/play?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        // Only proceed if the user is still on this track
        if (activeTrackIdRef.current !== track.id) return;

        if (!data.videoId) {
          console.error("No video ID returned from API");
          setIsLoadingTrack(false);
          return;
        }

        // Try native audio first (works in mobile background), fall back to YouTube iframe
        if (data.audioUrl) {
          const audio = nativeAudioRef.current;
          if (audio) {
            useNativeAudioRef.current = true;
            stopYoutubePlayer();

            audio.src = data.audioUrl;
            audio.volume = isMuted ? 0 : volume;
            audio.load();

            const playPromise = audio.play();
            if (playPromise) {
              playPromise
                .then(() => {
                  if (activeTrackIdRef.current === track.id) {
                    bgAudioRef.current?.play().catch(() => {});
                    setIsPlaying(true);
                    setIsLoadingTrack(false);
                    startTimeSyncInterval();
                    updateMediaSession();
                  }
                })
                .catch(() => {
                  // Native audio failed, fall back to YouTube iframe
                  console.warn("Native audio failed, falling back to YouTube iframe");
                  useNativeAudioRef.current = false;
                  startYoutubePlayback(data.videoId);
                });
            }
          } else {
            startYoutubePlayback(data.videoId);
          }
        } else {
          // No audio URL available, use YouTube iframe directly
          startYoutubePlayback(data.videoId);
        }
      })
      .catch((downloaderErr) => {
        console.error("Downloader API failed:", downloaderErr);
        setIsLoadingTrack(false);
      });
  };

  // Predictive prefetching for next and previous tracks in the background
  useEffect(() => {
    if (tracks.length === 0 || !currentTrack) return;

    // Helper to request a download in the background without blocking the UI
    const prefetchTrack = (track: CatalogTrack) => {
      const queryParams = new URLSearchParams({
        id: track.id,
        title: track.title,
        artist: track.artist,
        season: String(track.season),
      });
      fetch(`/api/play?${queryParams.toString()}`).catch(() => {});
    };

    // Wait 1.5 seconds of continuous playback before prefetching (to avoid spamming skips)
    const prefetchTimer = setTimeout(() => {
      const activePlaylist = tracksRef.current.length > 0 ? tracksRef.current : catalog;
      if (activePlaylist.length === 0) return;

      const nextIndex = (currentIndexRef.current + 1) % activePlaylist.length;
      const prevIndex = (currentIndexRef.current - 1 + activePlaylist.length) % activePlaylist.length;

      const nextTrack = activePlaylist[nextIndex];
      const prevTrack = activePlaylist[prevIndex];

      if (nextTrack) prefetchTrack(nextTrack);
      if (prevTrack) prefetchTrack(prevTrack);
    }, 1500);

    return () => clearTimeout(prefetchTimer);
  }, [currentTrackId, tracks, catalog]);

  // Global keyboard shortcut: Spacebar to toggle Play/Pause
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key events if the user is currently typing in an input or textarea
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault(); // Prevent standard page scroll on spacebar press
        handlePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlaying]);

  // Sync volume state
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (player && typeof player.setVolume === "function") {
      player.setVolume(isMuted ? 0 : volume * 100);
    }
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Lightweight Background Web Worker fallback timer trick to prevent mobile power-saving CPU throttle
  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;

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
    const worker = new Worker(workerUrl);

    worker.onmessage = () => {
      // Background worker heartbeat callback — ensures native audio keeps playing when backgrounded
      if (useNativeAudioRef.current && nativeAudioRef.current && nativeAudioRef.current.paused) {
        if ((window as any).__isPlayingRequested) {
          nativeAudioRef.current.play().catch(() => {});
        }
      }
    };

    bgWorkerRef.current = worker;

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Sync Media Session playback state, Wake Lock, Audio Context, Silent Node & Background Worker
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }

    if (isPlaying) {
      (window as any).__isPlayingRequested = true;
      requestWakeLock();
      ensureAudioContext();
      startSilentAudioNode();
      bgWorkerRef.current?.postMessage("start");
    } else {
      (window as any).__isPlayingRequested = false;
      releaseWakeLock();
      stopSilentAudioNode();
      bgWorkerRef.current?.postMessage("stop");
    }
  }, [isPlaying]);

  // Handle tab visibility restoration: re-acquire Screen Wake Lock & resume Audio Context whenever document.hidden becomes false
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden && document.visibilityState === "visible";
      if (isVisible) {
        // Explicitly resume Audio Context whenever page visibility is restored
        ensureAudioContext();
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }

        if ((window as any).__isPlayingRequested || isPlaying) {
          requestWakeLock();
          startSilentAudioNode();
          if (useNativeAudioRef.current && nativeAudioRef.current && nativeAudioRef.current.paused) {
            nativeAudioRef.current.play().catch(() => {});
          }
        }

        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function") {
          setCurrentTime(player.getCurrentTime() || 0);
          setDuration(player.getDuration() || 0);
          updateMediaPosition();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPlaying]);

  // Media Session API — enables Bluetooth headphones, lock screen, and system media controls
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: `Lo-Fi Radio — ${currentTrack.season === 1 ? "90s & 2000s" : currentTrack.season === 2 ? "Retro & Golden Era" : "Modern & Indie"}`,
      artwork: [
        { src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      handlePlayPause();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePrev();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleNext();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (useNativeAudioRef.current && nativeAudioRef.current) {
        const newTime = Math.max(0, nativeAudioRef.current.currentTime - 10);
        nativeAudioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function" && typeof player.seekTo === "function") {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime, true);
          setCurrentTime(newTime);
        }
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (useNativeAudioRef.current && nativeAudioRef.current) {
        const newTime = Math.min(nativeAudioRef.current.duration || 0, nativeAudioRef.current.currentTime + 10);
        nativeAudioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      } else {
        const player = ytPlayerRef.current;
        if (player && typeof player.getCurrentTime === "function" && typeof player.seekTo === "function") {
          const newTime = Math.min(player.getDuration() || 0, player.getCurrentTime() + 10);
          player.seekTo(newTime, true);
          setCurrentTime(newTime);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackId, currentTrack, tracks]);

  const handleAudioError = () => {
    console.warn("Audio playback encountered an error, skipping to next track.");
    handleNext();
  };

  const handlePlayPause = () => {
    // If native audio is the active engine
    if (useNativeAudioRef.current && nativeAudioRef.current) {
      const audio = nativeAudioRef.current;
      if (audio.paused) {
        audio.play().catch(() => {});
        bgAudioRef.current?.play().catch(() => {});
        setIsPlaying(true);
        startTimeSyncInterval();
        updateMediaSession();
      } else {
        audio.pause();
        bgAudioRef.current?.pause();
        setIsPlaying(false);
        stopTimeSyncInterval();
      }
      return;
    }

    // YouTube iframe engine
    if (!ytPlayerRef.current || typeof ytPlayerRef.current.playVideo !== "function") {
      playTrack(currentTrack);
      return;
    }
    try {
      const state = ytPlayerRef.current.getPlayerState();
      if (state === 1) {
        ytPlayerRef.current.pauseVideo();
        bgAudioRef.current?.pause();
        setIsPlaying(false);
        stopTimeSyncInterval();
      } else {
        ytPlayerRef.current.playVideo();
        bgAudioRef.current?.play().catch(() => {});
        setIsPlaying(true);
        startTimeSyncInterval();
        updateMediaSession();
      }
    } catch (err) {
      console.warn("Direct play toggle failed, re-initializing track:", err);
      playTrack(currentTrack);
    }
  };

  const handleShuffle = () => {
    const shuffleArray = (arr: CatalogTrack[]): CatalogTrack[] => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      return shuffled;
    };

    if (isShuffled) {
      // Turn off shuffle: restore original catalog order
      setTracks(catalog);
      tracksRef.current = catalog;
      setIsShuffled(false);
      const newIndex = catalog.findIndex((t) => t.id === currentTrackId);
      const safeIndex = newIndex !== -1 ? newIndex : 0;
      setCurrentIndex(safeIndex);
      currentIndexRef.current = safeIndex;
    } else {
      // Turn on shuffle: randomize the track list
      const shuffled = shuffleArray(tracks);
      setTracks(shuffled);
      tracksRef.current = shuffled;
      setIsShuffled(true);
      const newIndex = shuffled.findIndex((t) => t.id === currentTrackId);
      const safeIndex = newIndex !== -1 ? newIndex : 0;
      setCurrentIndex(safeIndex);
      currentIndexRef.current = safeIndex;
    }
  };

  const handleNext = () => {
    const activePlaylist = tracksRef.current.length > 0 ? tracksRef.current : catalog;
    if (activePlaylist.length === 0) return;
    const nextIndex = (currentIndexRef.current + 1) % activePlaylist.length;
    const nextTrack = activePlaylist[nextIndex];
    if (nextTrack) {
      playTrack(nextTrack, nextIndex);
    }
  };

  const handlePrev = () => {
    const activePlaylist = tracksRef.current.length > 0 ? tracksRef.current : catalog;
    if (activePlaylist.length === 0) return;
    const prevIndex = (currentIndexRef.current - 1 + activePlaylist.length) % activePlaylist.length;
    const prevTrack = activePlaylist[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack, prevIndex);
    }
  };

  const updateMediaPosition = () => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) return;
    try {
      let dur = 0;
      let pos = 0;

      if (useNativeAudioRef.current && nativeAudioRef.current) {
        dur = nativeAudioRef.current.duration || 0;
        pos = nativeAudioRef.current.currentTime || 0;
      } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getDuration === "function") {
        dur = ytPlayerRef.current.getDuration() || 0;
        pos = ytPlayerRef.current.getCurrentTime() || 0;
      }

      if (dur > 0 && pos >= 0 && pos <= dur) {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: 1,
          position: pos,
        });
      }
    } catch (err) {
      console.warn("Failed to set Media Session position state:", err);
    }
  };

  const handleEnded = () => {
    handleNext();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);

    if (useNativeAudioRef.current && nativeAudioRef.current) {
      nativeAudioRef.current.currentTime = time;
    } else if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      ytPlayerRef.current.seekTo(time, true);
    }

    setCurrentTime(time);
    updateMediaPosition();
    setIsSeeking(false);
  };

  const selectTrack = (track: CatalogTrack) => {
    playTrack(track);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Glassmorphism styling class
  const glassClass =
    "border border-white/10 bg-zinc-950/75 backdrop-blur-3xl backdrop-saturate-[1.7] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85),_inset_0_1px_0_rgba(255,255,255,0.15)]";

  if (!currentTrack) return null;

  return (
    <div ref={playerRef} className="w-full flex flex-col gap-3.5 transition-all duration-300">
      {/* Hidden YouTube Iframe Container (visible but off-screen to prevent browser playback throttling) */}
      <div className="fixed -left-[9999px] top-0 w-[200px] h-[200px] opacity-0 pointer-events-none z-0">
        <div ref={ytContainerRef} />
      </div>

      {/* Background Audio Keep-Alive Loop for Mobile Lock Screen & Bluetooth */}
      <audio
        ref={bgAudioRef}
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA"
        loop
        className="hidden"
      />

      {/* Native Audio Element — primary playback engine for mobile background support */}
      <audio
        ref={(el) => {
          nativeAudioRef.current = el;
          if (typeof window !== "undefined" && el) {
            (window as any).__lofiNativeAudio = el;
          }
        }}
        className="hidden"
        preload="auto"
        onEnded={handleEnded}
        onError={() => {
          // If native audio errors out, fall back to YouTube iframe
          if (useNativeAudioRef.current) {
            console.warn("Native audio error, falling back to YouTube iframe");
            useNativeAudioRef.current = false;
          }
        }}
      />

      {/* ========================================================================= */}
      {/* EXPANDABLE HUSTLE CATALOG PANEL */}
      {/* ========================================================================= */}
      {isCatalogOpen && (
        <div
          className={`w-full flex flex-col p-4 md:p-5 rounded-[28px] overflow-hidden h-[440px] ${glassClass} animate-in fade-in slide-in-from-bottom-5 duration-300`}
        >
          {/* Header Panel */}
          <div className="flex flex-col gap-3">
            {/* Title and Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-white/90">
                Lo-Fi Mixtapes
              </h3>
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search artist or song..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-56 px-3 py-1.5 pl-8 text-xs bg-white/5 focus:bg-white/10 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all"
                />
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Season Tabs Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/5">
              {(["all", "favourites", 1, 2, 3, 4] as const).map((season) => (
                <div key={season} className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => setActiveSeason(season)}
                    className={`px-3 py-1 rounded-full text-[10.5px] font-medium tracking-wide uppercase transition-all whitespace-nowrap focus:outline-none ${
                      activeSeason === season
                        ? "bg-rose-500 text-white shadow-md shadow-rose-900/25"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {season === "all"
                      ? "All Tracks"
                      : season === "favourites"
                      ? "❤️ Favourites"
                      : season === 1
                      ? "90s & 2000s"
                      : season === 2
                      ? "Retro & Golden"
                      : season === 3
                      ? "Modern & Indie"
                      : "BASS"}
                  </button>
                  {/* Play All button for this category */}
                  <button
                    onClick={() => {
                      // Filter tracks for this season
                      const seasonTracks = tracks.filter((t) =>
                        season === "all"
                          ? true
                          : season === "favourites"
                          ? !!t.isFavourite
                          : t.season === season
                      );
                      if (seasonTracks.length > 0) {
                        setActiveSeason(season);
                        playTrack(seasonTracks[0]);
                      }
                    }}
                    className="w-5 h-5 rounded-full flex items-center justify-center bg-white/5 hover:bg-rose-500/80 text-white/50 hover:text-white transition-all focus:outline-none active:scale-90"
                    aria-label={`Play ${season === "all" ? "all tracks" : season === "favourites" ? "favourites" : `season ${season}`}`}
                    title="Play all"
                  >
                    <svg className="w-2.5 h-2.5 fill-current translate-x-[0.5px]" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Tracklist */}
          <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-1.5 scrollbar-thin">
            {filteredTracks.length > 0 ? (
              filteredTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    currentTrackId === track.id
                      ? "bg-white/10 border-rose-500/30 text-rose-400"
                      : "bg-transparent border-transparent hover:bg-white/5 text-white/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Tiny Cover */}
                    <div
                      className="w-8 h-8 rounded-lg bg-cover bg-center flex-shrink-0 relative overflow-hidden"
                      style={{ backgroundImage: `url(${track.cover})` }}
                    >
                      {currentTrackId === track.id && isPlaying && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          {/* Live Equalizer Animation */}
                          <div className="flex items-end gap-[2px] h-3">
                            <span className="w-[2px] bg-rose-500 animate-[bounce_0.8s_infinite_0s] rounded-full" />
                            <span className="w-[2px] bg-rose-500 h-2.5 animate-[bounce_0.8s_infinite_0.2s] rounded-full" />
                            <span className="w-[2px] bg-rose-500 h-1.5 animate-[bounce_0.8s_infinite_0.4s] rounded-full" />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Labels */}
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold truncate leading-tight">
                        {track.title}
                      </p>
                      <p className="text-[10.5px] text-white/50 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono uppercase text-white/40 tracking-wider bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                    {track.season === 1 ? "90s" : track.season === 2 ? "Retro" : track.season === 3 ? "Indie" : "Bass"}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-44 text-white/40 text-xs">
                <svg
                  className="w-8 h-8 opacity-40 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                No matching tracks found
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP PLAYER (pill layout) */}
      {/* ========================================================================= */}
      <div
        className={`hidden sm:flex items-center gap-4 p-3 pr-6 rounded-full w-full ${glassClass}`}
      >
        {/* Spinning Vinyl */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <div
            className="w-full h-full rounded-full bg-black border border-white/10 overflow-hidden shadow-lg animate-vinyl-spin"
            style={{
              animationPlayState: (isPlaying && !isLoadingTrack) ? "running" : "paused",
              backgroundImage: `url(${currentTrack.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Vinyl Grooves Overlay */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_50%,transparent_60%,rgba(0,0,0,0.4)_70%,transparent_80%)] pointer-events-none" />
          {/* Spindle Hole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black/70 ring-2 ring-white/40 shadow-inner" />
        </div>

        {/* Right side container: Metadata and Controls on Top, full-width Seek Bar at the bottom */}
        <div className="flex-grow flex flex-col gap-1 min-w-0">
          
          {/* Top Row: Info (left) and Transport Controls (right) */}
          <div className="flex justify-between items-center w-full gap-4">
            
            {/* Info Section */}
            <div className="min-w-0 truncate text-left select-none flex-grow">
              {isLoadingTrack && (
                <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest animate-pulse h-3 leading-none mb-0.5">
                  Streaming...
                </div>
              )}
              <h2 className="text-[15.5px] font-semibold text-white truncate leading-tight">
                {currentTrack.title}
              </h2>
              <p className="text-[12.5px] text-white/50 truncate font-normal leading-tight mt-0.5">
                {currentTrack.artist}
              </p>
            </div>

            {/* Transport Controls (positioned next to info) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Shuffle */}
              <button
                onClick={handleShuffle}
                className={`p-1.5 rounded-full transition-all focus:outline-none active:scale-95 ${
                  isShuffled ? "text-rose-400" : "text-white/70 hover:text-white"
                }`}
                aria-label="Shuffle"
              >
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
              </button>
              {/* Previous Track */}
              <button
                onClick={handlePrev}
                className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
                aria-label="Previous Track"
              >
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6L18 6v12z" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 hover:scale-105 active:scale-95 text-white transition-all focus:outline-none shadow-md"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-[18px] h-[18px] fill-current translate-x-[1px]" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={handleNext}
                className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
                aria-label="Next Track"
              >
                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6zm9-12v12h2V6z" />
                </svg>
              </button>

              {/* Toggle Catalog Panel Button */}
              <button
                onClick={() => setIsCatalogOpen((prev) => !prev)}
                className={`p-1.5 rounded-full transition-all focus:outline-none active:scale-95 ${
                  isCatalogOpen ? "text-rose-400 bg-white/5" : "text-white/70 hover:text-white"
                }`}
                aria-label="Toggle Catalog"
              >
                <svg className="w-[18px] h-[18px] fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Volume Control */}
              <div className="relative group/volume flex items-center">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
                  aria-label="Mute/Unmute"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    </svg>
                  ) : (
                    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                {/* Mini Volume Popover/Slider */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-20 h-7 bg-black/90 border border-white/10 rounded-full flex items-center justify-center px-2 opacity-0 scale-95 pointer-events-none group-hover/volume:opacity-100 group-hover/volume:scale-100 group-hover/volume:pointer-events-auto transition-all duration-200">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[8px] [&::-webkit-slider-thumb]:h-[8px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                      [&::-moz-range-thumb]:w-[8px] [&::-moz-range-thumb]:h-[8px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: Full-width Seek Bar (Timer + Progress Slider + Timer Row) */}
          <div className="flex items-center gap-3 w-full mt-1 select-none">
            <span className="text-[11px] text-white/50 font-mono tabular-nums flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            
            {/* Progress Seek Bar */}
            <div className="relative flex-grow h-4 flex items-center group">
              {/* Custom Track Rail */}
              <div className="absolute left-0 right-0 h-[3px] bg-white/15 rounded-full pointer-events-none">
                {/* Highlight active progress fill */}
                <div
                  className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_#e11d48]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {/* Invisible Range Input Slider */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full custom-slider"
              />
            </div>

            <span className="text-[11px] text-white/50 font-mono tabular-nums flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE PLAYER (stacked card layout) */}
      {/* ========================================================================= */}
      <div
        className={`sm:hidden flex flex-col p-6 rounded-3xl w-full select-none ${glassClass}`}
      >
        {/* Vinyl Centerpiece */}
        <div className="flex justify-center mb-6">
          <div className="relative w-44 h-44 flex-shrink-0 shadow-2xl">
            <div
              className="w-full h-full rounded-full bg-black border border-white/10 overflow-hidden shadow-lg animate-vinyl-spin"
              style={{
                animationPlayState: (isPlaying && !isLoadingTrack) ? "running" : "paused",
                backgroundImage: `url(${currentTrack.cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {/* Vinyl Grooves Overlay */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_50%,transparent_60%,rgba(0,0,0,0.4)_70%,transparent_80%)] pointer-events-none" />
            {/* Spindle Hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/70 ring-4 ring-white/40 shadow-inner" />
          </div>
        </div>

        {/* Title and Artist */}
        <div className="text-center mb-4 min-w-0">
          <h2 className="text-[17px] font-semibold text-white truncate px-2">
            {currentTrack.title}
          </h2>
          <p className="text-[14px] text-white/60 truncate mt-0.5">
            {currentTrack.artist}
          </p>
        </div>

        {/* Seek Bar */}
        <div className="relative w-full h-6 flex items-center group mb-2">
          {/* Custom Track Rail */}
          <div className="absolute left-0 right-0 h-[3px] bg-white/15 rounded-full pointer-events-none">
            {/* Highlight active progress fill */}
            <div
              className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_#e11d48]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Invisible Range Input Slider */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="absolute inset-0 w-full h-full custom-slider"
          />
        </div>

        {/* Timers */}
        <div className="flex justify-between items-center text-[11px] text-white/60 tabular-nums mb-6 select-none">
          {isLoadingTrack ? (
            <span className="w-full text-center text-rose-400 font-medium animate-pulse">Streaming track...</span>
          ) : (
            <>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </>
          )}
        </div>

        {/* Transport & Volume Bottom Row */}
        <div className="flex items-center justify-between px-2">
          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            className={`p-3 rounded-full transition-all focus:outline-none active:scale-95 ${
              isShuffled ? "text-rose-400" : "text-white/70 hover:text-white"
            }`}
            aria-label="Shuffle"
          >
            <svg className="w-[20px] h-[20px] fill-current" viewBox="0 0 24 24">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          {/* Toggle Catalog Panel Button */}
          <button
            onClick={() => setIsCatalogOpen((prev) => !prev)}
            className={`p-3 rounded-full transition-all focus:outline-none active:scale-95 ${
              isCatalogOpen ? "text-rose-400" : "text-white/70 hover:text-white"
            }`}
            aria-label="Toggle Catalog"
          >
            <svg className="w-[20px] h-[20px] fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>

          {/* Audio Transport */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
              aria-label="Previous Track"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6L18 6v12z" />
              </svg>
            </button>

            <button
              onClick={handlePlayPause}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 hover:scale-105 active:scale-95 text-white transition-all focus:outline-none shadow-md"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 fill-current translate-x-[1px]" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleNext}
              className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
              aria-label="Next Track"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6zm9-12v12h2V6z" />
              </svg>
            </button>
          </div>

          {/* Mute/Volume Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
            aria-label="Mute/Unmute"
          >
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
