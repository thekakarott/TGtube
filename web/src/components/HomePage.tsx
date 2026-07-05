import { useState, useEffect } from "react";
import { api } from "../api";
import { useHistory } from "../lib/store";
import Card from "./Card";
import Skeleton from "./Skeleton";

const chips = ["lofi hip hop", "synthwave", "indie rock", "chill beats", "jazz", "classical", "study music", "workout"];

const moods = [
  { label: "Chill", query: "chill relaxation music", color: "#0d9488" },
  { label: "Focus", query: "focus concentration music", color: "#2563eb" },
  { label: "Workout", query: "workout energy music", color: "#e11d48" },
  { label: "Party", query: "party dance hits", color: "#ea580c" },
  { label: "Romance", query: "romantic love songs", color: "#be185d" },
  { label: "Sad", query: "sad emotional music", color: "#6b21a8" },
  { label: "Happy", query: "happy upbeat music", color: "#ca8a04" },
  { label: "Sleep", query: "sleep ambient music", color: "#1e3a5f" },
];

const browseCards = [
  { title: "Discover", desc: "New music", query: "new releases this week", gradient: "linear-gradient(135deg, #059669, #065f46)" },
  { title: "Focus", desc: "Deep concentration", query: "focus music", gradient: "linear-gradient(135deg, #2563eb, #1e40af)" },
  { title: "Mood", desc: "Upbeat energy", query: "upbeat energy music", gradient: "linear-gradient(135deg, #7c3aed, #5b21b6)" },
  { title: "Decades", desc: "Throwback hits", query: "throwback hits 80s 90s", gradient: "linear-gradient(135deg, #e11d48, #be123c)" },
  { title: "Chill", desc: "Relax and unwind", query: "chill relaxation music", gradient: "linear-gradient(135deg, #0d9488, #0f766e)" },
  { title: "Party", desc: "Get hyped", query: "party dance music", gradient: "linear-gradient(135deg, #ea580c, #c2410c)" },
];

interface Props {
  data: any[];
  loading: boolean;
  error?: string;
  onPlay: (track: any, queue?: any[]) => void;
  onSearch: (q: string) => void;
  onNavigate: (page: any) => void;
  recentlyPlayed?: any[];
}

function getThumb(item: any): string {
  const thumbs = item.thumbnails || [];
  return thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
}

function handleItemClick(item: any, items: any[], onPlay: (t: any, q: any[]) => void, onNavigate: (p: any) => void) {
  if (item.videoId) {
    onPlay(item, items.filter((c: any) => c.videoId));
  } else if (item.playlistId) {
    onNavigate({ name: "playlist", listId: item.playlistId });
  } else if (item.browseId?.startsWith("MPRE")) {
    onNavigate({ name: "album", browseId: item.browseId });
  } else if (item.browseId?.startsWith("UC") || item.channelId) {
    onNavigate({ name: "artist", channelId: item.channelId || item.browseId });
  } else if (item.browseId) {
    onNavigate({ name: "playlist", listId: item.browseId });
  }
}

