import { useState } from "react";

interface Props {
  img: string;
  title: string;
  sub?: string;
  variant?: "square" | "round" | "wide";
  showPlay?: boolean;
  onClick?: () => void;
}

export default function Card({ img, title, sub, variant = "square", showPlay = false, onClick }: Props) {
  const [hover, setHover] = useState(false);
  const isRound = variant === "round";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
        background: hover ? "var(--bg-card-hover)" : "var(--bg-card)",
        padding: "var(--space-3)",
        transition: "background var(--transition-base)",
      }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            borderRadius: isRound ? "50%" : "var(--radius-sm)",
            overflow: "hidden",
            background: "var(--bg-highlight)",
          }}
        >
          {img ? (
            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          )}
        </div>

        {showPlay && (
          <div style={{
            position: "absolute", bottom: 8, right: 8,
            width: 48, height: 48, borderRadius: "50%",
            background: "var(--accent)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-md)",
            opacity: hover ? 1 : 0,
            transform: hover ? "translateY(0)" : "translateY(8px)",
            transition: "all var(--transition-base)",
            pointerEvents: hover ? "auto" : "none",
          }}>
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        )}
      </div>

      <div style={{
        fontSize: "var(--text-base)",
        fontWeight: 600,
        color: "var(--text)",
        marginTop: "var(--space-3)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{title}</div>

      {sub && (
        <div style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-sub)",
          marginTop: "var(--space-1)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{sub}</div>
      )}
    </div>
  );
}
