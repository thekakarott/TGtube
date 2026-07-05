# GTube → Tauri Desktop Music Player
## Complete Migration & Implementation Roadmap

---

## ARCHITECTURE OVERVIEW

```
gtube-tauri/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Tauri entry, window management
│   │   ├── audio/          # Audio engine
│   │   │   ├── mod.rs
│   │   │   ├── player.rs   # Core playback (rodio/symphonia)
│   │   │   ├── queue.rs    # Queue management
│   │   │   ├── crossfade.rs
│   │   │   ├── gapless.rs
│   │   │   ├── effects.rs  # EQ, normalization
│   │   │   └── waveform.rs
│   │   ├── ytmusic/        # YouTube Music API
│   │   │   ├── mod.rs
│   │   │   ├── client.rs   # ytmusicapi wrapper
│   │   │   ├── search.rs
│   │   │   ├── playlist.rs
│   │   │   └── cache.rs
│   │   ├── cache/          # Local caching
│   │   │   ├── mod.rs
│   │   │   ├── image.rs    # Album art cache
│   │   │   ├── audio.rs    # Audio file cache
│   │   │   └── metadata.rs # SQLite metadata
│   │   ├── system/         # System integration
│   │   │   ├── mod.rs
│   │   │   ├── mpris.rs    # Linux media keys
│   │   │   ├── discord.rs  # Rich presence
│   │   │   └── tray.rs     # System tray
│   │   └── plugins/        # Plugin system
│   │       ├── mod.rs
│   │       └── loader.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                    # React frontend
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Root component
│   ├── components/
│   │   ├── player/        # Playback UI
│   │   │   ├── NowPlaying.tsx
│   │   │   ├── MiniPlayer.tsx
│   │   │   ├── FullscreenPlayer.tsx
│   │   │   ├── Controls.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── VolumeControl.tsx
│   │   │   └── Visualizer.tsx
│   │   ├── queue/         # Queue management
│   │   │   ├── QueueDrawer.tsx
│   │   │   ├── QueueItem.tsx
│   │   │   └── QueueControls.tsx
│   │   ├── library/       # Library views
│   │   │   ├── AlbumGrid.tsx
│   │   │   ├── AlbumView.tsx
│   │   │   ├── ArtistView.tsx
│   │   │   ├── PlaylistView.tsx
│   │   │   └── TrackList.tsx
│   │   ├── search/        # Search UI
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── CommandPalette.tsx
│   │   ├── navigation/    # Navigation
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   └── shared/        # Shared components
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Tooltip.tsx
│   ├── hooks/             # React hooks
│   │   ├── usePlayer.ts
│   │   ├── useQueue.ts
│   │   ├── useKeyboard.ts
│   │   ├── useTheme.ts
│   │   └── useCache.ts
│   ├── stores/            # Zustand stores
│   │   ├── playerStore.ts
│   │   ├── queueStore.ts
│   │   ├── libraryStore.ts
│   │   └── uiStore.ts
│   ├── lib/               # Utilities
│   │   ├── tauri.ts       # Tauri IPC
│   │   ├── colors.ts      # Color extraction
│   │   ├── animations.ts  # Motion configs
│   │   └── keyboard.ts    # Keyboard handling
│   ├── styles/            # Styling
│   │   ├── globals.css
│   │   ├── animations.css
│   │   └── themes.css
│   └── types/             # TypeScript types
│       ├── player.ts
│       ├── track.ts
│       └── api.ts
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## PHASE 1: FOUNDATION (Week 1-2)

### 1.1 Tauri Setup
```toml
# src-tauri/Cargo.toml
[package]
name = "gtube"
version = "2.0.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["shell-open", "system-tray", "notification"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
rodio = "0.17"              # Audio playback
symphonia = "0.5"           # Audio decoding
reqwest = { version = "0.11", features = ["json"] }
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio-native-tls"] }
image = "0.24"              # Image processing
fast_image_resize = "2.7"   # Fast image resizing
parking_lot = "0.12"        # Fast locks
dashmap = "5.5"             # Concurrent hashmap
lru = "0.12"                # LRU cache
```

### 1.2 Window Configuration
```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "GTube",
    "version": "2.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": { "open": true },
      "notification": { "all": true },
      "globalShortcut": { "all": true }
    },
    "windows": [
      {
        "title": "GTube",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "decorations": true,
        "transparent": false,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "systemTray": {
      "iconPath": "icons/icon.png",
      "iconAsTemplate": true
    }
  }
}
```

### 1.3 Frontend Setup
```json
// package.json
{
  "name": "gtube",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^1.5.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "framer-motion": "^10.16.0",
    "react-virtuoso": "^4.6.0",
    "cmdk": "^0.2.0",
    "react-hotkeys-hook": "^4.4.0",
    "color-thief-react": "^2.1.0",
    "wavesurfer.js": "^7.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## PHASE 2: AUDIO ENGINE (Week 3-4)

### 2.1 Core Player
```rust
// src-tauri/src/audio/player.rs
use rodio::{Decoder, OutputStream, Sink, Source};
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::mpsc;

pub struct AudioPlayer {
    sink: Arc<RwLock<Option<Sink>>>,
    _stream: OutputStream,
    queue: Arc<RwLock<Vec<Track>>>,
    current_index: Arc<RwLock<usize>>,
    state: Arc<RwLock<PlayerState>>,
    event_tx: mpsc::UnboundedSender<PlayerEvent>,
}

#[derive(Clone, Debug)]
pub enum PlayerState {
    Playing,
    Paused,
    Stopped,
    Buffering,
}

#[derive(Clone, Debug)]
pub enum PlayerEvent {
    TrackChanged(Track),
    StateChanged(PlayerState),
    PositionChanged(f64),
    VolumeChanged(f32),
    QueueChanged,
}

impl AudioPlayer {
    pub fn new() -> Result<Self, AudioError> {
        let (stream, stream_handle) = OutputStream::try_default()?;
        let sink = Sink::try_new(&stream_handle)?;
        let (event_tx, _event_rx) = mpsc::unbounded_channel();
        
        Ok(Self {
            sink: Arc::new(RwLock::new(Some(sink))),
            _stream: stream,
            queue: Arc::new(RwLock::new(Vec::new())),
            current_index: Arc::new(RwLock::new(0)),
            state: Arc::new(RwLock::new(PlayerState::Stopped)),
            event_tx,
        })
    }
    
    pub async fn play(&self, track: Track) -> Result<(), AudioError> {
        // Fetch audio stream
        let audio_data = self.fetch_audio(&track).await?;
        
        // Decode audio
        let source = Decoder::new(std::io::Cursor::new(audio_data))?;
        
        // Apply effects
        let source = self.apply_effects(source);
        
        // Play
        if let Some(sink) = self.sink.write().as_ref() {
            sink.append(source);
            sink.play();
        }
        
        *self.state.write() = PlayerState::Playing;
        self.event_tx.send(PlayerEvent::TrackChanged(track))?;
        
        Ok(())
    }
    
    pub fn pause(&self) {
        if let Some(sink) = self.sink.read().as_ref() {
            sink.pause();
        }
        *self.state.write() = PlayerState::Paused;
    }
    
    pub fn resume(&self) {
        if let Some(sink) = self.sink.read().as_ref() {
            sink.play();
        }
        *self.state.write() = PlayerState::Playing;
    }
    
    pub fn seek(&self, position: f64) {
        if let Some(sink) = self.sink.read().as_ref() {
            sink.try_seek(std::time::Duration::from_secs_f64(position)).ok();
        }
    }
    
    pub fn set_volume(&self, volume: f32) {
        if let Some(sink) = self.sink.read().as_ref() {
            sink.set_volume(volume);
        }
        self.event_tx.send(PlayerEvent::VolumeChanged(volume)).ok();
    }
}
```

### 2.2 Gapless Playback
```rust
// src-tauri/src/audio/gapless.rs
pub struct GaplessPlayer {
    current_sink: Arc<RwLock<Sink>>,
    next_sink: Arc<RwLock<Option<Sink>>>,
    preload_threshold: f64, // Seconds before end to preload
}

impl GaplessPlayer {
    pub fn new(stream_handle: &OutputStreamHandle) -> Self {
        Self {
            current_sink: Arc::new(RwLock::new(Sink::try_new(stream_handle).unwrap())),
            next_sink: Arc::new(RwLock::new(None)),
            preload_threshold: 5.0,
        }
    }
    
    pub async fn preload_next(&self, track: Track) {
        let audio_data = fetch_audio(&track).await.unwrap();
        let source = Decoder::new(std::io::Cursor::new(audio_data)).unwrap();
        
        let next_sink = Sink::try_new(&self.stream_handle).unwrap();
        next_sink.append(source);
        next_sink.pause(); // Keep paused until transition
        
        *self.next_sink.write() = Some(next_sink);
    }
    
    pub fn transition_to_next(&self) {
        if let Some(next) = self.next_sink.write().take() {
            // Fade out current
            self.current_sink.read().set_volume(0.0);
            
            // Swap sinks
            *self.current_sink.write() = next;
            
            // Fade in new
            self.current_sink.read().set_volume(1.0);
            self.current_sink.read().play();
        }
    }
}
```

### 2.3 Crossfade
```rust
// src-tauri/src/audio/crossfade.rs
pub struct CrossfadePlayer {
    fade_duration: f64, // Seconds
}

impl CrossfadePlayer {
    pub fn crossfade(&self, from_sink: &Sink, to_sink: &Sink) {
        let steps = 50;
        let step_duration = self.fade_duration / steps as f64;
        
        for i in 0..steps {
            let progress = i as f32 / steps as f32;
            from_sink.set_volume(1.0 - progress);
            to_sink.set_volume(progress);
            std::thread::sleep(std::time::Duration::from_secs_f64(step_duration));
        }
    }
}
```

---

## PHASE 3: MOTION DESIGN SYSTEM (Week 5)

### 3.1 Animation Configuration
```typescript
// src/lib/animations.ts
export const springs = {
  // Buttery smooth spring for most UI
  smooth: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  },
  
  // Snappy spring for buttons
  snappy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
    mass: 0.5,
  },
  
  // Bouncy spring for playful elements
  bouncy: {
    type: "spring" as const,
    stiffness: 200,
    damping: 15,
    mass: 1.0,
  },
  
  // Gentle spring for large elements
  gentle: {
    type: "spring" as const,
    stiffness: 200,
    damping: 35,
    mass: 1.2,
  },
} as const;

export const easings = {
  // Standard easing for most transitions
  standard: [0.4, 0.0, 0.2, 1] as const,
  
  // Decelerate for entering elements
  decelerate: [0.0, 0.0, 0.2, 1] as const,
  
  // Accelerate for exiting elements
  accelerate: [0.4, 0.0, 1, 1] as const,
  
  // Sharp for quick transitions
  sharp: [0.4, 0.0, 0.6, 1] as const,
} as const;

export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

// Shared element transition
export const sharedTransition = {
  layout: true,
  layoutId: "shared",
  transition: springs.smooth,
};

// Stagger children
export const staggerChildren = {
  staggerChildren: 0.05,
  delayChildren: 0.1,
};
```

### 3.2 Now Playing Transitions
```typescript
// src/components/player/NowPlaying.tsx
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

export const NowPlaying = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [albumColor, setAlbumColor] = useState('#1db954');
  
  // Extract dominant color from album art
  useEffect(() => {
    if (currentTrack?.albumArt) {
      extractColor(currentTrack.albumArt).then(setAlbumColor);
    }
  }, [currentTrack]);
  
  return (
    <motion.div
      className="relative h-screen overflow-hidden"
      animate={{ backgroundColor: albumColor }}
      transition={{ duration: 1, ease: easings.standard }}
    >
      {/* Blurred background */}
      <motion.div
        className="absolute inset-0 blur-3xl opacity-30"
        style={{
          backgroundImage: `url(${currentTrack?.albumArt})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        animate={{ scale: 1.1 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
      />
      
      {/* Album art with shared element transition */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentTrack?.id}
          src={currentTrack?.albumArt}
          layoutId={`album-${currentTrack?.id}`}
          initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
          transition={springs.smooth}
          className="w-96 h-96 rounded-2xl shadow-2xl"
        />
      </AnimatePresence>
      
      {/* Track info with stagger */}
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: staggerChildren,
          },
        }}
        initial="hidden"
        animate="show"
      >
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 },
          }}
          className="text-6xl font-bold"
        >
          {currentTrack?.title}
        </motion.h1>
        
        <motion.p
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 },
          }}
          className="text-2xl text-gray-400"
        >
          {currentTrack?.artist}
        </motion.p>
      </motion.div>
    </motion.div>
  );
};
```

### 3.3 Queue Interactions
```typescript
// src/components/queue/QueueDrawer.tsx
import { Reorder } from 'framer-motion';

