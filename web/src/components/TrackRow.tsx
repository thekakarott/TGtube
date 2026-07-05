interface Props {
  index: number;
  img?: string;
  title: string;
  artist?: string;
  duration?: number;
  isActive?: boolean;
  isPlaying?: boolean;
  isFavorited?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onToggleFavorite?: () => void;
}

function fmt(s: number) {
  if (!s || s <= 0) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function TrackRow({ index, img, title, artist, duration, isActive, isPlaying, isFavorited, onClick, onContextMenu, onToggleFavorite }: Props) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-sm)",
        cursor: onClick ? "pointer" : "default",
        transition: "background var(--transition-fast)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-highlight)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
      }}>
        {isActive && isPlaying ? (
          <div className="eq-bars">
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </div>
        ) : (
          <span style={{
            fontSize: "var(--text-base)",
            color: isActive ? "var(--accent)" : "var(--text-dim)",
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}>{index + 1}</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", minWidth: 0 }}>
        {img && (
          <img
            src={img}
            alt=""
            style={{
              width: 40, height: 40,
              borderRadius: "var(--radius-sm)",
              objectFit: "cover",
              background: "var(--bg-highlight)",
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: "var(--text-base)",
            fontWeight: isActive ? 700 : 500,
            color: isActive ? "var(--accent)" : "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>{title}</div>
          {artist && (
            <div style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-sub)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>{artist}</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 4, opacity: isFavorited ? 1 : 0.4,
              transition: "opacity var(--transition-fast), transform var(--transition-fast)",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = isFavorited ? "1" : "0.4"; e.currentTarget.style.transform = "scale(1)"; }}
          >
            <svg width="16" height="16" fill={isFavorited ? "#1DB954" : "currentColor"} viewBox="0 0 24 24"
              style={{ color: isFavorited ? "#1DB954" : "var(--text-sub)" }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        )}
        {duration !== undefined && duration > 0 && (
          <span style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-dim)",
            fontVariantNumeric: "tabular-nums",
            minWidth: 40,
            textAlign: "right",
          }}>{fmt(duration)}</span>
        )}
      </div>
    </div>
  );
}
