import { useState, useEffect, useCallback, useRef } from "react";
import { api, Track, getThumbUrl } from "./api";
import { StoreProvider, useFavorites, useHistory } from "./lib/store";
import Sidebar from "./components/Sidebar";
import HomePage from "./components/HomePage";
import SearchPage from "./components/SearchPage";
import AlbumPage from "./components/AlbumPage";
import ArtistPage from "./components/ArtistPage";
import PlaylistPage from "./components/PlaylistPage";
import FavoritesPage from "./components/FavoritesPage";
import HistoryPage from "./components/HistoryPage";
import PlaylistListPage from "./components/PlaylistListPage";
import PlaylistDetailPage from "./components/PlaylistDetailPage";
import StatsPage from "./components/StatsPage";
import SettingsPage from "./components/SettingsPage";
import NowPlayingBar from "./components/NowPlayingBar";
import FullPlayer from "./components/FullPlayer";
import ShortcutOverlay from "./components/ShortcutOverlay";
import ContextMenu, { ContextMenuItem } from "./components/ContextMenu";

type Page =
  | { name: "home" }
  | { name: "search"; query: string }
  | { name: "album"; browseId: string }
  | { name: "artist"; channelId: string }
  | { name: "playlist"; listId: string }
  | { name: "favorites" }
  | { name: "history" }
  | { name: "playlist-list" }
  | { name: "playlist-detail"; playlistId: string }
  | { name: "stats" }
  | { name: "settings" };

