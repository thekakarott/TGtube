import { useState, useEffect } from "react";
import { usePlaylists } from "../lib/store";

type Page = "home" | "search" | "favorites" | "history" | "playlist-list" | "stats" | "settings";

const nav: { id: Page; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1.5 1.5 0 0 1 3 0v6h5V7.577l-7.5-4.33z" },
  { id: "search", label: "Search", icon: "M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.279 7.407-7.279s7.407 3.273 7.407 7.279-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.279z" },
];

const libraryNav: { id: Page; label: string; icon: string }[] = [
  { id: "history", label: "History", icon: "M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" },
  { id: "favorites", label: "Liked Songs", icon: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" },
];

export default function Sidebar({ page, onNavigate, mobileOpen, onMobileClose }: { page: string; onNavigate: (p: Page) => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  let playlists: any[] = [];
  try {
    const store = usePlaylists();
    playlists = store.playlists;
  } catch {}

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleNav = (id: Page) => {
    onNavigate(id);
    onMobileClose?.();
  };

  const sidebarContent = (
    <aside style={{
      width: isMobile ? 260 : "var(--sidebar-width)",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      padding: "var(--space-6) 0",
      gap: "var(--space-6)",
      overflowY: "auto",
      ...(isMobile ? {
        position: "fixed" as const,
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 400,
        boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      } : {}),
    }}>
      <div style={{ padding: "0 var(--space-6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--text)" }}>GTube</h1>
        {isMobile && (
          <button onClick={onMobileClose} style={{
            background: "transparent", border: "none", color: "var(--text-sub)",
            cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        )}
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", padding: "0 var(--space-3)" }}>
        {nav.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "none",
                fontSize: "var(--text-base)",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--bg-highlight)" : "transparent",
                color: active ? "var(--text)" : "var(--text-sub)",
                transition: "all var(--transition-base)",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-sub)"; }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "0 var(--space-6)" }}>
        <div style={{
          fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1, color: "var(--text-dim)", marginBottom: "var(--space-2)",
          padding: "0 var(--space-3)",
        }}>
          Library
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", padding: "0 var(--space-3)" }}>
        {libraryNav.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "none",
                fontSize: "var(--text-base)",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                background: active ? "var(--bg-highlight)" : "transparent",
                color: active ? "var(--text)" : "var(--text-sub)",
                transition: "all var(--transition-base)",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-sub)"; }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "0 var(--space-6)" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "var(--space-2)", padding: "0 var(--space-3)",
        }}>
          <span style={{
            fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 1, color: "var(--text-dim)",
          }}>
            Playlists
          </span>
          <button
            onClick={() => handleNav("playlist-list")}
            style={{
              background: "none", border: "none", color: "var(--text-dim)",
              cursor: "pointer", fontSize: "var(--text-lg)", padding: 0, lineHeight: 1,
            }}
            title="View all playlists"
          >
            +
          </button>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", padding: "0 var(--space-3)" }}>
        {playlists.slice(0, 5).map((pl) => (
          <button
            key={pl.id}
            onClick={() => handleNav({ name: "playlist-detail", playlistId: pl.id } as any)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "var(--space-3)",
              padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
              border: "none", fontSize: "var(--text-base)", fontWeight: 500,
              cursor: "pointer", textAlign: "left", background: "transparent",
              color: "var(--text-sub)", transition: "all var(--transition-base)",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--text)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-sub)"}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
              background: "var(--bg-highlight)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 10, color: "var(--text-dim)", overflow: "hidden",
            }}>
              {pl.coverUrl ? (
                <img src={pl.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                "♫"
              )}
            </span>
            <span style={{
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{pl.name}</span>
          </button>
        ))}
        {playlists.length > 5 && (
          <button
            onClick={() => handleNav("playlist-list")}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
              border: "none", fontSize: "var(--text-sm)", cursor: "pointer",
              background: "transparent", color: "var(--text-dim)", textAlign: "left",
            }}
          >
            Show all ({playlists.length})
          </button>
        )}
      </nav>

      <div style={{ padding: "0 var(--space-6)" }}>
        <button
          onClick={() => handleNav("stats")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "var(--space-4)",
            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
            border: "none", fontSize: "var(--text-base)", fontWeight: page === "stats" ? 700 : 500,
            cursor: "pointer", textAlign: "left",
            background: page === "stats" ? "var(--bg-highlight)" : "transparent",
            color: page === "stats" ? "var(--text)" : "var(--text-sub)",
            transition: "all var(--transition-base)",
          }}
          onMouseEnter={(e) => { if (page !== "stats") e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { if (page !== "stats") e.currentTarget.style.color = "var(--text-sub)"; }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/>
          </svg>
          Stats
        </button>
        <button
          onClick={() => handleNav("settings")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "var(--space-4)",
            padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)",
            border: "none", fontSize: "var(--text-base)", fontWeight: page === "settings" ? 700 : 500,
            cursor: "pointer", textAlign: "left",
            background: page === "settings" ? "var(--bg-highlight)" : "transparent",
            color: page === "settings" ? "var(--text)" : "var(--text-sub)",
            transition: "all var(--transition-base)",
            marginTop: "var(--space-1)",
          }}
          onMouseEnter={(e) => { if (page !== "settings") e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { if (page !== "settings") e.currentTarget.style.color = "var(--text-sub)"; }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.611 3.611 0 0112 15.6z"/>
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
}
