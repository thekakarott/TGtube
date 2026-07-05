interface Props {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ["Space"], desc: "Play / Pause" },
  { keys: ["N"], desc: "Next track" },
  { keys: ["P"], desc: "Previous track" },
  { keys: ["F"], desc: "Toggle full player" },
  { keys: ["Esc"], desc: "Close full player" },
  { keys: ["←"], desc: "Seek backward 5s" },
  { keys: ["→"], desc: "Seek forward 5s" },
  { keys: ["↑"], desc: "Volume up" },
  { keys: ["↓"], desc: "Volume down" },
  { keys: ["?"], desc: "Show shortcuts" },
];

export default function ShortcutOverlay({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 150ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-8)",
          maxWidth: 480,
          width: "90%",
          boxShadow: "var(--shadow-lg)",
          animation: "slideUp 200ms ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-sub)",
              cursor: "pointer",
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {shortcuts.map((s) => (
            <div key={s.desc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-base)", color: "var(--text-sub)" }}>{s.desc}</span>
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                {s.keys.map((k) => (
                  <kbd key={k} style={{
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-highlight)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--text)",
                    fontFamily: "var(--font-sans)",
                    minWidth: 28,
                    textAlign: "center",
                  }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-dim)", marginTop: "var(--space-6)", textAlign: "center" }}>
          Press <kbd style={{ padding: "0 4px", borderRadius: 4, border: "1px solid var(--border-subtle)", background: "var(--bg-highlight)", fontSize: 10 }}>?</kbd> anywhere to toggle
        </p>
      </div>
    </div>
  );
}