function loadVolume(): number {
  try { return Number(localStorage.getItem("gtube-volume")) || 50; } catch { return 50; }
}
function saveVolume(v: number) {
  try { localStorage.setItem("gtube-volume", String(v)); } catch {}
}

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveState(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function AppInner() {
  const { isFavorited, toggleFavorite } = useFavorites();
  const { recordPlay } = useHistory();
  const [page, setPage] = useState<Page>({ name: "home" });
  const [homeData, setHomeData] = useState<any[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState("");

  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => loadState("gtube-currentTrack", null));
  const [queue, setQueue] = useState<any[]>(() => loadState("gtube-queue", []));
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(loadVolume);
  const [showFull, setShowFull] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [shuffle, setShuffle] = useState(() => loadState("gtube-shuffle", false));
  const [repeat, setRepeat] = useState<"off" | "all" | "one">(() => loadState("gtube-repeat", "off"));
  const [playbackSpeed, setPlaybackSpeed] = useState(() => loadState("gtube-speed", 1));
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; pos: { x: number; y: number } } | null>(null);
  const [volumeNormalization, setVolumeNormalization] = useState(() => {
    try { return localStorage.getItem("gtube-normalization") === "true"; } catch { return false; }
  });
  const [radioMode, setRadioMode] = useState(() => {
    try { return localStorage.getItem("gtube-radio") === "true"; } catch { return false; }
  });
  const [crossfade, setCrossfade] = useState(() => {
    try { return localStorage.getItem("gtube-crossfade") === "true"; } catch { return false; }
  });
  const crossfadeRef = useRef(crossfade);
  crossfadeRef.current = crossfade;

  // Persist playback state to localStorage
  useEffect(() => { saveState("gtube-currentTrack", currentTrack); }, [currentTrack]);
  useEffect(() => { saveState("gtube-queue", queue); }, [queue]);
  useEffect(() => { saveState("gtube-shuffle", shuffle); }, [shuffle]);
  useEffect(() => { saveState("gtube-repeat", repeat); }, [repeat]);
  useEffect(() => { saveState("gtube-speed", playbackSpeed); }, [playbackSpeed]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipNextRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const historyRecordedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;
    let crossfading = false;
    const onTime = () => {
      setPosition(audio.currentTime);
      // Record play after 30 seconds
      if (!historyRecordedRef.current && audio.currentTime >= 30 && currentTrack) {
        historyRecordedRef.current = true;
        recordPlay({
          videoId: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          thumbnail: currentTrack.album_art,
          duration: currentTrack.duration,
          playDuration: audio.currentTime,
        });
      }
      // Crossfade: start next track 3 seconds before end
      if (crossfadeRef.current && audio.duration > 0 && !crossfading) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= 3 && remaining > 0) {
          crossfading = true;
          // Fade out current
          const fadeOut = setInterval(() => {
            if (audio.volume > 0.05) {
              audio.volume = Math.max(0, audio.volume - 0.05);
            } else {
              clearInterval(fadeOut);
              audio.volume = 0;
            }
          }, 100);
          // Start next track
          setTimeout(() => {
            skipNextRef.current().then(() => {
              // Fade in new track
              const newAudio = audioRef.current;
              if (newAudio) {
                newAudio.volume = 0;
                const fadeIn = setInterval(() => {
                  if (newAudio.volume < (volume / 100) - 0.05) {
                    newAudio.volume = Math.min(volume / 100, newAudio.volume + 0.05);
                  } else {
                    clearInterval(fadeIn);
                    newAudio.volume = volume / 100;
                  }
                }, 100);
              }
              crossfading = false;
            });
          }, 2000);
        }
      }
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => {
      if (crossfading) return;
      const rep = repeatRef.current;
      if (rep === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        skipNextRef.current();
      }
    };
    const onError = () => { setIsPlaying(false); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (page.name !== "home") return;
    setHomeLoading(true);
    setHomeError("");
    api.getHome()
      .then((d) => { setHomeData(d); })
      .catch(() => setHomeError("Could not load feed. Is the backend running?"))
      .finally(() => setHomeLoading(false));
  }, [page]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case "Space": e.preventDefault(); if (currentTrack) togglePlayPause(); break;
        case "ArrowRight": e.preventDefault(); if (duration > 0) seekTo(Math.min(position + 5, duration)); break;
        case "ArrowLeft": e.preventDefault(); if (duration > 0) seekTo(Math.max(position - 5, 0)); break;
        case "ArrowUp": e.preventDefault(); changeVolume(Math.min(volume + 5, 100)); break;
        case "ArrowDown": e.preventDefault(); changeVolume(Math.max(volume - 5, 0)); break;
        case "KeyN": if (currentTrack) skipNext(); break;
        case "KeyP": if (currentTrack) skipPrev(); break;
        case "KeyF": if (currentTrack) setShowFull((p) => !p); break;
        case "Escape": setShowFull(false); setShowShortcuts(false); break;
        case "Slash": if (e.shiftKey) { e.preventDefault(); setShowShortcuts((p) => !p); } break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const playStream = useCallback(async (trackId: string): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;
    try {
      audio.pause();
      audio.src = "";
      const url = await api.getStreamUrl(trackId);
      if (!url) throw new Error("No URL");
      audio.src = url;
      audio.currentTime = 0;
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch {
      try {
        audio.src = api.streamUrl(trackId);
        audio.currentTime = 0;
        await audio.play();
        setIsPlaying(true);
        return true;
      } catch (e) {
        console.error("playback failed", e);
        setIsPlaying(false);
        return false;
      }
    }
  }, []);

  const playTrack = useCallback(async (track: any, q?: any[]) => {
    historyRecordedRef.current = false;
    const thumbs = track.thumbnails || [];
    const albumRaw = track.album || {};
    const t: Track = {
      id: track.videoId || track.id || "",
      title: track.title || track.name || "Unknown",
      artist: track.artists?.[0]?.name || track.artist?.name || "",
      album: typeof albumRaw === "object" ? (albumRaw.name || "") : (albumRaw || ""),
      album_art: getThumbUrl(track.videoId || track.id || "", thumbs),
      duration: track.duration || 0,
    };
    setCurrentTrack(t);
    setQueue(q || [track]);
    setPosition(0);
    setDuration(t.duration);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((r) => (r.videoId || r.id) !== t.id);
      return [track, ...filtered].slice(0, 30);
    });
    await playStream(t.id);
  }, [playStream]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) { audio.play().catch(() => {}); setIsPlaying(true); }
    else { audio.pause(); setIsPlaying(false); }
  }, [currentTrack]);

  const seekTo = useCallback((pos: number) => {
    const audio = audioRef.current;
    if (audio) { audio.currentTime = pos; setPosition(pos); }
  }, []);

  const skipNext = useCallback(async () => {
    if (queue.length === 0 || !currentTrack) return;
    const idx = queue.findIndex((t) => (t.videoId || t.id) === currentTrack.id);
    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (idx + 1) % queue.length;
    }

    if (radioMode && nextIdx >= queue.length - 2) {
      try {
        const data = await api.getWatchQueue(currentTrack.id);
        const tracks = data?.tracks || data?.playlist || [];
        if (tracks.length > 0) {
          setQueue((prev) => {
            const existing = new Set(prev.map((t) => t.videoId || t.id));
            const newTracks = tracks.filter((t: any) => !existing.has(t.videoId || t.id));
            return [...prev, ...newTracks.slice(0, 15)];
          });
        }
      } catch {}
    }

    const next = queue[nextIdx];
    if (next) await playTrack(next, queue);
  }, [queue, currentTrack, playTrack, shuffle, radioMode]);

  skipNextRef.current = skipNext;

  const skipPrev = useCallback(async () => {
    if (queue.length === 0 || !currentTrack) return;
    const idx = queue.findIndex((t) => (t.videoId || t.id) === currentTrack.id);
    if (position > 3) { seekTo(0); return; }
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    if (prev) await playTrack(prev, queue);
  }, [queue, currentTrack, playTrack, position, seekTo]);

  const changeVolume = useCallback((vol: number) => {
    const audio = audioRef.current;
    const v = Math.max(0, Math.min(100, vol));
    setVolume(v);
    saveVolume(v);
    if (audio) {
      const effectiveVolume = volumeNormalization ? Math.min(1, (v / 100) * 1.25) : v / 100;
      audio.volume = effectiveVolume;
    }
  }, [volumeNormalization]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    const audio = audioRef.current;
    setPlaybackSpeed(speed);
    if (audio) audio.playbackRate = speed;
  }, []);

  const toggleNormalization = useCallback(() => {
    setVolumeNormalization((prev) => {
      const next = !prev;
      try { localStorage.setItem("gtube-normalization", String(next)); } catch {}
      const audio = audioRef.current;
      if (audio) {
        const effectiveVolume = next ? Math.min(1, (volume / 100) * 1.25) : volume / 100;
        audio.volume = effectiveVolume;
      }
      return next;
    });
  }, [volume]);

  const toggleRadioMode = useCallback(() => {
    setRadioMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("gtube-radio", String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleCrossfade = useCallback(() => {
    setCrossfade((prev) => {
      const next = !prev;
      try { localStorage.setItem("gtube-crossfade", String(next)); } catch {}
      return next;
    });
  }, []);

  const navigate = useCallback((p: Page) => setPage(p), []);

  const addToQueue = useCallback((track: any) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const playNext = useCallback((track: any) => {
    setQueue((prev) => {
      if (!currentTrack) return [track];
      const idx = prev.findIndex((t) => (t.videoId || t.id) === currentTrack.id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, track);
      return copy;
    });
  }, [currentTrack]);

  const clearQueue = useCallback(() => {
    if (currentTrack) {
      setQueue([queue.find((t) => (t.videoId || t.id) === currentTrack.id) || currentTrack]);
    }
  }, [queue, currentTrack]);

  const moveInQueue = useCallback((fromIdx: number, toIdx: number) => {
    setQueue((prev) => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  }, []);

  const handleContextMenu = useCallback((track: any, e: React.MouseEvent) => {
    e.preventDefault();
    const vid = track.videoId || track.id;
    const shareUrl = `https://music.youtube.com/watch?v=${vid}`;
    const liked = isFavorited(vid);
    const items: ContextMenuItem[] = [
      { label: liked ? "♥ Unlike" : "♡ Like", onClick: () => {
        toggleFavorite({
          videoId: vid,
          title: track.title || track.name || "",
          artist: track.artists?.[0]?.name || "",
          album: typeof track.album === "object" ? track.album?.name : track.album,
          thumbnail: track.thumbnails?.[0]?.url || "",
          duration: track.duration || 0,
        });
      }},
      { divider: true, label: "", onClick: () => {} },
      { label: "Play next", onClick: () => playNext(track) },
      { label: "Add to queue", onClick: () => addToQueue(track) },
      { divider: true, label: "", onClick: () => {} },
      { label: "Go to artist", onClick: () => {
        const ch = track.artists?.[0]?.id || track.artists?.[0]?.browseId;
        if (ch) navigate({ name: "artist", channelId: ch });
      }},
      { label: "Go to album", onClick: () => {
        const bid = track.album?.id || track.album?.browseId;
        if (bid) navigate({ name: "album", browseId: bid });
      }},
      { divider: true, label: "", onClick: () => {} },
      { label: "Share", onClick: () => {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }},
      { label: "Copy link", onClick: () => {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }},
    ];
    setContextMenu({ items, pos: { x: e.clientX, y: e.clientY } });
  }, [playNext, addToQueue, navigate, isFavorited, toggleFavorite]);

  const handleSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    navigate({ name: "search", query: q.trim() });
  }, [navigate]);

  const mainContent = () => {
    switch (page.name) {
      case "home":
        return <HomePage data={homeData} loading={homeLoading} error={homeError} onPlay={playTrack} onSearch={handleSearch} onNavigate={navigate} recentlyPlayed={recentlyPlayed} />;
      case "search":
        return <SearchPage query={page.query} onPlay={playTrack} onNavigate={navigate} onContextMenu={handleContextMenu} />;
      case "album":
        return <AlbumPage browseId={page.browseId} onPlay={playTrack} onContextMenu={handleContextMenu} onBack={() => navigate({ name: "home" })} />;
      case "artist":
        return <ArtistPage channelId={page.channelId} onPlay={playTrack} onPlayAlbum={(bid) => navigate({ name: "album", browseId: bid })} onBack={() => navigate({ name: "home" })} />;
      case "playlist":
        return <PlaylistPage listId={page.listId} onPlay={playTrack} onContextMenu={handleContextMenu} onBack={() => navigate({ name: "home" })} />;
      case "favorites":
        return <FavoritesPage onPlay={(tracks, idx) => playTrack(tracks[idx], tracks)} />;
      case "history":
        return <HistoryPage onPlay={(tracks, idx) => playTrack(tracks[idx], tracks)} />;
      case "playlist-list":
        return <PlaylistListPage onNavigate={navigate} />;
      case "playlist-detail":
        return <PlaylistDetailPage
          playlistId={page.playlistId}
          onPlay={(tracks, idx) => playTrack(tracks[idx], tracks)}
          onBack={() => navigate({ name: "playlist-list" })}
        />;
      case "stats":
        return <StatsPage />;
      case "settings":
        return <SettingsPage />;
    }
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-elevated)",
      color: "var(--text)",
    }}>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar page={page.name} onNavigate={(name) => navigate({ name: name as any, ...(name === "search" ? { query: "" } : {}) } as Page)} mobileOpen={mobileSidebar} onMobileClose={() => setMobileSidebar(false)} />
        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          margin: "var(--space-2) var(--space-2) 0 0",
        }}>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileSidebar(true)}
            style={{
              position: "sticky",
              top: 0,
              left: 0,
              zIndex: 10,
              display: "none",
              background: "rgba(18,18,18,0.9)",
              backdropFilter: "blur(8px)",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              padding: "var(--space-3) var(--space-4)",
              width: "100%",
              textAlign: "left",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              alignItems: "center",
              gap: "var(--space-2)",
            }}
            className="mobile-hamburger"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            Menu
          </button>
          {mainContent()}
        </main>
      </div>

      {currentTrack && !showFull && (
        <NowPlayingBar
          track={currentTrack}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          volume={volume}
          shuffle={shuffle}
          repeat={repeat}
          playbackSpeed={playbackSpeed}
          volumeNormalization={volumeNormalization}
          radioMode={radioMode}
          crossfade={crossfade}
          onPlayPause={togglePlayPause}
          onNext={skipNext}
          onPrev={skipPrev}
          onSeek={seekTo}
          onVolumeChange={changeVolume}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off")}
          onPlaybackSpeedChange={changePlaybackSpeed}
          onNormalizationToggle={toggleNormalization}
          onRadioModeToggle={toggleRadioMode}
          onCrossfadeToggle={toggleCrossfade}
          onSleepExpire={() => { const a = audioRef.current; if (a) { a.pause(); setIsPlaying(false); } }}
          onExpand={() => setShowFull(true)}
        />
      )}

      {currentTrack && showFull && (
        <FullPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          position={position}
          duration={duration}
          volume={volume}
          queue={queue}
          shuffle={shuffle}
          repeat={repeat}
          playbackSpeed={playbackSpeed}
          onClose={() => setShowFull(false)}
          onPlayPause={togglePlayPause}
          onNext={skipNext}
          onPrev={skipPrev}
          onSeek={seekTo}
          onVolumeChange={changeVolume}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off")}
          onPlaybackSpeedChange={changePlaybackSpeed}
          onClearQueue={clearQueue}
          onPlayTrack={(track, q) => { playTrack(track, q); setShowFull(true); }}
          onMoveInQueue={moveInQueue}
        />
      )}

      <ShortcutOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {contextMenu && <ContextMenu items={contextMenu.items} position={contextMenu.pos} onClose={() => setContextMenu(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
