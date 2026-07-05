import { useFavorites } from "../lib/store";
import TrackRow from "./TrackRow";

export default function FavoritesPage({ onPlay }: { onPlay: (tracks: any[], idx: number) => void }) {
  const { favorites, favoritesLoaded } = useFavorites();

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <div className="responsive-header-row" style={{
        display: "flex", alignItems: "flex-end", gap: "var(--space-6)",
        marginBottom: "var(--space-8)", flexWrap: "wrap",
      }}>
        <div className="responsive-header-img" style={{
          width: 200, height: 200, borderRadius: "var(--radius-md)",
          background: "linear-gradient(135deg, #450af5, #c4efd9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="80" height="80" fill="white" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-sub)", marginBottom: "var(--space-2)" }}>
            Playlist
          </div>
          <h1 style={{ fontSize: "var(--text-4xl)", fontWeight: 900, color: "var(--text)", margin: 0, lineHeight: 1.1 }}>
            Liked Songs
          </h1>
          <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginTop: "var(--space-2)" }}>
            {favorites.length} {favorites.length === 1 ? "song" : "songs"}
          </div>
        </div>
      </div>

      {favorites.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <button
            onClick={() => onPlay(favorites.map(f => ({
              videoId: f.videoId, title: f.title, artists: [{ name: f.artist }],
              thumbnails: [{ url: f.thumbnail || "" }], duration: f.duration || 0,
              album: { name: f.album || "" },
            })), 0)}
            style={{
              padding: "var(--space-3) var(--space-6)", border: "none", borderRadius: 999,
              background: "var(--accent)", color: "#000", fontWeight: 700, fontSize: "var(--text-base)",
              cursor: "pointer", transition: "transform var(--transition-fast), background var(--transition-fast)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
          >
            ▶ Play
          </button>
          <button
            onClick={() => {
              const shuffled = [...favorites].sort(() => Math.random() - 0.5);
              onPlay(shuffled.map(f => ({
                videoId: f.videoId, title: f.title, artists: [{ name: f.artist }],
                thumbnails: [{ url: f.thumbnail || "" }], duration: f.duration || 0,
                album: { name: f.album || "" },
              })), 0);
            }}
            style={{
              padding: "var(--space-3) var(--space-6)", border: "1px solid var(--border)",
              borderRadius: 999, background: "transparent", color: "var(--text)",
              fontWeight: 600, fontSize: "var(--text-base)", cursor: "pointer",
            }}
          >
            🔀 Shuffle
          </button>
        </div>
      )}

      {!favoritesLoaded ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sub)" }}>Loading...</div>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 48, marginBottom: "var(--space-4)" }}>♡</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-sub)", marginBottom: "var(--space-2)" }}>
            No liked songs yet
          </div>
          <div style={{ fontSize: "var(--text-base)" }}>
            Tap the heart on any track to save it here
          </div>
        </div>
      ) : (
        <div>
          {favorites.map((fav, i) => (
            <TrackRow
              key={fav.videoId}
              index={i}
              img={fav.thumbnail}
              title={fav.title}
              artist={fav.artist}
              duration={fav.duration}
              onClick={() => onPlay(favorites.map(f => ({
                videoId: f.videoId, title: f.title, artists: [{ name: f.artist }],
                thumbnails: [{ url: f.thumbnail || "" }], duration: f.duration || 0,
                album: { name: f.album || "" },
              })), i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