export default function HomePage({ data, loading, error, onPlay, onSearch, onNavigate, recentlyPlayed = [] }: Props) {
  const [charts, setCharts] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [topArtistsLoading, setTopArtistsLoading] = useState(false);
  const { getTopArtists, historyLoaded } = useHistory();

  useEffect(() => {
    api.getCharts().then((d) => {
      if (Array.isArray(d)) setCharts(d);
      else if (d?.content) setCharts(d.content);
    }).catch(() => {}).finally(() => setChartsLoading(false));
  }, []);

  // Fetch top artist data from history
  useEffect(() => {
    if (!historyLoaded) return;
    const top = getTopArtists(30).slice(0, 5);
    if (top.length === 0) return;

    setTopArtistsLoading(true);
    // Fetch artist details for each top artist
    Promise.all(
      top.map(async (a) => {
        try {
          const data = await api.getArtist(a.artist);
          // Try to find channelId from the artist data
          const channelId = (data as any)?.channelId || "";
          const thumb = (data as any)?.thumbnails?.[0]?.url || "";
          const monthly = (data as any)?.monthlyListeners || "";
          return {
            name: a.artist,
            channelId,
            thumbnail: thumb,
            monthlyListeners: monthly,
            playCount: a.count,
          };
        } catch {
          return { name: a.artist, channelId: "", thumbnail: "", monthlyListeners: "", playCount: a.count };
        }
      })
    ).then((artists) => {
      setTopArtists(artists.filter((a) => a.channelId));
      setTopArtistsLoading(false);
    }).catch(() => setTopArtistsLoading(false));
  }, [historyLoaded, getTopArtists]);

  return (
    <div style={{ padding: "var(--space-8) var(--space-8) var(--space-8)" }}>
      {/* Search chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
        {chips.map((s) => (
          <button
            key={s}
            onClick={() => onSearch(s)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-full)",
              border: "none",
              background: "rgba(255,255,255,0.07)",
              color: "var(--text)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background var(--transition-base)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Mood/Activity chips */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Browse by mood</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {moods.map((m) => (
            <button
              key={m.label}
              onClick={() => onSearch(m.query)}
              style={{
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-full)",
                border: "none",
                background: m.color,
                color: "#fff",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "transform var(--transition-base), opacity var(--transition-base)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Your Top Artists - personalized section */}
      {topArtists.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Your Top Artists</h3>
          <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: "var(--space-2)" }}>
            {topArtists.map((artist, i) => (
              <div
                key={i}
                onClick={() => artist.channelId && onNavigate({ name: "artist", channelId: artist.channelId })}
                style={{
                  flexShrink: 0, width: 140, cursor: artist.channelId ? "pointer" : "default",
                  textAlign: "center",
                }}
              >
                <div style={{
                  width: 120, height: 120, borderRadius: "50%", margin: "0 auto",
                  background: "var(--bg-highlight)", overflow: "hidden",
                  border: "3px solid transparent",
                  transition: "border-color var(--transition-base)",
                }}
                  onMouseEnter={(e) => { if (artist.channelId) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; }}
                >
                  {artist.thumbnail && (
                    <img src={artist.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{
                  fontSize: "var(--text-sm)", fontWeight: 600, marginTop: "var(--space-2)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{artist.name}</div>
                {artist.monthlyListeners && (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)" }}>
                    {artist.monthlyListeners}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts/Trending */}
      {chartsLoading ? (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Trending now</h3>
          <Skeleton count={6} type="card" />
        </div>
      ) : charts.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Trending now</h3>
          <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: "var(--space-2)" }}>
            {charts.slice(0, 10).map((item: any, i: number) => {
              const thumbs = item.thumbnails || [];
              const img = thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
              return (
                <div
                  key={i}
                  onClick={() => handleItemClick(item, charts, onPlay, onNavigate)}
                  style={{
                    flexShrink: 0, width: 140, cursor: "pointer",
                    borderRadius: "var(--radius-md)", overflow: "hidden",
                    background: "var(--bg-card)", transition: "background var(--transition-base)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
                >
                  <div style={{ width: 140, height: 140, background: "var(--bg-highlight)", position: "relative" }}>
                    {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{
                      position: "absolute", top: 4, left: 4,
                      width: 24, height: 24, borderRadius: "50%",
                      background: "var(--accent)", color: "#000",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs)", fontWeight: 800,
                    }}>{i + 1}</div>
                  </div>
                  <div style={{ padding: "var(--space-2)" }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || item.name || "Unknown"}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.artists?.[0]?.name || ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently played */}
      {recentlyPlayed.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Recently played</h3>
          <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: "var(--space-2)" }}>
            {recentlyPlayed.slice(0, 10).map((item: any, i: number) => {
              const thumbs = item.thumbnails || [];
              const img = thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url || thumbs[0]?.url : "";
              return (
                <div
                  key={i}
                  onClick={() => onPlay(item, recentlyPlayed)}
                  style={{
                    flexShrink: 0, width: 140, cursor: "pointer",
                    borderRadius: "var(--radius-md)", overflow: "hidden",
                    background: "var(--bg-card)", transition: "background var(--transition-base)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-card)"; }}
                >
                  <div style={{ width: 140, height: 140, background: "var(--bg-highlight)" }}>
                    {img && <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "var(--space-2)" }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || item.name || "Unknown"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Browse cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-10)" }}>
        {browseCards.map((card) => (
          <div
            key={card.title}
            onClick={() => onSearch(card.query)}
            style={{
              height: 160,
              borderRadius: "var(--radius-md)",
              padding: "var(--space-5)",
              background: card.gradient,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              transition: "transform var(--transition-base), box-shadow var(--transition-base)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <h4 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{card.title}</h4>
            <p style={{ fontSize: "var(--text-sm)", color: "rgba(255,255,255,0.7)", marginTop: "var(--space-1)" }}>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Feed sections */}
      {loading ? (
        <Skeleton count={8} type="card" />
      ) : error ? (
        <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--text-dim)" }}>
          <p style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-base)" }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{
            padding: "var(--space-2) var(--space-6)",
            borderRadius: "var(--radius-full)",
            border: "none",
            background: "var(--accent)",
            color: "#000",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: "pointer",
          }}>Retry</button>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-12)", color: "var(--text-dim)" }}>
          <svg width="56" height="56" fill="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.2, marginBottom: "var(--space-4)" }}><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <p style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-1)" }}>No feed data</p>
          <p style={{ fontSize: "var(--text-sm)" }}>Start searching to discover music</p>
        </div>
      ) : (
        data.map((section: any, i: number) => {
          const items = section.contents || [];
          if (items.length === 0) return null;
          return (
            <div key={i} style={{ marginBottom: "var(--space-8)" }}>
              <h3 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>{section.title}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
                {items.slice(0, 14).map((item: any, j: number) => (
                  <Card
                    key={j}
                    img={getThumb(item)}
                    title={item.title || item.name || "Unknown"}
                    sub={item.artists?.[0]?.name || item.subtitle || ""}
                    showPlay={!!item.videoId}
                    onClick={() => handleItemClick(item, items, onPlay, onNavigate)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
