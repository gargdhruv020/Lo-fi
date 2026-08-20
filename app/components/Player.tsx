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

  // LocalStorage state persistence key
  const LOCAL_STORAGE_KEY = "lofi_player_state";

  // State Management with LocalStorage persistence
  const [currentTrackId, setCurrentTrackId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved && saved.trackId) return saved.trackId;
        }
      } catch (e) {}
    }
    const defaultCatalog = getHustleCatalog();
    return defaultCatalog.length > 0 ? defaultCatalog[0].id : "";
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (typeof saved.index === "number") return saved.index;
        }
      } catch (e) {}
    }
    return 0;
  });

  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (typeof saved.currentTime === "number") return saved.currentTime;
        }
      } catch (e) {}
    }
    return 0;
  });

  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (typeof saved.volume === "number") return saved.volume;
        }
      } catch (e) {}
    }
    return 0.8;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (typeof saved.isMuted === "boolean") return saved.isMuted;
        }
      } catch (e) {}
    }
    return false;
  });

  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const [isShuffled, setIsShuffled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (typeof saved.isShuffled === "boolean") return saved.isShuffled;
        }
      } catch (e) {}
    }
    return false;
  });

  // Catalog panel states
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | "all" | "favourites">(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved && saved.activeSeason !== undefined) return saved.activeSeason;
        }
      } catch (e) {}
    }
    return "all";
  });
  const [searchQuery, setSearchQuery] = useState("");

  const playerRef = useRef<HTMLDivElement | null>(null);
  const catalogListRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrackIdRef = useRef(currentTrackId);
  const currentIndexRef = useRef<number>(currentIndex);
  const tracksRef = useRef<CatalogTrack[]>(catalog);
  const activePlaylistRef = useRef<CatalogTrack[]>(catalog);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const useNativeAudioRef = useRef(true);

  // Synchronize mutable refs
  useEffect(() => {
    activeTrackIdRef.current = currentTrackId;
  }, [currentTrackId]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Currently active scoped playlist based on category/season selection
  const activePlaylistTracks = useMemo(() => {
    let list = catalog.filter((track) => {
      if (activeSeason === "all") return true;
      if (activeSeason === "favourites") return !!track.isFavourite;
      return track.season === activeSeason;
    });
    if (list.length === 0) list = catalog;
    return list;
  }, [catalog, activeSeason]);

  useEffect(() => {
    activePlaylistRef.current = activePlaylistTracks;
  }, [activePlaylistTracks]);

  // Save Player State to LocalStorage on changes
  useEffect(() => {
    if (typeof window === "undefined" || !currentTrackId) return;

    try {
      const stateToSave = {
        trackId: currentTrackId,
        index: currentIndex,
        currentTime: currentTime,
        volume: volume,
        isMuted: isMuted,
        isShuffled: isShuffled,
        activeSeason: activeSeason,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn("Failed to save player state to localStorage:", err);
    }
  }, [currentTrackId, currentIndex, currentTime, volume, isMuted, isShuffled, activeSeason]);

  // Auto-scroll catalog drawer to active track whenever catalog is opened
  useEffect(() => {
    if (isCatalogOpen && catalogListRef.current) {
      const timer = setTimeout(() => {
        const activeEl = catalogListRef.current?.querySelector(`[data-track-id="${currentTrackId}"]`);
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isCatalogOpen, currentTrackId]);

  // Sync audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
      ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

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

  // Current track object — resolves directly against full catalog
  const currentTrack = useMemo(() => {
    return catalog.find((t) => t.id === currentTrackId) || tracks.find((t) => t.id === currentTrackId) || catalog[0];
  }, [catalog, tracks, currentTrackId]);

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

  // Media Session Metadata update helper
  const updateMediaSessionMetadata = (track: CatalogTrack) => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !track) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: `Lo-Fi Radio — ${track.season === 1 ? "90s & 2000s" : track.season === 2 ? "Retro & Golden Era" : "Modern & Indie"}`,
        artwork: [
          { src: track.cover, sizes: "512x512", type: "image/jpeg" },
          { src: track.cover, sizes: "256x256", type: "image/jpeg" },
          { src: track.cover, sizes: "96x96", type: "image/jpeg" },
        ],
      });
    } catch (err) {
      console.warn("Failed to set Media Session metadata:", err);
    }
  };

  // Helper refs for Media Session actions to prevent stale closures
  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const handlePlayPauseRef = useRef<() => void>(() => {});

  // Update Media Session action handlers once on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const setAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (e) {}
    };

    setAction("play", async () => {
      if (audioRef.current && useNativeAudioRef.current) {
        try {
          await audioRef.current.play();
        } catch (err) {
          console.error("MediaSession play failed:", err);
        }
      } else {
        handlePlayPauseRef.current();
      }
    });

    setAction("pause", () => {
      if (audioRef.current && useNativeAudioRef.current) {
        audioRef.current.pause();
      } else {
        handlePlayPauseRef.current();
      }
    });

    setAction("previoustrack", () => {
      handlePrevRef.current();
    });

    setAction("nexttrack", () => {
      handleNextRef.current();
    });

    setAction("seekbackward", (details) => {
      const skip = details.seekOffset || 10;
      if (audioRef.current && useNativeAudioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skip);
      }
    });

    setAction("seekforward", (details) => {
      const skip = details.seekOffset || 10;
      if (audioRef.current && useNativeAudioRef.current) {
        audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + skip);
      }
    });

    setAction("seekto", (details) => {
      if (details.seekTime !== undefined && details.seekTime !== null && audioRef.current && useNativeAudioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
  }, []);

  // Sync Media Session Metadata when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      updateMediaSessionMetadata(currentTrack);
    }
  }, [currentTrack]);

  // Native HTML5 Audio Event Handlers
  const handleNativePlay = () => {
    setIsPlaying(true);
    setIsLoadingTrack(false);
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }
  };

  const handleNativePause = () => {
    setIsPlaying(false);
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }
  };

  const handleNativeTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const handleNativeLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleNativeEnded = () => {
    handleNext();
  };

  const handleNativeError = (e: any) => {
    console.error("HTML5 Audio playback error:", e);
    setIsLoadingTrack(false);
    handleNext();
  };

  // Centralized playTrack method
  const playTrack = async (track: CatalogTrack, explicitIndex?: number) => {
    if (!track) return;

    const activeList = activePlaylistRef.current.length > 0 ? activePlaylistRef.current : catalog;
    const idx = explicitIndex !== undefined ? explicitIndex : activeList.findIndex((t) => t.id === track.id);
    const validIndex = idx !== -1 ? idx : 0;

    setCurrentIndex(validIndex);
    currentIndexRef.current = validIndex;
    setCurrentTrackId(track.id);
    activeTrackIdRef.current = track.id;
    setIsLoadingTrack(true);

    // Update Media Session metadata immediately
    updateMediaSessionMetadata(track);

    // Fetch stream URL
    const queryParams = new URLSearchParams({
      id: track.id,
      title: track.title,
      artist: track.artist,
      season: String(track.season),
    });

    try {
      const res = await fetch(`/api/play?${queryParams.toString()}`);
      const data = await res.json();

      if (activeTrackIdRef.current !== track.id) return;

      if (data.audioUrl && audioRef.current) {
        useNativeAudioRef.current = true;
        const audio = audioRef.current;
        audio.src = data.audioUrl;
        audio.volume = isMuted ? 0 : volume;
        audio.load();

        try {
          await audio.play();
          console.log("AUDIO PLAY SUCCESS", {
            src: audio.src,
            currentSrc: audio.currentSrc,
            readyState: audio.readyState,
            networkState: audio.networkState,
            paused: audio.paused,
            duration: audio.duration,
          });
        } catch (err: any) {
          console.error("AUDIO PLAY FAILED", {
            name: err?.name,
            message: err?.message,
            src: audio.src,
            readyState: audio.readyState,
          });
          setIsLoadingTrack(false);
        }
      } else {
        console.warn("No direct audio URL returned for track:", track.title);
        setIsLoadingTrack(false);
      }
    } catch (err) {
      console.error("API play request failed:", err);
      setIsLoadingTrack(false);
    }
  };

  const handlePlayPause = async () => {
    if (useNativeAudioRef.current && audioRef.current) {
      const audio = audioRef.current;
      if (audio.paused) {
        if (!audio.src || audio.src === "") {
          await playTrack(currentTrack);
        } else {
          try {
            await audio.play();
            console.log("AUDIO PLAY TOGGLE SUCCESS", { src: audio.src, readyState: audio.readyState });
          } catch (err: any) {
            console.error("AUDIO PLAY TOGGLE FAILED", { name: err?.name, message: err?.message, src: audio.src });
          }
        }
      } else {
        audio.pause();
      }
      return;
    }
  };

  const handleNext = () => {
    const activeList = activePlaylistRef.current.length > 0 ? activePlaylistRef.current : catalog;
    if (activeList.length === 0) return;

    const liveTrackId = activeTrackIdRef.current || currentTrackId;
    const currentListIndex = activeList.findIndex((t) => t.id === liveTrackId);
    const safeIndex = currentListIndex !== -1 ? currentListIndex : currentIndexRef.current;
    const nextIndex = (safeIndex + 1) % activeList.length;
    const nextTrack = activeList[nextIndex];

    if (nextTrack) {
      playTrack(nextTrack, nextIndex);
    }
  };

  const handlePrev = () => {
    const activeList = activePlaylistRef.current.length > 0 ? activePlaylistRef.current : catalog;
    if (activeList.length === 0) return;

    const liveTrackId = activeTrackIdRef.current || currentTrackId;
    const currentListIndex = activeList.findIndex((t) => t.id === liveTrackId);
    const safeIndex = currentListIndex !== -1 ? currentListIndex : currentIndexRef.current;
    const prevIndex = (safeIndex - 1 + activeList.length) % activeList.length;
    const prevTrack = activeList[prevIndex];

    if (prevTrack) {
      playTrack(prevTrack, prevIndex);
    }
  };

  // Sync ref pointers for action handlers
  useEffect(() => {
    handleNextRef.current = handleNext;
    handlePrevRef.current = handlePrev;
    handlePlayPauseRef.current = handlePlayPause;
  });

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
      setTracks(catalog);
      tracksRef.current = catalog;
      setIsShuffled(false);
      const newIndex = catalog.findIndex((t) => t.id === currentTrackId);
      const safeIndex = newIndex !== -1 ? newIndex : 0;
      setCurrentIndex(safeIndex);
      currentIndexRef.current = safeIndex;
    } else {
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

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
  };

  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const time = parseFloat(target.value);

    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }

    setCurrentTime(time);
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
      {/* 1 Persistent HTML5 Audio Element */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        className="sr-only opacity-0 w-0 h-0 pointer-events-none absolute"
        onPlay={handleNativePlay}
        onPause={handleNativePause}
        onTimeUpdate={handleNativeTimeUpdate}
        onLoadedMetadata={handleNativeLoadedMetadata}
        onEnded={handleNativeEnded}
        onError={handleNativeError}
      />

      {/* Hidden YouTube Iframe Container */}
      <div className="fixed -left-[9999px] top-0 w-[200px] h-[200px] opacity-0 pointer-events-none z-0">
        <div ref={ytContainerRef} />
      </div>

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
          <div ref={catalogListRef} className="flex-1 overflow-y-auto mt-3 pr-1 space-y-1.5 scrollbar-thin">
            {filteredTracks.length > 0 ? (
              filteredTracks.map((track) => (
                <div
                  key={track.id}
                  data-track-id={track.id}
                  onClick={() => selectTrack(track)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    currentTrackId === track.id
                      ? "bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold shadow-[0_0_14px_rgba(244,63,94,0.2)]"
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
                    d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>No tracks match your search</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP PLAYER (horizontal layout) */}
      {/* ========================================================================= */}
      <div className={`hidden sm:flex items-center gap-4 px-5 py-3.5 rounded-full w-full select-none ${glassClass}`}>
        {/* Left Vinyl Icon */}
        <div className="relative w-11 h-11 flex-shrink-0">
          <div
            className="w-full h-full rounded-full bg-black border border-white/10 overflow-hidden shadow-md animate-vinyl-spin"
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

            {/* Transport Controls */}
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

          {/* Bottom Row: Full-width Seek Bar */}
          <div className="flex items-center gap-3 w-full mt-1 select-none">
            <span className="text-[11px] text-white/50 font-mono tabular-nums flex-shrink-0">
              {formatTime(currentTime)}
            </span>
            
            {/* Progress Seek Bar */}
            <div className="relative flex-grow h-4 flex items-center group">
              <div className="absolute left-0 right-0 h-[3px] bg-white/15 rounded-full pointer-events-none">
                <div
                  className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_#e11d48]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
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
          <div className="absolute left-0 right-0 h-[3px] bg-white/15 rounded-full pointer-events-none">
            <div
              className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_#e11d48]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
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
              isCatalogOpen ? "text-rose-400 bg-white/5" : "text-white/70 hover:text-white"
            }`}
            aria-label="Toggle Catalog"
          >
            <svg className="w-[20px] h-[20px] fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>

          {/* Previous Track */}
          <button
            onClick={handlePrev}
            className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
            aria-label="Previous Track"
          >
            <svg className="w-[22px] h-[22px] fill-current" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6L18 6v12z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 hover:scale-105 active:scale-95 text-white transition-all focus:outline-none shadow-lg"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-[24px] h-[24px] fill-current" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-[24px] h-[24px] fill-current translate-x-[1px]" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={handleNext}
            className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
            aria-label="Next Track"
          >
            <svg className="w-[22px] h-[22px] fill-current" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6zm9-12v12h2V6z" />
            </svg>
          </button>

          {/* Volume Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 text-white/70 hover:text-white active:scale-95 transition-all focus:outline-none"
            aria-label="Mute/Unmute"
          >
            {isMuted || volume === 0 ? (
              <svg className="w-[20px] h-[20px] fill-current" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="w-[20px] h-[20px] fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