export const QueueDrawer = () => {
  const [queue, setQueue] = useState<Track[]>([]);
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={springs.smooth}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 200) {
          // Close drawer
        }
      }}
      className="fixed right-0 top-0 h-screen w-96 bg-black/95 backdrop-blur-xl"
    >
      <Reorder.Group values={queue} onReorder={setQueue}>
        {queue.map((track) => (
          <Reorder.Item
            key={track.id}
            value={track}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            <QueueItem track={track} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </motion.div>
  );
};
```

---

## PHASE 4: PLAYER UX (Week 6-7)

### 4.1 Progress Bar with Waveform
```typescript
// src/components/player/ProgressBar.tsx
export const ProgressBar = () => {
  const { position, duration, seek } = usePlayer();
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  
  // Generate waveform
  useEffect(() => {
    if (currentTrack) {
      generateWaveform(currentTrack.audioUrl).then(setWaveform);
    }
  }, [currentTrack]);
  
  const handleSeek = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    seek(percent * duration);
  };
  
  return (
    <motion.div
      className="relative h-16 cursor-pointer group"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setHoverPosition(x / rect.width);
      }}
      onMouseLeave={() => setHoverPosition(null)}
      onClick={handleSeek}
    >
      {/* Waveform background */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {waveform.map((amplitude, i) => (
          <rect
            key={i}
            x={`${(i / waveform.length) * 100}%`}
            y={`${50 - amplitude * 50}%`}
            width={`${100 / waveform.length}%`}
            height={`${amplitude * 100}%`}
            fill="currentColor"
            className={i / waveform.length < position / duration ? 'text-green-500' : 'text-gray-600'}
          />
        ))}
      </svg>
      
      {/* Hover preview */}
      <AnimatePresence>
        {hoverPosition !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springs.snappy}
            style={{ left: `${hoverPosition * 100}%` }}
            className="absolute bottom-full mb-2 -translate-x-1/2 bg-black px-2 py-1 rounded text-xs"
          >
            {formatTime(hoverPosition * duration)}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Playhead */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg"
        style={{ left: `${(position / duration) * 100}%` }}
        whileHover={{ scale: 1.5 }}
        whileTap={{ scale: 0.9 }}
      />
    </motion.div>
  );
};
```

### 4.2 Visualizer
```typescript
// src/components/player/Visualizer.tsx
import WaveSurfer from 'wavesurfer.js';

