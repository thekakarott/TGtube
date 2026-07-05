import { useState, useEffect, useRef, useMemo } from "react";
import { api, Track, getHighResThumb } from "../api";

function fmt(s: number) {
  if (!s || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function parseSyncedLyrics(text: string): { time: number; line: string }[] {
  if (!text) return [];
  const lines = text.split("\n");
  const parsed: { time: number; line: string }[] = [];
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const min = parseInt(lastMatch[1], 10);
      const sec = parseInt(lastMatch[2], 10);
      const ms = lastMatch[3] ? parseInt(lastMatch[3].padEnd(3, "0"), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      const lyricsText = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
      if (lyricsText) {
        parsed.push({ time, line: lyricsText });
      }
    }
  }
  return parsed.sort((a, b) => a.time - b.time);
}

interface Props {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  queue: any[];
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  playbackSpeed: number;
  onClose: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pos: number) => void;
  onVolumeChange: (vol: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onPlaybackSpeedChange: (speed: number) => void;
  onClearQueue: () => void;
  onPlayTrack: (track: any, queue?: any[]) => void;
  onMoveInQueue: (fromIdx: number, toIdx: number) => void;
}

export default function FullPlayer({
  track, isPlaying, position, duration, volume,
  queue, shuffle, repeat, playbackSpeed, onClose, onPlayPause, onNext, onPrev, onSeek,
  onVolumeChange, onShuffle, onRepeat, onPlaybackSpeedChange, onClearQueue, onPlayTrack, onMoveInQueue,
}: Props) {
  const [tab, setTab] = useState<"queue" | "lyrics">("queue");
  const [lyrics, setLyrics] = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState(false);
  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const syncedLyrics = useMemo(() => parseSyncedLyrics(lyrics), [lyrics]);
  const hasSyncedLyrics = syncedLyrics.length > 0;
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const [activeLyricIdx, setActiveLyricIdx] = useState(-1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [seekDragging, setSeekDragging] = useState(false);
  const [seekPct, setSeekPct] = useState(0);
  const seekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setLyrics("");
    setLyricsError(false);
    if (!track.id) return;
    setLyricsLoading(true);
    api.getLyrics(track.id).then((l) => {
      setLyrics(l);
      setLyricsLoading(false);
      if (!l) setLyricsError(true);
    }).catch(() => { setLyricsLoading(false); setLyricsError(true); });
  }, [track.id]);

  useEffect(() => {
    if (!hasSyncedLyrics || syncedLyrics.length === 0) {
      setActiveLyricIdx(-1);
      return;
    }
    let idx = -1;
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (position >= syncedLyrics[i].time) {
        idx = i;
        break;
      }
    }
    setActiveLyricIdx(idx);
  }, [position, syncedLyrics, hasSyncedLyrics]);

  useEffect(() => {
    if (activeLyricIdx >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(`[data-lyric-idx="${activeLyricIdx}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLyricIdx]);

  const nowIdx = queue.findIndex((t) => (t.videoId || t.id) === track.id);
  const queueUpcoming = nowIdx >= 0 ? queue.slice(nowIdx + 1) : [];

  const artUrl = getHighResThumb(track.id);
  const fallbackArt = track.album_art;

  const displayPct = seekDragging ? seekPct : pct;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: "var(--z-modal)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Blurred backdrop */}
      <div style={{
        position: "absolute", inset: "-20%",
        backgroundImage: artUrl ? `url(${artUrl})` : (fallbackArt ? `url(${fallbackArt})` : "none"),
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(80px) saturate(1.5) brightness(0.3)",
        transform: "scale(1.2)",
        transition: "background-image 0.8s ease",
      }} />
      {/* Dark overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.45)",
      }} />
      {/* Content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        height: "100%",
        animation: "fullPlayerIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: isMobile ? "var(--space-3) var(--space-4)" : "var(--space-4) var(--space-8)",
          flexShrink: 0,
        }}>
          <button onClick={onClose} style={s.iconBtn} title="Minimize">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          </button>
          <div style={{
            flex: 1, textAlign: "center",
            fontSize: "var(--text-xs)", fontWeight: 700,
            color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>Now Playing</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Main content */}
        <div style={{
          flex: 1, display: "flex", minHeight: 0,
          padding: isMobile ? "0 var(--space-5)" : "0 var(--space-12)",
          gap: isMobile ? "var(--space-4)" : "var(--space-12)",
          flexDirection: isMobile ? "column" : "row",
          overflow: isMobile ? "auto" : "hidden",
        }}>
          {/* Left: Album art + controls */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "center",
            gap: isMobile ? "var(--space-4)" : "var(--space-6)",
            minWidth: 0,
          }}>
            {/* Album art */}
            <div style={{
              width: isMobile ? "min(280px, 70vw)" : "min(340px, 36vw)",
              height: isMobile ? "min(280px, 70vw)" : "min(340px, 36vw)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
              boxShadow: "0 16px 64px rgba(0,0,0,0.6)",
              background: "rgba(255,255,255,0.05)",
              flexShrink: 0,
              position: "relative",
            }}>
              {artUrl || fallbackArt ? (
                <img
                  src={artUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    if (fallbackArt && (e.target as HTMLImageElement).src !== fallbackArt) {
                      (e.target as HTMLImageElement).src = fallbackArt;
                    }
                  }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>
                  <svg width="72" height="72" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
              )}
            </div>

            {/* Track info */}
            <div style={{ textAlign: "center", maxWidth: 420, width: "100%", padding: "0 var(--space-2)" }}>
              <div style={{
                fontSize: isMobile ? "var(--text-lg)" : "var(--text-2xl)",
                fontWeight: 700, color: "#fff",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}>{track.title}</div>
              <div style={{
                fontSize: isMobile ? "var(--text-sm)" : "var(--text-base)",
                color: "rgba(255,255,255,0.6)", marginTop: "var(--space-1)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{track.artist}</div>
              {track.album && <div style={{
                fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", marginTop: "var(--space-1)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{track.album}</div>}
            </div>

            {/* Seek bar */}
            <div style={{ width: "100%", maxWidth: 500 }}>
              <div
                ref={seekRef}
                style={{
                  width: "100%", height: 4, borderRadius: 2,
                  background: "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative",
                }}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration); }}
                onMouseDown={(e) => {
                  setSeekDragging(true);
                  const r = e.currentTarget.getBoundingClientRect();
                  const update = (ev: MouseEvent) => {
                    const pct = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
                    setSeekPct(pct);
                  };
                  update(e as any);
                  const onMove = (ev: MouseEvent) => update(ev);
                  const onUp = (ev: MouseEvent) => {
                    setSeekDragging(false);
                    const pct = Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100));
                    onSeek((pct / 100) * duration);
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
              >
                <div style={{
                  width: `${displayPct}%`, height: "100%", borderRadius: 2,
                  background: "#fff",
                  transition: seekDragging ? "none" : "width 0.1s linear",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)",
                    width: 12, height: 12, borderRadius: "50%", background: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    opacity: seekDragging ? 1 : 0,
                    transition: "opacity 0.15s",
                  }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--space-1)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{fmt(seekDragging ? (seekPct / 100) * duration : position)}</span>
                <span style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "var(--space-4)" : "var(--space-6)" }}>
              <button onClick={onShuffle} style={{ ...s.ctrlBtn, color: shuffle ? "var(--accent)" : "rgba(255,255,255,0.6)" }} title="Shuffle">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
              </button>
              <button onClick={onPrev} style={{ ...s.ctrlBtn, color: "#fff" }}>
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button onClick={onPlayPause} style={{
                ...s.ctrlBtn, width: 60, height: 60, borderRadius: "50%",
                background: "#fff", color: "#000",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                <svg width="26" height="26" fill="currentColor" viewBox="0 0 24 24">
                  {isPlaying ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/> : <path d="M8 5v14l11-7z"/>}
                </svg>
              </button>
              <button onClick={onNext} style={{ ...s.ctrlBtn, color: "#fff" }}>
                <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
              </button>
              <button onClick={onRepeat} style={{ ...s.ctrlBtn, color: repeat !== "off" ? "var(--accent)" : "rgba(255,255,255,0.6)", position: "relative" }} title={`Repeat: ${repeat}`}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                {repeat === "one" && <span style={{ position: "absolute", fontSize: 9, fontWeight: 800, bottom: 2, right: 2 }}>1</span>}
              </button>
            </div>

            {/* Bottom row: speed + volume */}
            <div style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              width: "100%", maxWidth: 500,
            }}>
              <button
                onClick={() => {
                  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                  const idx = speeds.indexOf(playbackSpeed);
                  onPlaybackSpeedChange(speeds[(idx + 1) % speeds.length]);
                }}
                style={{
                  background: playbackSpeed !== 1 ? "rgba(255,255,255,0.15)" : "transparent",
                  border: "none", color: playbackSpeed !== 1 ? "var(--accent)" : "rgba(255,255,255,0.4)",
                  cursor: "pointer", fontSize: "var(--text-xs)", fontWeight: 600,
                  padding: "4px 8px", borderRadius: "var(--radius-full)",
                  transition: "all var(--transition-base)", flexShrink: 0,
                }}
                title={`Playback speed: ${playbackSpeed}x`}
              >
                {playbackSpeed}x
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1 }}>
                <button onClick={() => onVolumeChange(volume > 0 ? 0 : 50)} style={{
                  background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer",
                  display: "flex", alignItems: "center", padding: 0, flexShrink: 0,
                }}>
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    {volume === 0 ? (
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    ) : volume < 50 ? (
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                    ) : (
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    )}
                  </svg>
                </button>
                <div
                  style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", cursor: "pointer" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onVolumeChange(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                  }}
                >
                  <div style={{ width: `${volume}%`, height: "100%", borderRadius: 2, background: "rgba(255,255,255,0.6)", transition: "width var(--transition-fast)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{
            width: isMobile ? "100%" : 400,
            flexShrink: 0, overflowY: "auto", padding: isMobile ? "0" : "var(--space-5) 0",
            maxHeight: isMobile ? "40vh" : "none",
          }}>
            {/* Tab buttons */}
            <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-4)" }}>
              <button
                onClick={() => setTab("lyrics")}
                style={{
                  ...s.tabBtn,
                  background: tab === "lyrics" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: tab === "lyrics" ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14.5 2.629c0-.753-.836-1.215-1.462-.882L5.636 7.2H3.5A1.5 1.5 0 0 0 2 8.7v4.8a1.5 1.5 0 0 0 1.5 1.5h2.136l7.402 5.453c.626.333 1.462-.129 1.462-.882V2.63zM16.5 7.2a1 1 0 0 0-.707 1.707L18.086 11.2l-2.293 2.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414l-3-3A1 1 0 0 0 16.5 7.2z"/></svg>
                Lyrics
              </button>
              <button
                onClick={() => setTab("queue")}
                style={{
                  ...s.tabBtn,
                  background: tab === "queue" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: tab === "queue" ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>
                Queue
                {queueUpcoming.length > 0 && <span style={{
                  marginLeft: "var(--space-1)",
                  fontSize: 10, background: "rgba(255,255,255,0.2)", color: "#fff",
                  borderRadius: "50%", width: 18, height: 18,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700,
                }}>{queueUpcoming.length}</span>}
              </button>
            </div>

            {tab === "queue" ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <h3 style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Up Next</h3>
                  {queue.length > 1 && (
                    <button onClick={onClearQueue} style={{
                      background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
                      fontSize: "var(--text-xs)", fontWeight: 500, padding: "2px 8px", borderRadius: "var(--radius-full)",
                      transition: "color var(--transition-base)",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
                    >Clear</button>
                  )}
                </div>
                {queue.length === 0 ? (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "var(--text-sm)" }}>Queue is empty</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {queue.map((item: any, i: number) => {
                      const id = item.videoId || item.id;
                      const active = id === track.id;
                      const thumbs = item.thumbnails || [];
                      const img = thumbs[0]?.url || "";
                      const title = item.title || item.name || "Unknown";
                      const artist = item.artists?.[0]?.name || item.artist?.name || "";
                      return (
                        <div
                          key={i}
                          onClick={() => onPlayTrack(item, queue)}
                          onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            const btns = e.currentTarget.querySelector('[data-move-btns]');
                            if (btns) (btns as HTMLElement).style.opacity = "1";
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = "transparent";
                            const btns = e.currentTarget.querySelector('[data-move-btns]');
                            if (btns) (btns as HTMLElement).style.opacity = "0";
                          }}
                          style={{
                            display: "flex", alignItems: "center", gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-3)",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            background: active ? "rgba(255,255,255,0.08)" : "transparent",
                            transition: "background var(--transition-fast)",
                          }}
                        >
                          <span style={{ fontSize: "var(--text-sm)", color: "rgba(255,255,255,0.3)", minWidth: 20, textAlign: "right" }}>{i + 1}</span>
                          {img && <img src={img} alt="" style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", objectFit: "cover", background: "rgba(255,255,255,0.05)" }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                            {artist && <div style={{ fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist}</div>}
                          </div>
                          {!active && (
                            <div data-move-btns style={{ display: "flex", gap: "var(--space-1)", opacity: 0, transition: "opacity var(--transition-fast)" }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveInQueue(i, i - 1); }}
                                disabled={i === 0}
                                style={{
                                  background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
                                  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                                  opacity: i === 0 ? 0.3 : 1,
                                }}
                                title="Move up"
                              >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onMoveInQueue(i, i + 1); }}
                                disabled={i === queue.length - 1}
                                style={{
                                  background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer",
                                  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                                  opacity: i === queue.length - 1 ? 0.3 : 1,
                                }}
                                title="Move down"
                              >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {lyricsLoading ? (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "var(--text-sm)", padding: "var(--space-4) 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <div style={{
                        width: 16, height: 16, border: "2px solid rgba(255,255,255,0.1)",
                        borderTopColor: "var(--accent)", borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }} />
                      Loading lyrics...
                    </div>
                  </div>
                ) : lyricsError || !lyrics ? (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "var(--text-sm)", padding: "var(--space-4) 0" }}>
                    <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.3, marginBottom: "var(--space-2)" }}><path d="M14.5 2.629c0-.753-.836-1.215-1.462-.882L5.636 7.2H3.5A1.5 1.5 0 0 0 2 8.7v4.8a1.5 1.5 0 0 0 1.5 1.5h2.136l7.402 5.453c.626.333 1.462-.129 1.462-.882V2.63z"/></svg>
                    <p>No lyrics available</p>
                  </div>
                ) : hasSyncedLyrics ? (
                  <div ref={lyricsContainerRef} style={{
                    fontSize: isMobile ? "var(--text-base)" : "var(--text-lg)", lineHeight: 2.2,
                    color: "rgba(255,255,255,0.4)", fontFamily: "inherit",
                    maxHeight: isMobile ? "35vh" : "65vh", overflowY: "auto",
                    scrollBehavior: "smooth",
                    maskImage: "linear-gradient(transparent, black 8%, black 85%, transparent)",
                    WebkitMaskImage: "linear-gradient(transparent, black 8%, black 85%, transparent)",
                    padding: "var(--space-4) 0",
                  }}>
                    {syncedLyrics.map((l, i) => (
                      <div
                        key={i}
                        data-lyric-idx={i}
                        style={{
                          transition: "all 350ms cubic-bezier(0.4, 0, 0.2, 1)",
                          color: i === activeLyricIdx ? "#fff" : "rgba(255,255,255,0.3)",
                          fontWeight: i === activeLyricIdx ? 700 : 400,
                          transform: i === activeLyricIdx ? "scale(1.05)" : "scale(1)",
                          opacity: i === activeLyricIdx ? 1 : 0.4,
                          padding: "0 var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {l.line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre style={{
                    fontSize: isMobile ? "var(--text-sm)" : "var(--text-base)",
                    color: "rgba(255,255,255,0.5)", lineHeight: 2,
                    whiteSpace: "pre-wrap", fontFamily: "inherit",
                    maxHeight: isMobile ? "35vh" : "65vh", overflowY: "auto",
                    padding: "var(--space-4) 0",
                  }}>{lyrics}</pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Share button at bottom */}
        <div style={{
          display: "flex", justifyContent: "center",
          padding: isMobile ? "var(--space-2)" : "var(--space-3) 0 var(--space-4)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://music.youtube.com/watch?v=${track.id}`).catch(() => {});
            }}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)", cursor: "pointer",
              fontSize: "var(--text-xs)", fontWeight: 500,
              padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-full)",
              display: "flex", alignItems: "center", gap: "var(--space-2)",
              transition: "all var(--transition-base)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  iconBtn: {
    background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer",
    width: 36, height: 36, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "color var(--transition-base), background var(--transition-base)",
  } as React.CSSProperties,
  ctrlBtn: {
    background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer",
    width: 44, height: 44, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all var(--transition-base)",
  } as React.CSSProperties,
  tabBtn: {
    border: "none", cursor: "pointer",
    fontSize: "var(--text-xs)", fontWeight: 600,
    padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-full)",
    display: "flex", alignItems: "center", gap: "var(--space-1)",
    transition: "all var(--transition-base)",
    flex: 1, justifyContent: "center",
  } as React.CSSProperties,
};
