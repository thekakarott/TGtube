<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/1587ed66-ec5a-4ccf-acbd-972542474dd0" />
<<<<<<< HEAD
# TGtube

=======
# GTube - YouTube Music Client for Linux

A modern GTK4 application for streaming YouTube Music with a beautiful, native Linux interface.

## 🎵 Overview

GTube is a desktop music player that integrates with YouTube Music, providing a native Linux experience with features like:

- **Home Feed**: Browse trending music, quick picks, and curated playlists
- **Search**: Find songs, albums, artists, and playlists
- **Playback**: High-quality audio streaming with seek controls
- **Queue Management**: Add songs to queue, skip tracks
- **MPRIS Integration**: Media keys and system integration
- **Dark Theme**: Beautiful Gruvbox-inspired dark theme

## 🏗️ Architecture

### Core Components

```
GTube/
├── main.py              # Application entry point & GTK setup
├── backend/             # Business logic layer
│   ├── player.py        # Audio engine (mpv + GObject signals)
│   ├── ytmusic.py       # YouTube Music API wrapper
│   └── mpris.py         # MPRIS D-Bus service
├── ui/                  # User interface layer
│   ├── window.py        # Main window & navigation
│   ├── home_page.py     # Home feed with music cards
│   ├── search_page.py   # Search interface & results
│   ├── now_playing_bar.py # Bottom playback controls
│   ├── now_playing_full.py # Full-screen player
│   └── queue_view.py    # Queue management
├── gtube.css           # GTK4 styling (Gruvbox theme)
├── requirements.txt     # Python dependencies
├── setup.sh            # Installation script
└── run.sh              # Launch script
```

### Technology Stack

#### Frontend (UI)
- **GTK4 + Libadwaita**: Modern GNOME UI toolkit
- **CSS**: Custom styling with Gruvbox color scheme
- **GObject Signals**: Event-driven UI updates

#### Backend (Audio & API)
- **python-mpv**: Audio playback engine
- **ytmusicapi**: YouTube Music API client
- **yt-dlp**: Video/audio extraction (fallback)
- **GObject**: Signal-based architecture

#### System Integration
- **MPRIS**: Media player remote interface
- **D-Bus**: Inter-process communication
- **Desktop Entry**: Application launcher integration

## 🚀 Getting Started

### Prerequisites

- **Ubuntu/Debian**: GTK4, Libadwaita, mpv, ffmpeg
- **Python 3.8+**: Virtual environment support
- **Node.js**: JavaScript runtime for yt-dlp

### Installation

```bash
# Clone repository
git clone <repository-url>
cd gtube

# Run setup script (installs system deps + Python packages)
./setup.sh

# Launch application
./run.sh
```

### Manual Setup

```bash
# Install system dependencies
sudo apt install mpv ffmpeg python3-gi python3-gi-cairo \
                 gir1.2-gtk-4.0 gir1.2-adw-1 python3-pip

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

## 🔧 How It Works

### 1. Application Lifecycle

```python
# main.py - Entry point
class GtubeApp(Adw.Application):
    def _on_activate(self, app):
        # Load CSS theme
        load_css()

        # Initialize backend services
        self._player = Player()           # Audio engine
        self._ytmusic = YTMusicClient()   # API client
        self._mpris = MPRISService()      # System integration

        # Create main window
        win = GtubeWindow(player, ytmusic, application=app)
        win.present()
```

### 2. Audio Playback Pipeline

```python
# backend/player.py - Audio engine
class Player(GObject.Object):
    def _init_mpv(self):
        # Initialize mpv with yt-dlp integration
        self._mpv = mpv.MPV(
            ytdl=True,                    # Enable yt-dlp
            ytdl_format="bestaudio/best", # Best audio quality
            video=False,                  # Audio only
        )

    def _start_playback(self, track):
        # Extract YouTube URL
        url = f"https://www.youtube.com/watch?v={track['videoId']}"

        # Play with mpv (yt-dlp handles extraction)
        self._mpv.play(url)

        # Emit GObject signals for UI updates
        self.emit("track-changed", vid, title, artist, thumb)
