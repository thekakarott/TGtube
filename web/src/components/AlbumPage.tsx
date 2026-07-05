import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import TrackRow from "./TrackRow";
import Spinner from "./Spinner";

interface Props {
  browseId: string;
  onPlay: (track: any, queue: any[]) => void;
  onContextMenu?: (track: any, e: React.MouseEvent) => void;
  onBack: () => void;
}

function getThumb(item: any): string {
  const thumbs = item.thumbnails || [];
  return thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
}

export default function AlbumPage({ browseId, onPlay, onContextMenu, onBack }: Props) {
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError("");
    setAlbum(null);
    api.getAlbum(browseId)
      .then((d) => { if (!ac.signal.aborted) setAlbum(d); })
      .catch(() => { if (!ac.signal.aborted) setError("Failed to load album"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [browseId]);

  if (loading) return <Spinner text="Loading album..." />;
  if (error) return <div style={{ padding: "var(--space-10)", color: "var(--text-dim)", textAlign: "center" }}>{error}</div>;
  if (!album) return <div style={{ padding: "var(--space-8)", color: "var(--text-dim)" }}>Album not found</div>;

  const img = getThumb(album);
  const tracks: any[] = album.tracks || [];

  return (
    <div style={{ animation: "fadeIn var(--transition-base)" }}>
      {/* Header with gradient */}
      <div style={{
        background: img
          ? `linear-gradient(180deg, rgba(50,50,50,0.8) 0%, var(--bg-elevated) 100%)`
          : "var(--bg-elevated)",
        padding: "var(--space-8) var(--space-8) var(--space-10)",
      }}>
        <button onClick={onBack} style={backBtn}>Back</button>

        <div style={{ display: "flex", gap: "var(--space-8)", marginTop: "var(--space-5)", alignItems: "flex-end" }}>
          <div style={{
            width: 232, height: 232,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-highlight)",
            boxShadow: "var(--shadow-lg)",
          }}>
            {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
                <svg width="56" height="56" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-sub)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-2)" }}>Album</div>
            <h1 style={{ fontSize: "var(--text-4xl)", fontWeight: 800, lineHeight: 1.1, marginBottom: "var(--space-2)" }}>{album.title || "Unknown Album"}</h1>
            <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", display: "flex", alignItems: "center", gap: "var(--space-1)", flexWrap: "wrap" }}>
              {album.artist?.name && <span style={{ fontWeight: 600, color: "var(--text)" }}>{album.artist.name}</span>}
              {album.artist?.name && album.year && <span>&middot;</span>}
              {album.year && <span>{album.year}</span>}
              {tracks.length > 0 && <span>&middot; {tracks.length} songs</span>}
            </div>
          </div>
        </div>

        <button onClick={() => tracks.length > 0 && onPlay(tracks[0], tracks)} style={{
          marginTop: "var(--space-6)",
          background: "var(--accent)",
          color: "#000",
          border: "none",
          borderRadius: "var(--radius-full)",
          padding: "var(--space-3) var(--space-8)",
          fontSize: "var(--text-base)",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          transition: "transform var(--transition-fast), background var(--transition-base)",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.background = "var(--accent-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "var(--accent)"; }}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          Play
        </button>
      </div>

      {/* Track list */}
      <div style={{ padding: "var(--space-4) var(--space-8) var(--space-8)" }}>
        {tracks.map((track: any, i: number) => (
          <TrackRow
            key={track.videoId || i}
            index={i}
            img={getThumb(track)}
            title={track.title || "Unknown"}
            artist={track.artists?.[0]?.name || track.artist?.name || album.artist?.name || ""}
            duration={track.duration || track.length}
            onClick={() => track.videoId && onPlay(track, tracks)}
            onContextMenu={onContextMenu ? (e) => onContextMenu(track, e) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: "rgba(0,0,0,0.5)",
  border: "none",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-full)",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
};