export const Visualizer = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  
  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a5568',
        progressColor: '#1db954',
        cursorColor: '#ffffff',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 128,
        barGap: 2,
      });
    }
    
    return () => wavesurfer.current?.destroy();
  }, []);
  
  return (
    <motion.div
      ref={waveformRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springs.smooth}
      className="w-full"
    />
  );
};
```

---

## PHASE 5: KEYBOARD WORKFLOW (Week 8)

### 5.1 Command Palette
```typescript
// src/components/search/CommandPalette.tsx
import { Command } from 'cmdk';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  useHotkeys('mod+k', () => setOpen(true));
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={springs.smooth}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[640px] z-50"
          >
            <Command className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search tracks, albums, artists..."
                className="w-full px-4 py-3 bg-transparent border-b border-gray-800 outline-none"
              />
              
              <Command.List className="max-h-96 overflow-y-auto p-2">
                <Command.Group heading="Tracks">
                  {tracks.map((track) => (
                    <Command.Item
                      key={track.id}
                      onSelect={() => playTrack(track)}
                      className="px-3 py-2 rounded hover:bg-gray-800 cursor-pointer"
                    >
                      {track.title} - {track.artist}
                    </Command.Item>
                  ))}
                </Command.Group>
                
                <Command.Group heading="Actions">
                  <Command.Item onSelect={() => toggleShuffle()}>
                    Toggle Shuffle
                  </Command.Item>
                  <Command.Item onSelect={() => cycleRepeat()}>
                    Cycle Repeat Mode
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### 5.2 Global Shortcuts
```typescript
// src/hooks/useKeyboard.ts
export const useGlobalShortcuts = () => {
  const { play, pause, next, prev, seek, setVolume } = usePlayer();
  
  useHotkeys('space', () => isPlaying ? pause() : play());
  useHotkeys('mod+right', () => next());
  useHotkeys('mod+left', () => prev());
  useHotkeys('right', () => seek(position + 10));
  useHotkeys('left', () => seek(position - 10));
  useHotkeys('up', () => setVolume(Math.min(1, volume + 0.05)));
  useHotkeys('down', () => setVolume(Math.max(0, volume - 0.05)));
  useHotkeys('mod+k', () => openCommandPalette());
  useHotkeys('mod+/', () => openShortcutsHelp());
  useHotkeys('q', () => toggleQueue());
  useHotkeys('l', () => toggleLyrics());
  useHotkeys('f', () => toggleFullscreen());
  useHotkeys('m', () => toggleMute());
  useHotkeys('r', () => cycleRepeat());
  useHotkeys('s', () => toggleShuffle());
};
```

