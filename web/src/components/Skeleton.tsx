interface SkeletonProps {
  count?: number;
  type?: "card" | "row" | "text";
}

function SkeletonCard() {
  return (
    <div style={{ width: "100%" }}>
      <div style={{
        width: "100%",
        aspectRatio: "1",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-highlight)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="skeleton-shimmer" />
      </div>
      <div style={{ marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
        <div style={{
          height: 14,
          width: "70%",
          borderRadius: 4,
          background: "var(--bg-highlight)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div className="skeleton-shimmer" />
        </div>
        <div style={{
          height: 12,
          width: "50%",
          borderRadius: 4,
          background: "var(--bg-highlight)",
          position: "relative",
          overflow: "hidden",
        }}>
          <div className="skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "32px 1fr auto",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "var(--space-2) var(--space-3)",
    }}>
      <div style={{
        width: 20,
        height: 14,
        borderRadius: 4,
        background: "var(--bg-highlight)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="skeleton-shimmer" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-highlight)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          <div className="skeleton-shimmer" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <div style={{
            height: 14,
            width: 140,
            borderRadius: 4,
            background: "var(--bg-highlight)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div className="skeleton-shimmer" />
          </div>
          <div style={{
            height: 12,
            width: 100,
            borderRadius: 4,
            background: "var(--bg-highlight)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div className="skeleton-shimmer" />
          </div>
        </div>
      </div>
      <div style={{
        height: 12,
        width: 36,
        borderRadius: 4,
        background: "var(--bg-highlight)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function Skeleton({ count = 8, type = "card" }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Loading"
      style={type === "card" ? {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "var(--space-4)",
      } : {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        type === "card" ? <SkeletonCard key={i} /> : <SkeletonRow key={i} />
      ))}
    </div>
  );
}