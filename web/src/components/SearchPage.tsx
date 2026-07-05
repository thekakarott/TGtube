import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import Card from "./Card";
import TrackRow from "./TrackRow";
import SectionHeader from "./SectionHeader";
import Spinner from "./Spinner";

const filters = [
  { key: "", label: "All" },
  { key: "songs", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
  { key: "playlists", label: "Playlists" },
];

interface Props {
  query: string;
  onPlay: (track: any, queue?: any[]) => void;
  onNavigate: (page: any) => void;
  onContextMenu?: (track: any, e: React.MouseEvent) => void;
}

function getThumb(item: any): string {
  const thumbs = item.thumbnails || [];
  return thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
}

export default function SearchPage({ query, onPlay, onNavigate, onContextMenu }: Props) {
  const [results, setResults] = useState<any>({ songs: [], albums: [], artists: [], playlists: [] });
  const [activeFilter, setActiveFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [input, setInput] = useState(query || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(query || ""); }, [query]);

  const doSearch = useCallback(async (q: string, filter: string) => {
    if (!q || q.trim().length < 2) {
      setResults({ songs: [], albums: [], artists: [], playlists: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const data = await api.search(q, filter || undefined);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setResults(data);
      } else if (Array.isArray(data)) {
        const key = filter || "songs";
        setResults({ songs: [], albums: [], artists: [], playlists: [], [key]: data });
      } else {
        setResults({ songs: [], albums: [], artists: [], playlists: [] });
      }
    } catch {
      setResults({ songs: [], albums: [], artists: [], playlists: [] });
    }
    setSearching(false);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await api.getSearchSuggestions(q);
      setSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(input, activeFilter), 350);
    return () => clearTimeout(timer.current);
  }, [input, activeFilter, doSearch]);

  useEffect(() => {
    clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(() => fetchSuggestions(input), 200);
    return () => clearTimeout(suggestTimer.current);
  }, [input, fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setInputFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submitSearch = (q: string) => {
    setInput(q);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestion((p) => (p < suggestions.length - 1 ? p + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestion((p) => (p > 0 ? p - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
          submitSearch(suggestions[selectedSuggestion]);
        } else {
          submitSearch(input);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const showSongs = !activeFilter || activeFilter === "songs";
  const showAlbums = !activeFilter || activeFilter === "albums";
  const showArtists = !activeFilter || activeFilter === "artists";
  const showPlaylists = !activeFilter || activeFilter === "playlists";

  const songs = results.songs || [];
  const albums = results.albums || [];
  const artists = results.artists || [];
  const playlists = results.playlists || [];

  return (
    <div style={{ padding: "var(--space-8)", animation: "fadeIn var(--transition-base)" }}>
      {/* Search input with autocomplete */}
      <div style={{ position: "relative", maxWidth: 480, marginBottom: "var(--space-6)" }}>
        <svg style={{ position: "absolute", left: "var(--space-4)", top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "var(--text-dim)", pointerEvents: "none" }} fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z" />
        </svg>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setSelectedSuggestion(-1); setShowSuggestions(true); }}
          onFocus={() => {
            setInputFocused(true);
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => { setInputFocused(false); }}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to listen to?"
          autoFocus
          style={{
            width: "100%",
            background: "var(--bg-highlight)",
            color: "var(--text)",
            border: `2px solid ${inputFocused ? "var(--text)" : "transparent"}`,
            borderRadius: "var(--radius-full)",
            padding: "var(--space-3) var(--space-4) var(--space-3) 48px",
            fontSize: "var(--text-base)",
            outline: "none",
            transition: "border-color var(--transition-base)",
          }}
        />
        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
              zIndex: 100,
              border: "1px solid var(--border-subtle)",
            }}
          >
            {suggestions.map((s, i) => (
              <div
                key={i}
                onClick={() => submitSearch(s)}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  cursor: "pointer",
                  background: i === selectedSuggestion ? "var(--bg-highlight)" : "transparent",
                  color: "var(--text)",
                  fontSize: "var(--text-base)",
                  transition: "background var(--transition-fast)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-highlight)"; setSelectedSuggestion(i); }}
                onMouseLeave={(e) => { if (i !== selectedSuggestion) e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="16" height="16" fill="var(--text-dim)" viewBox="0 0 24 24">
                  <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z" />
                </svg>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: "var(--space-1) var(--space-4)",
              borderRadius: "var(--radius-full)",
              border: "none",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
              background: activeFilter === f.key ? "#fff" : "rgba(255,255,255,0.1)",
              color: activeFilter === f.key ? "#000" : "var(--text-sub)",
              transition: "all var(--transition-base)",
            }}
            onMouseEnter={(e) => { if (activeFilter !== f.key) e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { if (activeFilter !== f.key) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {searching && <Spinner text="Searching..." />}

      {!searching && input.trim().length < 2 && (
        <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--text-dim)" }}>
          <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: "var(--space-4)", opacity: 0.3 }}>
            <path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28z" />
          </svg>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-1)" }}>Search YouTube Music</p>
          <p style={{ fontSize: "var(--text-sm)" }}>Start typing to find songs, albums, artists, and playlists</p>
        </div>
      )}

      {/* Songs */}
      {!searching && showSongs && songs.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <SectionHeader title="Songs" />
          {songs.map((item: any, i: number) => (
            <TrackRow
              key={item.videoId || i}
              index={i}
              img={getThumb(item)}
              title={item.title || "Unknown"}
              artist={item.artists?.[0]?.name || item.artist?.name || ""}
              duration={item.duration}
              onClick={() => item.videoId && onPlay(item, songs)}
              onContextMenu={onContextMenu ? (e) => onContextMenu(item, e) : undefined}
            />
          ))}
        </div>
      )}

      {/* Albums */}
      {!searching && showAlbums && albums.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <SectionHeader title="Albums" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            {albums.map((item: any, i: number) => (
              <Card
                key={item.browseId || i}
                img={getThumb(item)}
                title={item.title || item.name || "Unknown"}
                sub={item.artist?.name || item.subtitle || ""}
                onClick={() => item.browseId && onNavigate({ name: "album", browseId: item.browseId })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Artists */}
      {!searching && showArtists && artists.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <SectionHeader title="Artists" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            {artists.map((item: any, i: number) => (
              <Card
                key={item.channelId || i}
                img={getThumb(item)}
                title={item.title || item.name || "Unknown"}
                sub={item.subtitle || ""}
                variant="round"
                onClick={() => item.channelId && onNavigate({ name: "artist", channelId: item.channelId })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Playlists */}
      {!searching && showPlaylists && playlists.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <SectionHeader title="Playlists" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
            {playlists.map((item: any, i: number) => (
              <Card
                key={item.browseId || i}
                img={getThumb(item)}
                title={item.title || item.name || "Unknown"}
                sub={item.subtitle || ""}
                onClick={() => item.browseId && onNavigate({ name: "playlist", listId: item.browseId })}
              />
            ))}
          </div>
        </div>
      )}

      {!searching && input.trim().length >= 2 && songs.length === 0 && albums.length === 0 && artists.length === 0 && playlists.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-10)", color: "var(--text-dim)" }}>
          No results found for "{input}"
        </div>
      )}
    </div>
  );
}