---

## PHASE 6: PERFORMANCE OPTIMIZATION (Week 9)

### 6.1 Virtualized Lists
```typescript
// src/components/library/AlbumGrid.tsx
import { Virtuoso } from 'react-virtuoso';

export const AlbumGrid = ({ albums }: { albums: Album[] }) => {
  return (
    <Virtuoso
      data={albums}
      itemContent={(index, album) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, ...springs.smooth }}
        >
          <AlbumCard album={album} />
        </motion.div>
      )}
      overscan={200}
      className="h-full"
    />
  );
};
```

### 6.2 Image Optimization
```rust
// src-tauri/src/cache/image.rs
use fast_image_resize as fr;
use image::ImageFormat;

pub async fn cache_album_art(url: &str, sizes: &[u32]) -> Result<(), CacheError> {
    // Download original
    let response = reqwest::get(url).await?;
    let bytes = response.bytes().await?;
    
    // Decode
    let img = image::load_from_memory(&bytes)?;
    
    // Resize to multiple sizes
    for &size in sizes {
        let resized = resize_image(&img, size, size)?;
        
        // Save to cache
        let cache_path = get_cache_path(url, size);
        resized.save_with_format(&cache_path, ImageFormat::WebP)?;
    }
    
    Ok(())
}

fn resize_image(img: &DynamicImage, width: u32, height: u32) -> Result<DynamicImage, ImageError> {
    let src_image = fr::Image::from_vec_u8(
        img.width(),
        img.height(),
        img.to_rgba8().into_raw(),
        fr::PixelType::U8x4,
    )?;
    
    let mut dst_image = fr::Image::new(width, height, src_image.pixel_type());
    
    let mut resizer = fr::Resizer::new(fr::ResizeAlg::Convolution(fr::FilterType::Lanczos3));
    resizer.resize(&src_image.view(), &mut dst_image.view_mut())?;
    
    Ok(DynamicImage::ImageRgba8(
        image::RgbaImage::from_raw(width, height, dst_image.buffer().to_vec()).unwrap()
    ))
}
```

