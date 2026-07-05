import { useState, useEffect, useRef } from "react";

interface Props {
  onExpire: () => void;
}

const presets = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hr", minutes: 120 },
];

export default function SleepTimer({ onExpire }: Props) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining === null) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null || r <= 1) {
          clearInterval(intervalRef.current!);
          onExpire();
          return null;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [remaining, onExpire]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: remaining !== null ? "var(--accent-muted)" : "transparent",
          border: "none",
          color: remaining !== null ? "var(--accent)" : "var(--text-sub)",
          cursor: "pointer",
          width: 32, height: 32, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "var(--text-xs)", fontWeight: 700,
          transition: "all var(--transition-base)",
        }}
        title={remaining !== null ? `Sleep timer: ${fmt(remaining)}` : "Sleep timer"}
      >
        {remaining !== null ? fmt(remaining) : (
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          right: 0,
          marginBottom: "var(--space-2)",
          background: "#282828",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-3)",
          minWidth: 150,
          boxShadow: "var(--shadow-lg)",
          animation: "fadeIn 100ms ease-out",
        }}>
          <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-sub)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sleep Timer</div>
          {remaining !== null ? (
            <button
              onClick={() => { setRemaining(null); setOpen(false); }}
              style={{
                width: "100%", padding: "var(--space-2)", border: "none", borderRadius: "var(--radius-sm)",
                background: "rgba(231,76,60,0.2)", color: "#e74c3c", cursor: "pointer",
                fontSize: "var(--text-sm)", fontWeight: 600,
              }}
            >Cancel timer</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              {presets.map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => { setRemaining(p.minutes * 60); setOpen(false); }}
                  style={{
                    padding: "var(--space-1) var(--space-2)", border: "none", borderRadius: "var(--radius-sm)",
                    background: "transparent", color: "var(--text)", cursor: "pointer",
                    fontSize: "var(--text-sm)", textAlign: "left",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >{p.label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}