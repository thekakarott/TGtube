import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import Card from "./Card";
import TrackRow from "./TrackRow";
import SectionHeader from "./SectionHeader";
import Spinner from "./Spinner";

interface Props {
  channelId: string;
  onPlay: (track: any, queue: any[]) => void;
  onPlayAlbum: (browseId: string) => void;
  onBack: () => void;
}

function getThumb(item: any): string {
  const thumbs = item.thumbnails || [];
  return thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
}

export default function ArtistPage({ channelId, onPlay, onPlayAlbum, onBack }: Props) {
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [relatedArtists, setRelatedArtists] = useState<any[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError("");
    setArtist(null);
    api.getArtist(channelId)
      .then((d) => {
        if (!ac.signal.aborted) {
          setArtist(d);
          if (d?.related?.results) {
            setRelatedArtists(d.related.results);
          }
        }
      })
      .catch(() => { if (!ac.signal.aborted) setError("Failed to load artist"); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [channelId]);

  if (loading) return <Spinner text="Loading artist..." />;
  if (error) return <div style={{ padding: "var(--space-10)", color: "var(--text-dim)", textAlign: "center" }}>{error}</div>;
  if (!artist) return <div style={{ padding: "var(--space-8)", color: "var(--text-dim)" }}>Artist not found</div>;

  const img = getThumb(artist);
  const topTracks: any[] = artist.songs?.results || [];
  const albums: any[] = artist.albums?.results || [];
  const singles: any[] = artist.singles?.results || [];

  return (
    <div style={{ animation: "fadeIn var(--transition-base)" }}>
      {/* Header */}
      <div style={{
        background: img
          ? `linear-gradient(180deg, rgba(50,50,50,0.8) 0%, var(--bg-elevated) 100%)`
          : "var(--bg-elevated)",
        padding: "var(--space-8) var(--space-8) var(--space-10)",
      }}>
        <button onClick={onBack} style={backBtn}>Back</button>

        <div className="responsive-header-row" style={{ marginTop: "var(--space-5)", display: "flex", gap: "var(--space-8)", alignItems: "flex-end" }}>
          <div className="responsive-header-img" style={{
            width: 208, height: 208,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            background: "var(--bg-highlight)",
            boxShadow: "var(--shadow-lg)",
          }}>
            {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
                <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "var(--text-4xl)", fontWeight: 800, lineHeight: 1.1 }}>{artist.name || "Unknown Artist"}</h1>
            {(artist.subscribers || artist.subscriptionCount) && (
              <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginTop: "var(--space-2)" }}>
                {artist.subscribers || artist.subscriptionCount} subscribers
              </div>
            )}
          </div>
        </div>

        {topTracks.length > 0 && (
          <button onClick={() => onPlay(topTracks[0], topTracks)} style={{
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
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "var(--space-4) var(--space-8) var(--space-8)" }}>
        {topTracks.length > 0 && (
          <div style={{ marginBottom: "var(--space-8)" }}>
            <SectionHeader title="Popular" />
            {topTracks.map((track: any, i: number) => (
              <TrackRow
                key={track.videoId || i}
                index={i}
                img={getThumb(track)}
                title={track.title || "Unknown"}
                duration={track.duration}
                onClick={() => track.videoId && onPlay(track, topTracks)}
              />
            ))}
          </div>
        )}

        {albums.length > 0 && (
          <div style={{ marginBottom: "var(--space-8)" }}>
            <SectionHeader title="Albums" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
              {albums.map((alb: any, i: number) => (
                <Card
                  key={alb.browseId || i}
                  img={getThumb(alb)}
                  title={alb.title}
                  sub={alb.year || ""}
                  onClick={() => alb.browseId && onPlayAlbum(alb.browseId)}
                />
              ))}
            </div>
          </div>
        )}

        {singles.length > 0 && (
          <div style={{ marginBottom: "var(--space-8)" }}>
            <SectionHeader title="Singles" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
              {singles.map((alb: any, i: number) => (
                <Card
                  key={alb.browseId || i}
                  img={getThumb(alb)}
                  title={alb.title}
                  onClick={() => alb.browseId && onPlayAlbum(alb.browseId)}
                />
              ))}
            </div>
          </div>
        )}

        {relatedArtists.length > 0 && (
          <div>
            <SectionHeader title="Related artists" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
              {relatedArtists.map((ra: any, i: number) => (
                <Card
                  key={ra.channelId || i}
                  img={getThumb(ra)}
                  title={ra.name || "Unknown"}
                  variant="round"
                  onClick={() => ra.channelId && window.dispatchEvent(new CustomEvent("navigate", { detail: { name: "artist", channelId: ra.channelId } }))}
                />
              ))}
            </div>
          </div>
        )}
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
