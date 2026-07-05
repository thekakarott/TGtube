import { useState, useEffect, useRef, useCallback } from "react";
import { Track } from "../api";
import SleepTimer from "./SleepTimer";

function fmt(s: number) {
  if (!s || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

interface Props {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  playbackSpeed: number;
  volumeNormalization: boolean;
  radioMode: boolean;
  crossfade: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pos: number) => void;
  onVolumeChange: (vol: number) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onPlaybackSpeedChange: (speed: number) => void;
  onNormalizationToggle: () => void;
  onRadioModeToggle: () => void;
  onCrossfadeToggle: () => void;
  onExpand: () => void;
  onSleepExpire: () => void;
}

export default function NowPlayingBar({
  track, isPlaying, position, duration, volume, shuffle, repeat, playbackSpeed, volumeNormalization, radioMode, crossfade,
  onPlayPause, onNext, onPrev, onSeek, onVolumeChange, onShuffle, onRepeat, onPlaybackSpeedChange, onNormalizationToggle, onRadioModeToggle, onCrossfadeToggle, onExpand, onSleepExpire,
}: Props) {
  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const seekRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleTouchSeek = useCallback((e: React.TouchEvent) => {
    const rect = seekRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touch = e.touches[0];
    onSeek(((touch.clientX - rect.left) / rect.width) * duration);
  }, [onSeek, duration]);

  if (isMobile) {
    return (
      <div style={{
        height: "var(--playerbar-height)",
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        flexShrink: 0,
        zIndex: "var(--z-fixed)",
      }}>
        {/* Seek bar on top */}
        <div
          ref={seekRef}
          style={{ width: "100%", height: 3, background: "var(--border-subtle)", cursor: "pointer", flexShrink: 0 }}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration); }}
          onTouchMove={handleTouchSeek}
        >
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 1 }} />
        </div>
        {/* Track info + controls */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 var(--space-3)", gap: "var(--space-3)" }}>
          <div onClick={onExpand} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0, cursor: "pointer" }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              flexShrink: 0,
              background: "var(--bg-highlight)",
            }}>
              {track.album_art ? (
                <img src={track.album_art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <button onClick={onPrev} style={{ ...s.btn, width: 32, height: 32 }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button onClick={onPlayPause} style={{
              ...s.btn,
              width: 40, height: 40, borderRadius: "50%",
              background: "#fff", color: "#000",
            }}>
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                {isPlaying
                  ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  : <path d="M8 5v14l11-7z"/>
                }
              </svg>
            </button>
            <button onClick={onNext} style={{ ...s.btn, width: 32, height: 32 }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: "var(--playerbar-height)",
      background: "var(--bg-card)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 var(--space-4)",
      gap: "var(--space-3)",
      flexShrink: 0,
      zIndex: "var(--z-fixed)",
    }}>
      {/* Track info */}
      <div onClick={onExpand} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", width: 300, flexShrink: 0, cursor: "pointer" }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          flexShrink: 0,
          background: "var(--bg-highlight)",
          boxShadow: "var(--shadow-sm)",
          animation: isPlaying ? "pulse 2s ease-in-out infinite" : "none",
        }}>
          {track.album_art ? (
            <img src={track.album_art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-sub)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.artist}</div>
        </div>
      </div>

      {/* Controls + seek */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-1)", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button onClick={onShuffle} style={{ ...s.btn, color: shuffle ? "var(--accent)" : "var(--text-sub)" }} title="Shuffle">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>
          </button>
          <button onClick={onPrev} style={s.btn}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button onClick={onPlayPause} style={{
            ...s.btn,
            width: 36, height: 36, borderRadius: "50%",
            background: "#fff", color: "#000",
          }}>
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              {isPlaying
                ? <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                : <path d="M8 5v14l11-7z"/>
              }
            </svg>
          </button>
          <button onClick={onNext} style={s.btn}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button onClick={onRepeat} style={{ ...s.btn, color: repeat !== "off" ? "var(--accent)" : "var(--text-sub)", position: "relative" }} title={`Repeat: ${repeat}`}>
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
            {repeat === "one" && <span style={{ position: "absolute", fontSize: 8, fontWeight: 800, bottom: 2, right: 2 }}>1</span>}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%" }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(position)}</span>
          <div
            style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--border-subtle)", cursor: "pointer", position: "relative", transition: "height var(--transition-fast)" }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(((e.clientX - rect.left) / rect.width) * duration);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.height = "6px"; }}
            onMouseLeave={(e) => { e.currentTarget.style.height = "4px"; }}
          >
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 2,
              background: "var(--text)",
              transition: "background var(--transition-base)",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--text)"; }}
            />
          </div>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", minWidth: 36, fontVariantNumeric: "tabular-nums" }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Volume + extras */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", width: 240, justifyContent: "flex-end", flexShrink: 0 }}>
        <SleepTimer onExpire={onSleepExpire} />
        <button
          onClick={() => {
            const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const idx = speeds.indexOf(playbackSpeed);
            const next = speeds[(idx + 1) % speeds.length];
            onPlaybackSpeedChange(next);
          }}
          style={{
            background: playbackSpeed !== 1 ? "rgba(255,255,255,0.1)" : "transparent",
            border: "none", color: playbackSpeed !== 1 ? "var(--accent)" : "var(--text-sub)",
            cursor: "pointer", borderRadius: "var(--radius-full)",
            padding: "2px 8px", fontSize: "var(--text-xs)", fontWeight: 600,
            transition: "all var(--transition-base)",
          }}
          title={`Playback speed: ${playbackSpeed}x`}
        >
          {playbackSpeed}x
        </button>
        <button
          onClick={onNormalizationToggle}
          style={{
            background: volumeNormalization ? "rgba(255,255,255,0.1)" : "transparent",
            border: "none", color: volumeNormalization ? "var(--accent)" : "var(--text-sub)",
            cursor: "pointer", borderRadius: "50%",
            width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition-base)",
          }}
          title={`Volume normalization: ${volumeNormalization ? "on" : "off"}`}
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <button
          onClick={onRadioModeToggle}
          style={{
            background: radioMode ? "rgba(255,255,255,0.1)" : "transparent",
            border: "none", color: radioMode ? "var(--accent)" : "var(--text-sub)",
            cursor: "pointer", borderRadius: "50%",
            width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition-base)",
          }}
          title={`Radio mode: ${radioMode ? "on" : "off"}`}
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34-.37-.91L3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h2v2z"/>
          </svg>
        </button>
        <button
          onClick={onCrossfadeToggle}
          style={{
            background: crossfade ? "rgba(255,255,255,0.1)" : "transparent",
            border: "none", color: crossfade ? "var(--accent)" : "var(--text-sub)",
            cursor: "pointer", borderRadius: "50%",
            width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all var(--transition-base)",
          }}
          title={`Crossfade: ${crossfade ? "on" : "off"}`}
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 6v2H5v2h5v2l4-4-4-4zm4 12v-2h5v-2h-5v-2l-4 4 4 4z"/>
          </svg>
        </button>
        <button onClick={() => onVolumeChange(volume > 0 ? 0 : 50)} style={{
          background: "transparent", border: "none", color: "var(--text-sub)",
          cursor: "pointer", display: "flex", alignItems: "center", padding: 0,
          transition: "color var(--transition-base)",
        }}>
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            {volume === 0 ? (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            ) : (
              <path d="M14.5 2.629c0-.753-.836-1.215-1.462-.882L5.636 7.2H3.5A1.5 1.5 0 0 0 2 8.7v4.8a1.5 1.5 0 0 0 1.5 1.5h2.136l7.402 5.453c.626.333 1.462-.129 1.462-.882V2.63zM18.5 7.2a1 1 0 1 1 1.414 1.414L18.328 10.2l1.586 1.586a1 1 0 1 1-1.414 1.414L16.914 11.614l-1.586 1.586a1 1 0 1 1-1.414-1.414L15.5 10.2l-1.586-1.586A1 1 0 0 1 15.328 7.2l1.586 1.586L18.5 7.2z"/>
            )}
          </svg>
        </button>
        <div
          style={{ width: 80, height: 4, borderRadius: 2, background: "var(--border-subtle)", cursor: "pointer" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onVolumeChange(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
          }}
        >
          <div style={{ width: `${volume}%`, height: "100%", borderRadius: 2, background: "var(--text-sub)" }} />
        </div>
      </div>
    </div>
  );
}

const s = {
  btn: {
    background: "transparent", border: "none", color: "var(--text-sub)",
    cursor: "pointer", borderRadius: "50%", width: 32, height: 32,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "color var(--transition-base), background var(--transition-base)",
  } as React.CSSProperties,
};
