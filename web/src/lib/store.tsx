/**
 * GTube — React store context + hooks
 * Provides favorites, playlists, history, and stats via IndexedDB
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import * as db from "./db";

// ── Types ──────────────────────────────────────

export interface PlaylistTrack {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: PlaylistTrack[];
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Favorite {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
  addedAt: number;
}

export interface HistoryEntry {
  id?: number;
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
  playedAt: number;
  playDuration: number;
}

interface StoreCtx {
  // Favorites
  favorites: Favorite[];
  favoritesLoaded: boolean;
  isFavorited: (videoId: string) => boolean;
  toggleFavorite: (track: Omit<Favorite, "addedAt">) => void;
  // Playlists
  playlists: Playlist[];
  playlistsLoaded: boolean;
  createPlaylist: (name: string, description?: string) => Promise<string>;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  updatePlaylistDescription: (id: string, description: string) => void;
  addToPlaylist: (playlistId: string, track: Omit<PlaylistTrack, "addedAt">) => void;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
  reorderPlaylist: (playlistId: string, fromIdx: number, toIdx: number) => void;
  // History
  history: HistoryEntry[];
  historyLoaded: boolean;
  recordPlay: (entry: Omit<HistoryEntry, "id" | "playedAt">) => void;
  clearHistory: () => void;
  getTopArtists: (days?: number) => { artist: string; count: number; channelId?: string }[];
  getTopTracks: (days?: number) => { videoId: string; title: string; artist: string; count: number }[];
  // Stats
  totalPlays: number;
  totalListeningTime: number;
  hourlyActivity: number[];
}

const StoreContext = createContext<StoreCtx | null>(null);

// ── Constants ──────────────────────────────────

const MAX_HISTORY = 5000;
const HISTORY_STORE = "history";
const FAVORITES_STORE = "favorites";
const PLAYLISTS_STORE = "playlists";

// ── Provider ───────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
  // Favorites
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const favoritesRef = useRef<Map<string, Favorite>>(new Map());

  // Playlists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const recordedSessionRef = useRef<Set<string>>(new Set());

  // Stats
  const [totalPlays, setTotalPlays] = useState(0);
  const [totalListeningTime, setTotalListeningTime] = useState(0);
  const [hourlyActivity, setHourlyActivity] = useState<number[]>(new Array(24).fill(0));

  // ── Load on mount ──────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const [favs, pls, hist] = await Promise.all([
          db.getAll<Favorite>(FAVORITES_STORE),
          db.getAll<Playlist>(PLAYLISTS_STORE),
          db.getAll<HistoryEntry>(HISTORY_STORE),
        ]);

        favoritesRef.current = new Map(favs.map((f) => [f.videoId, f]));
        setFavorites(favs);
        setFavoritesLoaded(true);

        setPlaylists(pls.sort((a, b) => b.updatedAt - a.updatedAt));
        setPlaylistsLoaded(true);

        setHistory(hist.sort((a, b) => b.playedAt - a.playedAt));
        setHistoryLoaded(true);

        computeStats(hist);
      } catch (e) {
        console.error("[store] load error:", e);
        setFavoritesLoaded(true);
        setPlaylistsLoaded(true);
        setHistoryLoaded(true);
      }
    })();
  }, []);

  // ── Stats computation ──────────────────────────

  function computeStats(hist: HistoryEntry[]) {
    setTotalPlays(hist.length);
    setTotalListeningTime(hist.reduce((sum, h) => sum + (h.playDuration || 0), 0));
    const hours = new Array(24).fill(0);
    hist.forEach((h) => {
      const d = new Date(h.playedAt);
      hours[d.getHours()]++;
    });
    setHourlyActivity(hours);
  }

  // ── Favorites ──────────────────────────────────

  const isFavorited = useCallback(
    (videoId: string) => favoritesRef.current.has(videoId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favoritesLoaded]
  );

  const toggleFavorite = useCallback(
    async (track: Omit<Favorite, "addedAt">) => {
      const existing = favoritesRef.current.get(track.videoId);
      if (existing) {
        favoritesRef.current.delete(track.videoId);
        setFavorites(Array.from(favoritesRef.current.values()));
        await db.remove(FAVORITES_STORE, track.videoId);
      } else {
        const fav: Favorite = { ...track, addedAt: Date.now() };
        favoritesRef.current.set(track.videoId, fav);
        setFavorites(Array.from(favoritesRef.current.values()));
        await db.put(FAVORITES_STORE, fav);
      }
    },
    []
  );

  // ── Playlists ──────────────────────────────────

  const createPlaylist = useCallback(
    async (name: string, description?: string) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const pl: Playlist = {
        id,
        name,
        description,
        tracks: [],
        createdAt: now,
        updatedAt: now,
      };
      await db.put(PLAYLISTS_STORE, pl);
      setPlaylists((prev) => [pl, ...prev]);
      return id;
    },
    []
  );

  const deletePlaylist = useCallback(async (id: string) => {
    await db.remove(PLAYLISTS_STORE, id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const renamePlaylist = useCallback(async (id: string, name: string) => {
    const pl = await db.get<Playlist>(PLAYLISTS_STORE, id);
    if (!pl) return;
    pl.name = name;
    pl.updatedAt = Date.now();
    await db.put(PLAYLISTS_STORE, pl);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, updatedAt: pl.updatedAt } : p))
    );
  }, []);

  const updatePlaylistDescription = useCallback(async (id: string, description: string) => {
    const pl = await db.get<Playlist>(PLAYLISTS_STORE, id);
    if (!pl) return;
    pl.description = description;
    pl.updatedAt = Date.now();
    await db.put(PLAYLISTS_STORE, pl);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, description, updatedAt: pl.updatedAt } : p))
    );
  }, []);

  const addToPlaylist = useCallback(
    async (playlistId: string, track: Omit<PlaylistTrack, "addedAt">) => {
      const pl = await db.get<Playlist>(PLAYLISTS_STORE, playlistId);
      if (!pl) return;
      if (pl.tracks.some((t) => t.videoId === track.videoId)) return; // dedup
      const newTrack: PlaylistTrack = { ...track, addedAt: Date.now() };
      pl.tracks.push(newTrack);
      pl.updatedAt = Date.now();
      if (!pl.coverUrl && track.thumbnail) pl.coverUrl = track.thumbnail;
      await db.put(PLAYLISTS_STORE, pl);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...pl } : p))
      );
    },
    []
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: string, videoId: string) => {
      const pl = await db.get<Playlist>(PLAYLISTS_STORE, playlistId);
      if (!pl) return;
      pl.tracks = pl.tracks.filter((t) => t.videoId !== videoId);
      pl.updatedAt = Date.now();
      await db.put(PLAYLISTS_STORE, pl);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...pl } : p))
      );
    },
    []
  );

  const reorderPlaylist = useCallback(
    async (playlistId: string, fromIdx: number, toIdx: number) => {
      const pl = await db.get<Playlist>(PLAYLISTS_STORE, playlistId);
      if (!pl) return;
      const [moved] = pl.tracks.splice(fromIdx, 1);
      pl.tracks.splice(toIdx, 0, moved);
      pl.updatedAt = Date.now();
      await db.put(PLAYLISTS_STORE, pl);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...pl } : p))
      );
    },
    []
  );

  // ── History ────────────────────────────────────

  const recordPlay = useCallback(
    async (entry: Omit<HistoryEntry, "id" | "playedAt">) => {
      // Only record once per session per videoId (dedup during single listening session)
      if (recordedSessionRef.current.has(entry.videoId)) return;
      recordedSessionRef.current.add(entry.videoId);

      const full: HistoryEntry = {
        ...entry,
        playedAt: Date.now(),
      };

      await db.put(HISTORY_STORE, full);

      setHistory((prev) => {
        const next = [full, ...prev].slice(0, MAX_HISTORY);
        computeStats(next);
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(async () => {
    await db.clear(HISTORY_STORE);
    recordedSessionRef.current.clear();
    setHistory([]);
    computeStats([]);
  }, []);

  const getTopArtists = useCallback(
    (days = 30) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const counts = new Map<string, number>();
      history.forEach((h) => {
        if (h.playedAt >= cutoff) {
          counts.set(h.artist, (counts.get(h.artist) || 0) + 1);
        }
      });
      return Array.from(counts.entries())
        .map(([artist, count]) => ({ artist, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    [history]
  );

  const getTopTracks = useCallback(
    (days = 30) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const counts = new Map<string, { title: string; artist: string; count: number }>();
      history.forEach((h) => {
        if (h.playedAt >= cutoff) {
          const existing = counts.get(h.videoId);
          if (existing) {
            existing.count++;
          } else {
            counts.set(h.videoId, {
              title: h.title,
              artist: h.artist,
              count: 1,
            });
          }
        }
      });
      return Array.from(counts.entries())
        .map(([videoId, data]) => ({ videoId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    },
    [history]
  );

  // ── Context value ──────────────────────────────

  const value: StoreCtx = {
    favorites,
    favoritesLoaded,
    isFavorited,
    toggleFavorite,
    playlists,
    playlistsLoaded,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    updatePlaylistDescription,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    history,
    historyLoaded,
    recordPlay,
    clearHistory,
    getTopArtists,
    getTopTracks,
    totalPlays,
    totalListeningTime,
    hourlyActivity,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

// ── Hooks ───────────────────────────────────────

export function useStore(): StoreCtx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useFavorites() {
  const { favorites, favoritesLoaded, isFavorited, toggleFavorite } = useStore();
  return { favorites, favoritesLoaded, isFavorited, toggleFavorite };
}

export function usePlaylists() {
  const {
    playlists,
    playlistsLoaded,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    updatePlaylistDescription,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
  } = useStore();
  return {
    playlists,
    playlistsLoaded,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    updatePlaylistDescription,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
  };
}

export function useHistory() {
  const {
    history,
    historyLoaded,
    recordPlay,
    clearHistory,
    getTopArtists,
    getTopTracks,
  } = useStore();
  return { history, historyLoaded, recordPlay, clearHistory, getTopArtists, getTopTracks };
}

export function useStats() {
  const { totalPlays, totalListeningTime, hourlyActivity, getTopArtists, getTopTracks } =
    useStore();
  return { totalPlays, totalListeningTime, hourlyActivity, getTopArtists, getTopTracks };
}
