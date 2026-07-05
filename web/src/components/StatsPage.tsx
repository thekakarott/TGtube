import { useState, useMemo } from "react";
import { useStats } from "../lib/store";

function fmtDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

type Tab = "7d" | "30d" | "all";

export default function StatsPage() {
  const { totalPlays, totalListeningTime, hourlyActivity, getTopArtists, getTopTracks } = useStats();
  const [tab, setTab] = useState<Tab>("30d");

  const days = tab === "7d" ? 7 : tab === "30d" ? 30 : 365 * 10;
  const topArtists = useMemo(() => getTopArtists(days), [getTopArtists, days]);
  const topTracks = useMemo(() => getTopTracks(days), [getTopTracks, days]);

  const maxHourly = Math.max(...hourlyActivity, 1);

  const tabs: { id: Tab; label: string }[] = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "all", label: "All time" },
  ];

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: "0 0 var(--space-8)" }}>Listening Stats</h1>

      {/* Total stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--space-4)", marginBottom: "var(--space-8)",
      }}>
        {[
          { label: "Total Plays", value: totalPlays.toLocaleString() },
          { label: "Listening Time", value: fmtDuration(totalListeningTime) },
          { label: "Top Artists", value: topArtists.length.toString() },
          { label: "Unique Tracks", value: topTracks.length.toString() },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "var(--bg-card)", borderRadius: "var(--radius-md)",
            padding: "var(--space-5)", textAlign: "center",
          }}>
            <div style={{ fontSize: "var(--text-3xl)", fontWeight: 900, color: "var(--accent)" }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-sub)", marginTop: "var(--space-1)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "var(--space-2) var(--space-4)", borderRadius: 999,
              border: "none", fontSize: "var(--text-sm)", fontWeight: 600,
              cursor: "pointer",
              background: tab === t.id ? "var(--text)" : "var(--bg-highlight)",
              color: tab === t.id ? "var(--bg-base)" : "var(--text-sub)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        {/* Top Artists */}
        <div>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Top Artists</h3>
          {topArtists.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: "var(--text-base)" }}>No data yet</div>
          ) : (
            topArtists.slice(0, 10).map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-2) 0",
              }}>
                <span style={{
                  width: 24, fontSize: "var(--text-sm)", color: "var(--text-dim)",
                  fontVariantNumeric: "tabular-nums", textAlign: "right",
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "var(--text-base)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{a.artist}</div>
                </div>
                <div style={{
                  fontSize: "var(--text-sm)", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums",
                }}>{a.count} plays</div>
              </div>
            ))
          )}
        </div>

        {/* Top Tracks */}
        <div>
          <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Top Tracks</h3>
          {topTracks.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: "var(--text-base)" }}>No data yet</div>
          ) : (
            topTracks.slice(0, 10).map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-2) 0",
              }}>
                <span style={{
                  width: 24, fontSize: "var(--text-sm)", color: "var(--text-dim)",
                  fontVariantNumeric: "tabular-nums", textAlign: "right",
                }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "var(--text-base)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{t.title}</div>
                  <div style={{
                    fontSize: "var(--text-sm)", color: "var(--text-dim)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{t.artist}</div>
                </div>
                <div style={{
                  fontSize: "var(--text-sm)", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums",
                }}>{t.count} plays</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Listening Activity by Hour */}
      <div>
        <h3 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-4)" }}>Listening Activity</h3>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 2,
          height: 120, padding: "var(--space-2) 0",
        }}>
          {hourlyActivity.map((count, hour) => (
            <div
              key={hour}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "flex-end", height: "100%",
              }}
              title={`${hour}:00 — ${count} plays`}
            >
              <div style={{
                width: "100%", maxWidth: 32,
                height: `${(count / maxHourly) * 100}%`,
                minHeight: count > 0 ? 4 : 0,
                background: count > 0 ? "var(--accent)" : "var(--bg-highlight)",
                borderRadius: "2px 2px 0 0",
                transition: "height var(--transition-base)",
              }} />
            </div>
          ))}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "var(--text-xs)", color: "var(--text-dim)", padding: "0 2px",
        }}>
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      </div>
    </div>
  );
}