```

### 3. YouTube Music Integration

```python
# backend/ytmusic.py - API wrapper
class YTMusicClient:
    def __init__(self):
        self._yt = YTMusic()  # Anonymous access

    def get_home(self, callback):
        # Fetch home feed sections
        sections = self._yt.get_home(limit=6)
        callback(sections, None)

    def search(self, query, callback):
        # Search across all categories
        results = self._yt.search(query, limit=20)
        callback(results, None)
```

### 4. UI Architecture

```python
# ui/window.py - Main window
class GtubeWindow(Adw.ApplicationWindow):
    def _build(self):
        # Header bar with navigation
        # Sidebar with page buttons
        # Stack for page switching
        # Now playing bar (bottom)

    def _set_page(self, page_name):
        # Switch between Home, Search, Queue pages
        self._stack.set_visible_child_name(page_name)
```

### 5. Event-Driven Updates

```python
# GObject signals connect backend to UI
player.connect("track-changed", self._on_track_changed)
player.connect("position-changed", self._on_position_changed)
player.connect("state-changed", self._on_playback_state_changed)
```

## 🎨 UI Components

### Home Page
- **SectionCarousel**: Horizontal scrolling music cards
- **MusicCard**: Thumbnail + title + artist with click gestures
- **Lazy Loading**: Images loaded asynchronously

### Search Page
- **SearchEntry**: Real-time search input
- **Tabbed Results**: Songs, Albums, Artists, Playlists
- **TrackRow/CardRow**: List items with play buttons

### Now Playing Bar
- **Progress Slider**: Seek control with gesture handling
- **Control Buttons**: Play/pause, next/prev
- **Volume Slider**: Audio level control

### Full Player Overlay
- **Album Art**: Large thumbnail display
- **Lyrics Panel**: Synced lyrics (future feature)
- **Full Controls**: Enhanced playback controls

## 🔗 Key Technologies & Resources

### GTK4 & Libadwaita
- [GTK4 Documentation](https://docs.gtk.org/gtk4/)
- [Libadwaita Guide](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/)
- [Python GTK Tutorial](https://python-gtk-3-tutorial.readthedocs.io/)

### GObject & Signals
- [GObject Reference](https://docs.gtk.org/gobject/)
- [PyGObject Signals](https://pygobject.readthedocs.io/en/latest/guide/signals.html)

### Audio Playback
- [python-mpv](https://github.com/jaseg/python-mpv)
- [mpv Manual](https://mpv.io/manual/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)

### YouTube Music API
- [ytmusicapi](https://ytmusicapi.readthedocs.io/)
- [YouTube Music Web](https://music.youtube.com/)

### System Integration
- [MPRIS Specification](https://specifications.freedesktop.org/mpris-spec/latest/)
- [D-Bus Tutorial](https://dbus.freedesktop.org/doc/dbus-tutorial.html)

## 🚀 Development & Improvements

### Current Issues & Fixes Applied

#### 1. GTK3 → GTK4 Migration
**Problem**: Code used GTK3 event signals (`button-press-event`)
**Solution**: Migrated to GTK4 gesture controllers (`Gtk.GestureClick`)

```python
# Before (GTK3)
widget.connect("button-press-event", callback)

# After (GTK4)
gesture = Gtk.GestureClick.new()
gesture.connect("pressed", callback)
widget.add_controller(gesture)
```

#### 2. YouTube Blocking
**Problem**: YouTube actively blocks automated access
**Solution**: Multiple fallback strategies:
- Primary: mpv + yt-dlp integration
- Fallback: Direct yt-dlp URL extraction
- Future: ytmusicapi streaming URLs

#### 3. MPRIS Integration
**Problem**: Invalid D-Bus object paths
**Solution**: Sanitize track IDs for valid object paths

### Planned Improvements

#### 1. Enhanced Search
```python
# Add real-time search with debouncing
def _on_search_changed(self, entry):
    query = entry.get_text()
    if len(query) > 2:
        GLib.timeout_add(300, self._perform_search, query)  # Debounce
