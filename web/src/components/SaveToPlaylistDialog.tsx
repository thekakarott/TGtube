import { useState } from "react";
import { usePlaylists } from "../lib/store";

interface Props {
  open: boolean;
  track: any;
  onClose: () => void;
}

export default function SaveToPlaylistDialog({ open, track, onClose }: Props) {
  const { playlists, addToPlaylist, createPlaylist } = usePlaylists();
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  if (!open || !track) return null;

  const vid = track.videoId || track.id;
  const title = track.title || track.name || "";
  const artist = track.artists?.[0]?.name || "";
  const album = typeof track.album === "object" ? track.album?.name : track.album;
  const thumbnail = track.thumbnails?.[0]?.url || "";
  const duration = track.duration || 0;

  const handleAdd = (playlistId: string) => {
    addToPlaylist(playlistId, { videoId: vid, title, artist, album, thumbnail, duration });
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    const id = await createPlaylist(newName.trim());
    addToPlaylist(id, { videoId: vid, title, artist, album, thumbnail, duration });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(0,0,0,0.6)", display: "flex",
        alignItems: "center", justifyContent: "center",
        animation: "fadeIn 150ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-highlight)", borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)", width: 400, maxWidth: "90vw",
          maxHeight: "70vh", display: "flex", flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
          Save to Playlist
        </h2>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "var(--space-3)" }}>
          {playlists.map((pl) => {
            const alreadyIn = pl.tracks.some((t) => t.videoId === vid);
            return (
              <button
                key={pl.id}
                onClick={() => !alreadyIn && handleAdd(pl.id)}
                disabled={alreadyIn}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "var(--space-3)",
                  padding: "var(--space-3)", border: "none", borderRadius: "var(--radius-sm)",
                  background: alreadyIn ? "transparent" : "transparent",
                  color: alreadyIn ? "var(--text-dim)" : "var(--text)",
                  cursor: alreadyIn ? "default" : "pointer", textAlign: "left",
                  transition: "background var(--transition-fast)",
                }}
                onMouseEnter={(e) => { if (!alreadyIn) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-sm)", flexShrink: 0,
                  background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "var(--text-dim)", overflow: "hidden",
                }}>
                  {pl.coverUrl ? (
                    <img src={pl.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "♫"
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: "var(--text-base)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{pl.name}</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-dim)" }}>
                    {pl.tracks.length} {pl.tracks.length === 1 ? "track" : "tracks"}
                    {alreadyIn && " · Added"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {showNew ? (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(); }}
              style={{
                flex: 1, padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)", background: "var(--bg-card)",
                color: "var(--text)", fontSize: "var(--text-base)",
              }}
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newName.trim()}
              style={{
                padding: "var(--space-2) var(--space-3)", border: "none",
                borderRadius: "var(--radius-sm)", background: "var(--accent)",
                color: "#000", fontWeight: 700, cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            style={{
              width: "100%", padding: "var(--space-3)", border: "1px dashed var(--border)",
              borderRadius: "var(--radius-sm)", background: "transparent",
              color: "var(--text-sub)", cursor: "pointer", fontSize: "var(--text-base)",
            }}
          >
            + New Playlist
          </button>
        )}
      </div>
    </div>
  );
}
