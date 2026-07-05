# GTube

A modern YouTube Music client built with React + Flask + ytmusicapi. No login required.

## Features

### Playback
- Stream any song, album, or playlist from YouTube Music
- Shuffle, repeat (one/all), crossfade between tracks
- Playback speed control (0.5x - 2x)
- Volume normalization
- Radio mode (auto-extends queue with related tracks)

### Library (client-side, no account needed)
- **Favorites** — heart any track, browse your liked songs
- **Playlists** — create, rename, reorder, delete. Save tracks from anywhere
- **History** — auto-tracks plays after 30s, searchable, grouped by date
- **Stats** — top tracks/artists by 7d/30d/all time, hourly listening activity

### Personalization
- Home feed learns from your listening history
- "Your Top Artists" section shows your most-played artists
- Mood/activity filter chips
- Charts and trending sections

### UI/UX
- Spotify-inspired dark design with glassmorphism
- Full-screen player with blurred album art backdrop
- Synced lyrics (when available)
- Context menu: like, save to playlist, play next, share
- Keyboard shortcuts (Space, arrows, N/P/F, `?` for help)
- Sleep timer with presets
- Search autocomplete with keyboard navigation
- Playback state persists across refresh

### Data
- Export/import all data as JSON (playlists, favorites, history)
- All data stored in IndexedDB (browser-local, no server required)
- No accounts, no tracking, no ads

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Flask + ytmusicapi |
| Storage | IndexedDB (client-side) |
| Styling | CSS variables + design tokens |
| Audio | HTML5 Audio API |

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- yt-dlp (for audio stream extraction)

### Setup

```bash
# Clone
git clone <repo-url>
cd gtube

# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install flask flask-cors ytmusicapi yt-dlp requests

# Frontend
cd web
npm install
```

### Run

```bash
# Terminal 1 — Backend (port 8765)
cd gtube
.venv/bin/python -m backend.server

# Terminal 2 — Frontend (port 1420)
cd gtube/web
npm run dev
```

Open http://localhost:1420

## Project Structure

```
gtube/
├── backend/
│   ├── server.py           # Flask API (port 8765)
│   ├── ytmusic.py          # Thread-safe ytmusicapi wrapper
│   └── ytmusic_bridge.py   # Legacy CLI bridge
├── web/
│   ├── src/
│   │   ├── App.tsx          # Root component, routing, audio playback
│   │   ├── api.ts           # HTTP client for backend
│   │   ├── lib/
│   │   │   ├── db.ts        # IndexedDB wrapper
│   │   │   └── store.tsx    # React Context (favorites, playlists, history)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Navigation
│   │   │   ├── HomePage.tsx      # Feed + personalized sections
│   │   │   ├── SearchPage.tsx    # Search + autocomplete
│   │   │   ├── NowPlayingBar.tsx # Bottom player bar
│   │   │   ├── FullPlayer.tsx    # Full-screen player
│   │   │   ├── FavoritesPage.tsx # Liked songs
│   │   │   ├── HistoryPage.tsx   # Listening history
│   │   │   ├── PlaylistListPage.tsx
│   │   │   ├── PlaylistDetailPage.tsx
│   │   │   ├── StatsPage.tsx     # Listening statistics
│   │   │   ├── SettingsPage.tsx  # Export/import
│   │   │   └── ...               # Shared components
│   │   └── styles/
│   │       └── globals.css  # Design system tokens
│   ├── package.json
│   └── vite.config.ts
└── requirements.txt
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/home` | Home feed sections |
| `GET /api/search?q=&filter=` | Search songs/albums/artists/playlists |
| `GET /api/search-suggestions?q=` | Autocomplete suggestions |
| `GET /api/stream-url?videoId=` | Get audio stream URL |
| `GET /api/stream/<videoId>` | Proxy audio stream |
| `GET /api/lyrics?videoId=` | Fetch synced lyrics |
| `GET /api/album?browseId=` | Album details |
| `GET /api/artist?channelId=` | Artist details |
| `GET /api/playlist?listId=` | Playlist details |
| `GET /api/watch-queue?videoId=&radio=` | Up-next queue / artist radio |
| `GET /api/artist-tracks?channelIds=` | Batch artist top tracks |
| `GET /api/charts?country=` | Trending charts |
| `GET /api/moods-genres` | Mood/genre categories |

## Design System

The app uses a comprehensive CSS variable system inspired by Spotify's design language:

- **Colors**: Luminance hierarchy (white text on dark surfaces, green accent at ~5-8% of screen)
- **Typography**: 10-41px scale with weight tokens 400-900
- **Spacing**: 4px grid system (0-96px)
- **Glassmorphism**: Layered depth with backdrop blur
- **Motion**: Respect for `prefers-reduced-motion`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/pause |
| ←/→ | Seek -5s/+5s |
| ↑/↓ | Volume up/down |
| N | Next track |
| P | Previous track |
| F | Toggle full player |
| `?` | Show shortcuts |

## License

MIT
