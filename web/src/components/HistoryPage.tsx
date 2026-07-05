import { useState, useMemo } from "react";
import { useHistory } from "../lib/store";
import TrackRow from "./TrackRow";

function fmtTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return "Today";
  if (diff < 172800000) return "Yesterday";
  if (diff < 604800000) return "This Week";
  return d.toLocaleDateString();
}

export default function HistoryPage({ onPlay }: { onPlay: (tracks: any[], idx: number) => void }) {
  const { history, historyLoaded, clearHistory } = useHistory();
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.artist.toLowerCase().includes(q)
    );
  }, [history, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof history>();
    filtered.forEach((h) => {
      const key = fmtTime(h.playedAt);
      const arr = groups.get(key) || [];
      arr.push(h);
      groups.set(key, arr);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const toTracks = (list: typeof history) =>
    list.map((h) => ({
      videoId: h.videoId,
      title: h.title,
      artists: [{ name: h.artist }],
      thumbnails: [{ url: h.thumbnail || "" }],
      duration: h.duration || 0,
      album: { name: h.album || "" },
    }));

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: 0 }}>Listening History</h1>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--bg-highlight)",
              color: "var(--text)",
              fontSize: "var(--text-base)",
              width: 200,
              maxWidth: "100%",
            }}
          />
          {history.length > 0 && (
            confirmClear ? (
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={() => { clearHistory(); setConfirmClear(false); }}
                  style={{
                    padding: "var(--space-2) var(--space-3)", border: "none", borderRadius: 999,
                    background: "#e74c3c", color: "#fff", fontWeight: 600, fontSize: "var(--text-sm)", cursor: "pointer",
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  style={{
                    padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border)", borderRadius: 999,
                    background: "transparent", color: "var(--text-sub)", fontSize: "var(--text-sm)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                style={{
                  padding: "var(--space-2) var(--space-4)", border: "1px solid var(--border)", borderRadius: 999,
                  background: "transparent", color: "var(--text-sub)", fontSize: "var(--text-sm)", cursor: "pointer",
                }}
              >
                Clear all
              </button>
            )
          )}
        </div>
      </div>

      {!historyLoaded ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-sub)" }}>Loading...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 48, marginBottom: "var(--space-4)" }}>🕐</div>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-sub)", marginBottom: "var(--space-2)" }}>
            No listening history yet
          </div>
          <div style={{ fontSize: "var(--text-base)" }}>
            Songs you play will appear here
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-dim)" }}>
          No results for "{search}"
        </div>
      ) : (
        grouped.map(([label, entries]) => (
          <div key={label} style={{ marginBottom: "var(--space-6)" }}>
            <div style={{
              fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-sub)",
              textTransform: "uppercase", letterSpacing: 1, marginBottom: "var(--space-3)",
              padding: "0 var(--space-3)",
            }}>
              {label}
            </div>
            {entries.map((entry, i) => (
              <TrackRow
                key={entry.id}
                index={i}
                img={entry.thumbnail}
                title={entry.title}
                artist={entry.artist}
                duration={entry.duration}
                onClick={() => {
                  const flat = toTracks(entries);
                  onPlay(flat, i);
                }}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
