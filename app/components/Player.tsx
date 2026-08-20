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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [isShuffled, setIsShuffled] = useState(true);

  // Catalog panel states
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState<number | "all" | "favourites">("favourites");
  const [searchQuery, setSearchQuery] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const isSwappingSource = useRef(false);

  // Randomize track order and starting track on client mount (preventing SSR hydration mismatches)
  useEffect(() => {
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

    const shuffledCatalog = shuffleArray(catalog);
    
    // Defer state updates to next tick to avoid synchronous cascading renders linter warning
    const timer = setTimeout(() => {
      setTracks(shuffledCatalog);
      // Pick the first track of the shuffled catalog as the random starting song
      if (shuffledCatalog.length > 0) {
        const startTrack = shuffledCatalog[0];
        setCurrentTrackId(startTrack.id);
        if (audioRef.current) {
          audioRef.current.src = `/audio/${startTrack.id}.m4a`;
          audioRef.current.load();
        }
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

  // Find index in the CURRENT filtered list or fallback to main catalog
  const getSiblingTrackId = (direction: "next" | "prev"): string => {
    const playlistToUse = filteredTracks.length > 0 ? filteredTracks : tracks;
    let currentIndex = playlistToUse.findIndex((t) => t.id === currentTrack.id);

    // If the active track is not in the active filtered view, navigate using the full catalog
    if (currentIndex === -1) {
      currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex === -1) return tracks[0]?.id || "";

      if (direction === "next") {
        return tracks[(currentIndex + 1) % tracks.length].id;
      } else {
        return tracks[(currentIndex - 1 + tracks.length) % tracks.length].id;
      }
    }

    if (direction === "next") {
      const nextIndex = (currentIndex + 1) % playlistToUse.length;
      return playlistToUse[nextIndex].id;
    } else {
      const prevIndex = (currentIndex - 1 + playlistToUse.length) % playlistToUse.length;
      return playlistToUse[prevIndex].id;
    }
  };

  // Centralized playTrack method to guarantee synchronous playback trigger within the click context
  const playTrack = (track: CatalogTrack) => {
    if (!track) return;

    setCurrentTrackId(track.id);
    setIsPlaying(true);

    const audio = audioRef.current;
    if (!audio) return;

    const isDownloaded = downloadedTracks.has(track.id);
    const localUrl = `/audio/${track.id}.m4a`;

    if (isDownloaded) {
      // 1. Play local file synchronously (user event handler context) - guaranteed to succeed!
      setIsLoadingTrack(false);
      isSwappingSource.current = true;
      audio.src = localUrl;
      audio.load();
      audio.play()
        .then(() => { isSwappingSource.current = false; })
        .catch((playErr) => {
          console.warn("Local play failed:", playErr);
          isSwappingSource.current = false;
        });
    } else {
      // 2. Play fallback generic lofi loop synchronously (user event handler context) - guaranteed to succeed!
      setIsLoadingTrack(true);
      const trackIdx = catalog.findIndex((t) => t.id === track.id);
      const fallbackIdx = ((trackIdx >= 0 ? trackIdx : 0) % 6) + 1;
      isSwappingSource.current = true;
      audio.src = `/audio/song${fallbackIdx}.mp3`;
      audio.load();
      audio.play()
        .then(() => { isSwappingSource.current = false; })
        .catch((playErr) => {
          console.warn("Fallback play failed:", playErr);
          isSwappingSource.current = false;
        });

      // 3. Download the track on demand in the background
      const queryParams = new URLSearchParams({
        id: track.id,
        title: track.title,
        artist: track.artist,
        season: String(track.season),
      });

      fetch(`/api/play?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          // Add track ID to downloadedTracks state and cache
          setDownloadedTracks((prev) => {
            const nextSet = new Set(prev);
            nextSet.add(track.id);
            return nextSet;
          });

          // Swap sources seamlessly if we are still playing the fallback loop for this track
          if (audio.src.includes("/audio/song")) {
            const currentPlaybackTime = audio.currentTime;
            isSwappingSource.current = true;
            audio.src = data.url;
            audio.load();
            audio.currentTime = currentPlaybackTime;
            audio.play()
              .then(() => { isSwappingSource.current = false; })
              .catch(() => { isSwappingSource.current = false; });
          }
        })
        .catch((downloaderErr) => console.error("Downloader API failed:", downloaderErr))
        .finally(() => {
          setIsLoadingTrack(false);
        });
    }
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
      const nextId = getSiblingTrackId("next");
      const prevId = getSiblingTrackId("prev");
      
      const nextTrack = tracks.find((t) => t.id === nextId);
      const prevTrack = tracks.find((t) => t.id === prevId);
      
      if (nextTrack) prefetchTrack(nextTrack);
      if (prevTrack) prefetchTrack(prevTrack);
    }, 1500);

    return () => clearTimeout(prefetchTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackId, tracks, filteredTracks]);

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
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Sync Media Session playback state and handle tab visibility restoration
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
        updateMediaPosition();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (tracks.length > 0) setCurrentTrackId(getSiblingTrackId("prev"));
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (tracks.length > 0) setCurrentTrackId(getSiblingTrackId("next"));
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackId, currentTrack, tracks, filteredTracks]);

  const handleAudioError = () => {
    const audio = audioRef.current;
    if (!audio) return;
    console.warn("Audio playback encountered an error, falling back to a local loop.");
    if (!audio.src.includes("/audio/song")) {
      audio.src = "/audio/song1.mp3";
      audio.load();
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    }
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Direct play failed, invoking playTrack fallback:", err);
          playTrack(currentTrack);
        });
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
      setIsShuffled(false);
    } else {
      // Turn on shuffle: randomize the track list
      setTracks(shuffleArray(tracks));
      setIsShuffled(true);
    }
  };



  const handleNext = () => {
    if (tracks.length === 0) return;
    const nextId = getSiblingTrackId("next");
    const nextTrack = tracks.find((t) => t.id === nextId);
    if (nextTrack) playTrack(nextTrack);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    const prevId = getSiblingTrackId("prev");
    const prevTrack = tracks.find((t) => t.id === prevId);
    if (prevTrack) playTrack(prevTrack);
  };

  const updateMediaPosition = () => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && "setPositionState" in navigator.mediaSession && audioRef.current) {
      try {
        const dur = audioRef.current.duration;
        const pos = audioRef.current.currentTime;
        if (!isNaN(dur) && !isNaN(pos) && dur > 0 && pos >= 0 && pos <= dur) {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: audioRef.current.playbackRate || 1,
            position: pos,
          });
        }
      } catch (err) {
        console.warn("Failed to set Media Session position state:", err);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      updateMediaPosition();
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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      updateMediaPosition();
    }
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
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          if (isSwappingSource.current) return;
          if (audioRef.current && audioRef.current.readyState > 0 && !audioRef.current.ended) {
            setIsPlaying(false);
          }
        }}
        onError={handleAudioError}
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
