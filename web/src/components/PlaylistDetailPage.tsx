import { useState } from "react";
import { usePlaylists } from "../lib/store";
import TrackRow from "./TrackRow";

function fmtDuration(totalSec: number) {
  if (!totalSec || totalSec <= 0) return "";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export default function PlaylistDetailPage({
  playlistId,
  onPlay,
  onBack,
}: {
  playlistId: string;
  onPlay: (tracks: any[], idx: number) => void;
  onBack: () => void;
}) {
  const { playlists, removeFromPlaylist, renamePlaylist } = usePlaylists();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const playlist = playlists.find((p) => p.id === playlistId);

  if (!playlist) {
    return (
      <div style={{ padding: "var(--space-6)", color: "var(--text-sub)" }}>
        Playlist not found.
        <button onClick={onBack} style={{ marginLeft: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
          Go back
        </button>
      </div>
    );
  }

  const totalDuration = playlist.tracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  const toTracks = () =>
    playlist.tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artists: [{ name: t.artist }],
      thumbnails: [{ url: t.thumbnail || "" }],
      duration: t.duration || 0,
      album: { name: t.album || "" },
    }));

  return (
    <div style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div className="responsive-header-row" style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-6)", marginBottom: "var(--space-8)", flexWrap: "wrap" }}>
        <div className="responsive-header-img" style={{
          width: 200, height: 200, borderRadius: "var(--radius-md)", flexShrink: 0,
          background: "var(--bg-highlight)", display: "flex", alignItems: "center",
          justifyContent: "center", overflow: "hidden",
        }}>
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 64, color: "var(--text-dim)" }}>♫</div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-sub)", marginBottom: "var(--space-2)" }}>
            Playlist
          </div>
          {editing ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                if (editName.trim() && editName.trim() !== playlist.name) {
                  renamePlaylist(playlist.id, editName.trim());
                }
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditing(false);
              }}
              style={{
                fontSize: "var(--text-4xl)", fontWeight: 900, color: "var(--text)",
                background: "transparent", border: "1px solid var(--accent)",
                borderRadius: "var(--radius-sm)", padding: "2px 6px", width: "100%",
                margin: 0, lineHeight: 1.1,
              }}
            />
          ) : (
            <h1
              onDoubleClick={() => { setEditName(playlist.name); setEditing(true); }}
              style={{
                fontSize: "var(--text-4xl)", fontWeight: 900, color: "var(--text)",
                margin: 0, lineHeight: 1.1, cursor: "pointer",
              }}
              title="Double-click to rename"
            >
              {playlist.name}
            </h1>
          )}
          {playlist.description && (
            <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginTop: "var(--space-2)" }}>
              {playlist.description}
            </div>
          )}
          <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginTop: "var(--space-2)" }}>
            {playlist.tracks.length} {playlist.tracks.length === 1 ? "track" : "tracks"}
            {totalDuration > 0 && ` · ${fmtDuration(totalDuration)}`}
          </div>
        </div>
      </div>

      {/* Actions */}
      {playlist.tracks.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <button
            onClick={() => onPlay(toTracks(), 0)}
            style={{
              padding: "var(--space-3) var(--space-6)", border: "none", borderRadius: 999,
              background: "var(--accent)", color: "#000", fontWeight: 700,
              fontSize: "var(--text-base)", cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
          >
            ▶ Play
          </button>
          <button
            onClick={() => {
              const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
              onPlay(shuffled.map((t) => ({
                videoId: t.videoId, title: t.title, artists: [{ name: t.artist }],
                thumbnails: [{ url: t.thumbnail || "" }], duration: t.duration || 0,
                album: { name: t.album || "" },
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

      {/* Tracks */}
      {playlist.tracks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 48, marginBottom: "var(--space-4)" }}>♫</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-sub)", marginBottom: "var(--space-2)" }}>
            This playlist is empty
          </div>
          <div style={{ fontSize: "var(--text-base)" }}>
            Add songs from search or any track's context menu
          </div>
        </div>
      ) : (
        <div>
          {playlist.tracks.map((track, i) => (
            <TrackRow
              key={track.videoId + i}
              index={i}
              img={track.thumbnail}
              title={track.title}
              artist={track.artist}
              duration={track.duration}
              onClick={() => onPlay(toTracks(), i)}
              onContextMenu={(e) => {
                e.preventDefault();
                // Simple inline context: just remove
                removeFromPlaylist(playlist.id, track.videoId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
