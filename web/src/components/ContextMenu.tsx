import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface Props {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const adjusted = {
    x: Math.min(position.x, window.innerWidth - 220),
    y: Math.min(position.y, window.innerHeight - items.length * 40 - 16),
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: adjusted.x,
        top: adjusted.y,
        zIndex: "var(--z-toast)",
        background: "#282828",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-1) 0",
        minWidth: 200,
        boxShadow: "var(--shadow-lg)",
        animation: "fadeIn 100ms ease-out",
      }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "var(--space-1) 0" }} />;
        }
        return (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-2) var(--space-4)",
              border: "none",
              background: "transparent",
              color: item.danger ? "#e74c3c" : "var(--text)",
              fontSize: "var(--text-base)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}