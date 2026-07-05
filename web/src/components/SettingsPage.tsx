import { useState, useRef } from "react";
import * as db from "../lib/db";

export default function SettingsPage() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setMsg("");
    try {
      const [playlists, favorites, history] = await Promise.all([
        db.getAll("playlists"),
        db.getAll("favorites"),
        db.getAll("history"),
      ]);
      const data = {
        version: 1,
        exportedAt: Date.now(),
        playlists,
        favorites,
        history,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `gtube-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(`Exported ${playlists.length} playlists, ${favorites.length} favorites, ${history.length} history entries.`);
    } catch (e) {
      setMsg("Export failed: " + String(e));
    }
    setExporting(false);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setMsg("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) throw new InvalidError("Not a valid GTube backup file");

      let imported = { playlists: 0, favorites: 0, history: 0 };

      if (Array.isArray(data.playlists)) {
        for (const pl of data.playlists) {
          await db.put("playlists", pl);
          imported.playlists++;
        }
      }
      if (Array.isArray(data.favorites)) {
        for (const fav of data.favorites) {
          await db.put("favorites", fav);
          imported.favorites++;
        }
      }
      if (Array.isArray(data.history)) {
        for (const entry of data.history) {
          await db.put("history", entry);
          imported.history++;
        }
      }

      setMsg(`Imported ${imported.playlists} playlists, ${imported.favorites} favorites, ${imported.history} history entries. Reload to see changes.`);
    } catch (e) {
      setMsg("Import failed: " + String(e));
    }
    setImporting(false);
  };

  const handleClearAll = async () => {
    setClearing(true);
    setMsg("");
    try {
      await Promise.all([
        db.clear("playlists"),
        db.clear("favorites"),
        db.clear("history"),
      ]);
      setMsg("All data cleared. Reload to see changes.");
    } catch (e) {
      setMsg("Clear failed: " + String(e));
    }
    setClearing(false);
  };

  return (
    <div style={{ padding: "var(--space-6)", maxWidth: 600 }}>
      <h1 style={{ fontSize: "var(--text-3xl)", fontWeight: 900, margin: "0 0 var(--space-8)" }}>Settings</h1>

      {/* Export */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Backup</h2>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginBottom: "var(--space-4)" }}>
          Export your playlists, liked songs, and listening history to a JSON file.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: "var(--space-3) var(--space-6)", border: "none", borderRadius: 999,
            background: "var(--accent)", color: "#000", fontWeight: 700,
            fontSize: "var(--text-base)", cursor: "pointer",
          }}
        >
          {exporting ? "Exporting..." : "Export Data"}
        </button>
      </section>

      {/* Import */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>Restore</h2>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginBottom: "var(--space-4)" }}>
          Import a previously exported backup. Existing data will be merged.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          style={{
            padding: "var(--space-3) var(--space-6)", border: "1px solid var(--border)",
            borderRadius: 999, background: "transparent", color: "var(--text)",
            fontWeight: 600, fontSize: "var(--text-base)", cursor: "pointer",
          }}
        >
          {importing ? "Importing..." : "Import Data"}
        </button>
      </section>

      {/* Clear */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)", color: "#e74c3c" }}>
          Danger Zone
        </h2>
        <p style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", marginBottom: "var(--space-4)" }}>
          Permanently delete all local data (playlists, favorites, history). This cannot be undone.
        </p>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to delete ALL local data? This cannot be undone.")) {
              handleClearAll();
            }
          }}
          disabled={clearing}
          style={{
            padding: "var(--space-3) var(--space-6)", border: "1px solid #e74c3c",
            borderRadius: 999, background: "transparent", color: "#e74c3c",
            fontWeight: 600, fontSize: "var(--text-base)", cursor: "pointer",
          }}
        >
          {clearing ? "Clearing..." : "Clear All Data"}
        </button>
      </section>

      {msg && (
        <div style={{
          padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-sm)",
          background: "var(--bg-highlight)", color: "var(--text)", fontSize: "var(--text-base)",
          marginTop: "var(--space-4)",
        }}>
          {msg}
        </div>
      )}

      {/* About */}
      <section style={{ marginTop: "var(--space-12)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-3)" }}>About</h2>
        <div style={{ fontSize: "var(--text-base)", color: "var(--text-sub)", lineHeight: 1.6 }}>
          <p><strong>GTube</strong> — A YouTube Music client built with React + Flask + ytmusicapi</p>
          <p>All data is stored locally in your browser. No account required.</p>
        </div>
      </section>
    </div>
  );
}

class InvalidError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "InvalidError";
  }
}