---

## MIGRATION STRATEGY

### Step 1: Parallel Development (Week 1-4)
- Keep Python/GTK4 version running
- Build Tauri foundation alongside
- Port audio engine first
- Test audio playback parity

### Step 2: Feature Parity (Week 5-8)
- Port all UI components
- Implement motion system
- Add keyboard shortcuts
- Test all features

### Step 3: Polish & Optimize (Week 9-10)
- Performance tuning
- Animation refinement
- Bug fixes
- User testing

### Step 4: Migration (Week 11)
- Final testing
- Documentation
- Release Tauri version
- Deprecate GTK4 version

---

## PERFORMANCE TARGETS

| Metric | Target | Strategy |
|--------|--------|----------|
| Startup | <1s | Lazy loading, code splitting |
| Search latency | <20ms | Debouncing, fuzzy search |
| Interaction response | <16ms | Optimistic updates, GPU transforms |
| Animation FPS | 120fps | GPU-only properties, will-change |
| Memory (idle) | <200MB | Virtualization, image cache limits |
| Memory (playing) | <400MB | Audio buffer management |
| CPU (idle) | <1% | Efficient event loops |
| CPU (playing) | <5% | Optimized audio decoding |

---

## NEXT STEPS

1. Initialize Tauri project
2. Set up Rust audio engine
3. Create React component library
4. Implement motion system
5. Port existing features
6. Add new features
7. Optimize performance
8. Release v2.0

This roadmap transforms GTube into the definitive open-source desktop music player.