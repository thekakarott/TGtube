import { useState } from "react";

interface Props {
  open: boolean;
  onCreate: (name: string, description?: string) => void;
  onClose: () => void;
}

export default function CreatePlaylistDialog({ open, onCreate, onClose }: Props) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (!open) return null;

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
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
          New Playlist
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onCreate(name.trim(), desc.trim() || undefined); onClose(); } }}
          style={{
            width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)", background: "var(--bg-card)",
            color: "var(--text)", fontSize: "var(--text-base)", boxSizing: "border-box",
          }}
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          style={{
            width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)", background: "var(--bg-card)",
            color: "var(--text)", fontSize: "var(--text-base)", marginTop: "var(--space-3)",
            boxSizing: "border-box", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
          <button
            onClick={onClose}
            style={{
              padding: "var(--space-2) var(--space-4)", border: "1px solid var(--border)",
              borderRadius: 999, background: "transparent", color: "var(--text-sub)",
              cursor: "pointer", fontSize: "var(--text-base)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim()) { onCreate(name.trim(), desc.trim() || undefined); onClose(); } }}
            disabled={!name.trim()}
            style={{
              padding: "var(--space-2) var(--space-4)", border: "none",
              borderRadius: 999, background: name.trim() ? "var(--accent)" : "var(--bg-card)",
              color: name.trim() ? "#000" : "var(--text-dim)",
              fontWeight: 700, cursor: name.trim() ? "pointer" : "default",
              fontSize: "var(--text-base)",
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
