import { useState } from "react";
import { usePlaylists } from "../lib/store";
import CreatePlaylistDialog from "./CreatePlaylistDialog";

export default function PlaylistListPage({ onNavigate }: { onNavigate: (p: any) => void }) {
  const { playlists, playlistsLoaded, createPlaylist, deletePlaylist } = usePlaylists();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>Your Playlists</h1>
      </div>

      {!playlistsLoaded ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sub)" }}>Loading...</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "var(--space-4)",
        }}>
          {/* Create new playlist card */}
          <div
            onClick={() => setShowCreate(true)}
            style={{
              borderRadius: "var(--radius-md)", cursor: "pointer",
              background: "var(--bg-card)", padding: "var(--space-3)",
              transition: "background var(--transition-base)",
              display: "flex", flexDirection: "column",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
          >
            <div style={{
              width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-sm)",
              border: "2px dashed var(--border)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "var(--text-dim)", fontSize: 48,
            }}>
              +
            </div>
            <div style={{
              fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)",
              marginTop: "var(--space-3)",
            }}>New Playlist</div>
          </div>

          {/* Existing playlists */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              style={{
                borderRadius: "var(--radius-md)", cursor: "pointer",
                background: "var(--bg-card)", padding: "var(--space-3)",
                transition: "background var(--transition-base)",
              }}
              onClick={() => onNavigate({ name: "playlist-detail", playlistId: pl.id })}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
            >
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "100%", aspectRatio: "1/1", borderRadius: "var(--radius-sm)",
                  overflow: "hidden", background: "var(--bg-highlight)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-dim)", fontSize: 28,
                }}>
                  {pl.coverUrl ? (
                    <img src={pl.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    "♫"
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete playlist "${pl.name}"?`)) deletePlaylist(pl.id);
                  }}
                  style={{
                    position: "absolute", top: 8, right: 8,
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)", border: "none",
                    color: "var(--text)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                >
                  ×
                </button>
              </div>
              <div style={{
                fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text)",
                marginTop: "var(--space-3)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{pl.name}</div>
              <div style={{
                fontSize: "var(--text-sm)", color: "var(--text-sub)",
                marginTop: "var(--space-1)",
              }}>
                {pl.tracks.length} {pl.tracks.length === 1 ? "track" : "tracks"}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePlaylistDialog
        open={showCreate}
        onCreate={(name, desc) => {
          createPlaylist(name, desc).then((id) => {
            setShowCreate(false);
            onNavigate({ name: "playlist-detail", playlistId: id });
          });
        }}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