```

#### 2. Lyrics Integration
```python
# Add lyrics fetching and display
def get_lyrics(self, video_id, callback):
    # Use lrclib.net or Genius API
    lyrics = fetch_lyrics(video_id)
    callback(lyrics)
```

#### 3. Playlist Management
```python
# Add local playlist creation/editing
def create_playlist(self, name, tracks):
    playlist = {"name": name, "tracks": tracks}
    self._playlists.append(playlist)
```

#### 4. Caching & Offline
```python
# Cache downloaded audio files
def cache_track(self, track):
    if not os.path.exists(f"cache/{track['videoId']}.m4a"):
        # Download and cache audio file
        pass
```

#### 5. Better Error Handling
```python
# Add comprehensive error reporting
def _handle_playback_error(self, error):
    # Show user-friendly error messages
    # Offer retry options
    # Log for debugging
    pass
```

### Testing & Quality

#### Unit Tests
```bash
# Add pytest for backend testing
pip install pytest
pytest tests/
```

#### Integration Tests
```bash
# Test full playback pipeline
python -m pytest tests/integration/
```

#### UI Testing
```bash
# Use GTK testing tools
pip install dogtail  # GUI testing
```

### Performance Optimizations

#### 1. Image Loading
- Implement proper image caching
- Use lower resolution thumbnails initially
- Progressive loading for better UX

#### 2. Memory Management
- Clean up unused GTK widgets
- Implement object pooling for list items
- Monitor memory usage with `tracemalloc`

#### 3. Network Efficiency
- Implement request caching
- Use HTTP/2 for API calls
- Compress API responses

### Packaging & Distribution

#### Flatpak
```ini
# com.github.thekakarott.GTube.metainfo.xml
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>com.github.thekakarott.GTube</id>
  <name>GTube</name>
  <summary>YouTube Music for Linux</summary>
  <!-- ... -->
</component>
```

#### Debian Package
```bash
# Create .deb package
dpkg-buildpackage -us -uc
```

#### Snap/PPA
```yaml
# snapcraft.yaml
name: gtube
version: '1.0.0'
summary: YouTube Music for Linux
description: |
  A beautiful GTK4 application for YouTube Music
```

## 📚 Learning Resources

### GTK4 Development
1. [GTK4 Getting Started](https://docs.gtk.org/gtk4/getting_started.html)
2. [Libadwaita Patterns](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/patterns.html)
3. [Python GTK Examples](https://github.com/TomSchimansky/CustomTkinter/tree/master/examples)

### Audio Applications
1. [Lollypop (GNOME Music Player)](https://gitlab.gnome.org/World/lollypop)
2. [GNOME Music](https://gitlab.gnome.org/GNOME/gnome-music)
3. [Clementine](https://github.com/clementine-player/Clementine)

### YouTube Integration
1. [NewPipe (Android)](https://github.com/TeamNewPipe/NewPipe)
2. [FreeTube](https://github.com/FreeTubeApp/FreeTube)
3. [Invidious](https://github.com/iv-org/invidious)

## 🤝 Contributing

### Development Setup
```bash
# Fork and clone
git clone https://github.com/yourusername/gtube.git
cd gtube

# Install development dependencies
pip install -r requirements-dev.txt
```

### Code Style
```bash
# Format code
black .
isort .

# Lint code
flake8 .
mypy .
```

### Pull Request Process
1. Update documentation for API changes
2. Add tests for new features
3. Ensure CI passes
4. Request review from maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GNOME Project**: GTK4 and Libadwaita frameworks
- **mpv developers**: Excellent media player
- **yt-dlp team**: YouTube extraction tools
- **ytmusicapi**: YouTube Music API access
- **Gruvbox**: Beautiful color scheme

---

**Built with ❤️ for the Linux desktop experience**
>>>>>>> 957bb8f (UI optmizations)
