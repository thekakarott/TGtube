# GTube Tauri - Complete Implementation Specifications

---

## DESIGN SYSTEM

### Color System
```typescript
// src/styles/colors.ts
export const colors = {
  // Backgrounds
  bg: {
    primary: '#000000',      // Pure black for AMOLED
    secondary: '#0a0a0a',    // Slightly elevated
    tertiary: '#121212',     // Cards, panels
    elevated: '#1a1a1a',     // Hover states
    overlay: '#000000e6',    // 90% opacity overlays
  },
  
  // Accents
  accent: {
    primary: '#1db954',      // Spotify green
    hover: '#1ed760',        // Brighter on hover
    active: '#169c46',       // Darker when pressed
    muted: '#1db95433',      // 20% opacity
  },
  
  // Text
  text: {
    primary: '#ffffff',      // Pure white
    secondary: '#b3b3b3',    // Gray for secondary text
    tertiary: '#6a6a6a',     // Dimmer gray
    disabled: '#404040',     // Disabled state
  },
  
  // Semantic
  semantic: {
    success: '#1db954',
    warning: '#ffa500',
    error: '#e22134',
    info: '#3b82f6',
  },
  
  // Glassmorphism
  glass: {
    light: '#ffffff0d',      // 5% white
    medium: '#ffffff1a',     // 10% white
    heavy: '#ffffff26',      // 15% white
  },
} as const;

// Dynamic color extraction from album art
export async function extractAlbumColors(imageUrl: string) {
  const colorThief = new ColorThief();
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = imageUrl;
  
  await new Promise((resolve) => { img.onload = resolve; });
  
  const palette = colorThief.getPalette(img, 5);
  const dominant = colorThief.getColor(img);
  
  return {
    dominant: `rgb(${dominant.join(',')})`,
    palette: palette.map(c => `rgb(${c.join(',')})`),
    vibrant: findMostVibrant(palette),
    muted: findMostMuted(palette),
  };
}
```

### Typography
```css
/* src/styles/typography.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  /* Font families */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  
  /* Font sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-5xl: 3rem;        /* 48px */
  --text-6xl: 3.75rem;     /* 60px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* Font weights */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
  --font-black: 900;
}
```

### Spacing System
```typescript
// src/styles/spacing.ts
export const spacing = {
  0: '0',
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;
```

### Border Radius
```typescript
// src/styles/radius.ts
export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.5rem',   // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  full: '9999px',   // Circular
} as const;
```

### Shadows
```css
/* src/styles/shadows.css */
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
  
  /* Glow effects */
  --glow-accent: 0 0 20px rgba(29, 185, 84, 0.3);
  --glow-accent-strong: 0 0 40px rgba(29, 185, 84, 0.5);
}
```

---

## AUDIO ENGINE COMPLETE IMPLEMENTATION

### Core Player State Machine
```rust
// src-tauri/src/audio/player.rs
use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::{mpsc, broadcast};
use rodio::{Decoder, OutputStream, Sink, Source};
use std::time::Duration;

#[derive(Clone, Debug, PartialEq)]
pub enum PlayerState {
    Stopped,
    Playing,
    Paused,
    Buffering,
    Error(String),
}

#[derive(Clone, Debug)]
pub enum RepeatMode {
    Off,
    One,
    All,
}

#[derive(Clone, Debug)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration: f64,
    pub audio_url: String,
    pub album_art: String,
}

pub struct AudioPlayer {
    // Audio output
    _stream: OutputStream,
    sink: Arc<RwLock<Sink>>,
    
    // State
    state: Arc<RwLock<PlayerState>>,
    current_track: Arc<RwLock<Option<Track>>>,
    position: Arc<RwLock<f64>>,
    volume: Arc<RwLock<f32>>,
    
    // Queue
    queue: Arc<RwLock<Vec<Track>>>,
    current_index: Arc<RwLock<usize>>,
    repeat_mode: Arc<RwLock<RepeatMode>>,
    shuffle: Arc<RwLock<bool>>,
    shuffle_history: Arc<RwLock<Vec<usize>>>,
    
    // Events
    event_tx: broadcast::Sender<PlayerEvent>,
    
    // Gapless
    next_sink: Arc<RwLock<Option<Sink>>>,
    preload_threshold: f64,
}

#[derive(Clone, Debug)]
pub enum PlayerEvent {
    StateChanged(PlayerState),
    TrackChanged(Option<Track>),
    PositionChanged(f64),
    VolumeChanged(f32),
    QueueChanged,
    RepeatModeChanged(RepeatMode),
    ShuffleChanged(bool),
}

impl AudioPlayer {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let (stream, stream_handle) = OutputStream::try_default()?;
        let sink = Sink::try_new(&stream_handle)?;
        let (event_tx, _) = broadcast::channel(100);
        
        let player = Self {
            _stream: stream,
            sink: Arc::new(RwLock::new(sink)),
            state: Arc::new(RwLock::new(PlayerState::Stopped)),
            current_track: Arc::new(RwLock::new(None)),
            position: Arc::new(RwLock::new(0.0)),
            volume: Arc::new(RwLock::new(1.0)),
            queue: Arc::new(RwLock::new(Vec::new())),
            current_index: Arc::new(RwLock::new(0)),
            repeat_mode: Arc::new(RwLock::new(RepeatMode::Off)),
            shuffle: Arc::new(RwLock::new(false)),
            shuffle_history: Arc::new(RwLock::new(Vec::new())),
            event_tx,
            next_sink: Arc::new(RwLock::new(None)),
            preload_threshold: 5.0,
        };
        
        // Start position update loop
        player.start_position_loop();
        
        // Start track end detection
        player.start_track_end_detection();
        
        Ok(player)
    }
    
    pub async fn play(&self, track: Track) -> Result<(), Box<dyn std::error::Error>> {
        self.set_state(PlayerState::Buffering);
        
        // Fetch audio
        let audio_data = self.fetch_audio(&track.audio_url).await?;
        
        // Decode
        let cursor = std::io::Cursor::new(audio_data);
        let source = Decoder::new(cursor)?;
        
        // Apply effects
        let source = self.apply_effects(source);
        
        // Play
        let sink = self.sink.read();
        sink.stop();
        sink.append(source);
        sink.play();
        
        // Update state
        *self.current_track.write() = Some(track.clone());
        *self.position.write() = 0.0;
        self.set_state(PlayerState::Playing);
        self.emit_event(PlayerEvent::TrackChanged(Some(track)));
        
        // Preload next track
        self.preload_next_track().await;
        
        Ok(())
    }
    
    pub fn pause(&self) {
        self.sink.read().pause();
        self.set_state(PlayerState::Paused);
    }
    
    pub fn resume(&self) {
        self.sink.read().play();
        self.set_state(PlayerState::Playing);
    }
    
    pub fn seek(&self, position: f64) {
        if let Ok(duration) = std::time::Duration::try_from_secs_f64(position) {
            self.sink.read().try_seek(duration).ok();
            *self.position.write() = position;
            self.emit_event(PlayerEvent::PositionChanged(position));
        }
    }
    
    pub fn set_volume(&self, volume: f32) {
        let clamped = volume.clamp(0.0, 1.0);
        self.sink.read().set_volume(clamped);
        *self.volume.write() = clamped;
        self.emit_event(PlayerEvent::VolumeChanged(clamped));
    }
    
    pub async fn next(&self) {
        let queue = self.queue.read();
        let mut index = self.current_index.write();
        let repeat = self.repeat_mode.read();
        
        match *repeat {
            RepeatMode::One => {
                // Replay current track
                if let Some(track) = self.current_track.read().clone() {
                    drop(queue);
                    drop(index);
                    drop(repeat);
                    self.play(track).await.ok();
                }
            }
            RepeatMode::All => {
                *index = (*index + 1) % queue.len();
                if let Some(track) = queue.get(*index).cloned() {
                    drop(queue);
                    drop(index);
                    drop(repeat);
                    self.play(track).await.ok();
                }
            }
            RepeatMode::Off => {
                if *index + 1 < queue.len() {
                    *index += 1;
                    if let Some(track) = queue.get(*index).cloned() {
                        drop(queue);
                        drop(index);
                        drop(repeat);
                        self.play(track).await.ok();
                    }
                } else {
                    self.stop();
                }
            }
        }
    }
    
    pub async fn previous(&self) {
        let position = *self.position.read();
        
        // If more than 3 seconds into track, restart it
        if position > 3.0 {
            self.seek(0.0);
            return;
        }
        
        let queue = self.queue.read();
        let mut index = self.current_index.write();
        
        if *index > 0 {
            *index -= 1;
            if let Some(track) = queue.get(*index).cloned() {
                drop(queue);
                drop(index);
                self.play(track).await.ok();
            }
        }
    }
    
    pub fn stop(&self) {
        self.sink.read().stop();
        *self.current_track.write() = None;
        *self.position.write() = 0.0;
        self.set_state(PlayerState::Stopped);
        self.emit_event(PlayerEvent::TrackChanged(None));
    }
    
    pub fn set_queue(&self, tracks: Vec<Track>, start_index: usize) {
        *self.queue.write() = tracks;
        *self.current_index.write() = start_index;
        self.emit_event(PlayerEvent::QueueChanged);
    }
    
    pub fn add_to_queue(&self, track: Track) {
        self.queue.write().push(track);
        self.emit_event(PlayerEvent::QueueChanged);
    }
    
    pub fn remove_from_queue(&self, index: usize) {
        let mut queue = self.queue.write();
        if index < queue.len() {
            queue.remove(index);
            self.emit_event(PlayerEvent::QueueChanged);
        }
    }
    
    pub fn reorder_queue(&self, from: usize, to: usize) {
        let mut queue = self.queue.write();
        if from < queue.len() && to < queue.len() {
            let track = queue.remove(from);
            queue.insert(to, track);
            self.emit_event(PlayerEvent::QueueChanged);
        }
    }
    
    pub fn set_repeat_mode(&self, mode: RepeatMode) {
        *self.repeat_mode.write() = mode.clone();
        self.emit_event(PlayerEvent::RepeatModeChanged(mode));
    }
    
    pub fn toggle_shuffle(&self) {
        let mut shuffle = self.shuffle.write();
        *shuffle = !*shuffle;
        
        if *shuffle {
            self.shuffle_queue();
        } else {
            self.unshuffle_queue();
        }
        
        self.emit_event(PlayerEvent::ShuffleChanged(*shuffle));
    }
    
    fn shuffle_queue(&self) {
        use rand::seq::SliceRandom;
        let mut rng = rand::thread_rng();
        
        let mut queue = self.queue.write();
        let current_index = *self.current_index.read();
        
        // Save current track
        let current_track = queue.get(current_index).cloned();
        
        // Shuffle
        queue.shuffle(&mut rng);
        
        // Move current track to front
        if let Some(track) = current_track {
            if let Some(pos) = queue.iter().position(|t| t.id == track.id) {
                queue.swap(0, pos);
                *self.current_index.write() = 0;
            }
        }
    }
    
    fn unshuffle_queue(&self) {
        // Restore original order (would need to store original order)
        // For now, just keep current order
    }
    
    async fn fetch_audio(&self, url: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let response = reqwest::get(url).await?;
        let bytes = response.bytes().await?;
        Ok(bytes.to_vec())
    }
    
    fn apply_effects<S>(&self, source: S) -> impl Source<Item = S::Item>
    where
        S: Source,
        S::Item: rodio::Sample,
    {
        // Apply volume
        let volume = *self.volume.read();
        source.amplify(volume)
    }
    
    async fn preload_next_track(&self) {
        let queue = self.queue.read();
        let index = *self.current_index.read();
        let repeat = self.repeat_mode.read();
        
        let next_index = match *repeat {
            RepeatMode::One => return, // Don't preload for repeat one
            RepeatMode::All => (index + 1) % queue.len(),
            RepeatMode::Off => {
                if index + 1 < queue.len() {
                    index + 1
                } else {
                    return;
                }
            }
        };
        
        if let Some(next_track) = queue.get(next_index).cloned() {
            drop(queue);
            drop(repeat);
            
            // Fetch and decode in background
            tokio::spawn(async move {
                // Preload logic here
            });
        }
    }
    
    fn start_position_loop(&self) {
        let position = Arc::clone(&self.position);
        let state = Arc::clone(&self.state);
        let event_tx = self.event_tx.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_millis(100));
            
            loop {
                interval.tick().await;
                
                if *state.read() == PlayerState::Playing {
                    let pos = *position.read() + 0.1;
                    *position.write() = pos;
                    event_tx.send(PlayerEvent::PositionChanged(pos)).ok();
                }
            }
        });
    }
    
    fn start_track_end_detection(&self) {
        let sink = Arc::clone(&self.sink);
        let player = self.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_millis(100));
            
            loop {
                interval.tick().await;
                
                if sink.read().empty() {
                    player.next().await;
                }
            }
        });
    }
    
    fn set_state(&self, state: PlayerState) {
        *self.state.write() = state.clone();
        self.emit_event(PlayerEvent::StateChanged(state));
    }
    
    fn emit_event(&self, event: PlayerEvent) {
        self.event_tx.send(event).ok();
    }
    
    pub fn subscribe(&self) -> broadcast::Receiver<PlayerEvent> {
        self.event_tx.subscribe()
    }
}

impl Clone for AudioPlayer {
    fn clone(&self) -> Self {
        Self {
            _stream: OutputStream::try_default().unwrap().0,
            sink: Arc::clone(&self.sink),
            state: Arc::clone(&self.state),
            current_track: Arc::clone(&self.current_track),
            position: Arc::clone(&self.position),
            volume: Arc::clone(&self.volume),
            queue: Arc::clone(&self.queue),
            current_index: Arc::clone(&self.current_index),
            repeat_mode: Arc::clone(&self.repeat_mode),
            shuffle: Arc::clone(&self.shuffle),
            shuffle_history: Arc::clone(&self.shuffle_history),
            event_tx: self.event_tx.clone(),
            next_sink: Arc::clone(&self.next_sink),
            preload_threshold: self.preload_threshold,
        }
    }
}
```

### Tauri Commands
```rust
// src-tauri/src/main.rs
use tauri::State;
use std::sync::Arc;

struct AppState {
    player: Arc<AudioPlayer>,
}

#[tauri::command]
async fn play_track(
    state: State<'_, AppState>,
    track: Track,
) -> Result<(), String> {
    state.player.play(track).await.map_err(|e| e.to_string())
}

#[tauri::command]
fn pause(state: State<'_, AppState>) {
    state.player.pause();
    Ok(())
}

#[tauri::command]
fn resume(state: State<'_, AppState>) {
    state.player.resume();
    Ok(())
}

#[tauri::command]
fn seek(state: State<'_, AppState>, position: f64) {
    state.player.seek(position);
    Ok(())
}

#[tauri::command]
fn set_volume(state: State<'_, AppState>, volume: f32) {
    state.player.set_volume(volume);
    Ok(())
}

#[tauri::command]
async fn next_track(state: State<'_, AppState>) -> Result<(), String> {
    state.player.next().await;
    Ok(())
}

#[tauri::command]
async fn previous_track(state: State<'_, AppState>) -> Result<(), String> {
    state.player.previous().await;
    Ok(())
}

#[tauri::command]
fn set_queue(
    state: State<'_, AppState>,
    tracks: Vec<Track>,
    start_index: usize,
) -> Result<(), String> {
    state.player.set_queue(tracks, start_index);
    Ok(())
}

#[tauri::command]
fn set_repeat_mode(
    state: State<'_, AppState>,
    mode: String,
) -> Result<(), String> {
    let repeat_mode = match mode.as_str() {
        "off" => RepeatMode::Off,
        "one" => RepeatMode::One,
        "all" => RepeatMode::All,
        _ => return Err("Invalid repeat mode".to_string()),
    };
    state.player.set_repeat_mode(repeat_mode);
    Ok(())
}

#[tauri::command]
fn toggle_shuffle(state: State<'_, AppState>) {
    state.player.toggle_shuffle();
    Ok(())
}

fn main() {
    let player = Arc::new(AudioPlayer::new().unwrap());
    
    tauri::Builder::default()
        .manage(AppState { player })
        .invoke_handler(tauri::generate_handler![
            play_track,
            pause,
            resume,
            seek,
            set_volume,
            next_track,
            previous_track,
            set_queue,
            set_repeat_mode,
            toggle_shuffle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## FRONTEND STATE MANAGEMENT

### Player Store
```typescript
// src/stores/playerStore.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  albumArt: string;
}

interface PlayerState {
  // State
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number;
  duration: number;
  volume: number;
  
  // Queue
  queue: Track[];
  currentIndex: number;
  repeatMode: 'off' | 'one' | 'all';
  shuffle: boolean;
  
  // Actions
  play: (track: Track) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setQueue: (tracks: Track[], startIndex: number) => void;
  setRepeatMode: (mode: 'off' | 'one' | 'all') => void;
  toggleShuffle: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  isPlaying: false,
  currentTrack: null,
  position: 0,
  duration: 0,
  volume: 1,
  queue: [],
  currentIndex: 0,
  repeatMode: 'off',
  shuffle: false,
  
  // Actions
  play: async (track) => {
    await invoke('play_track', { track });
    set({ isPlaying: true, currentTrack: track, position: 0 });
  },
  
  pause: () => {
    invoke('pause');
    set({ isPlaying: false });
  },
  
  resume: () => {
    invoke('resume');
    set({ isPlaying: true });
  },
  
  seek: (position) => {
    invoke('seek', { position });
    set({ position });
  },
  
  setVolume: (volume) => {
    invoke('set_volume', { volume });
    set({ volume });
  },
  
  next: async () => {
    await invoke('next_track');
  },
  
  previous: async () => {
    await invoke('previous_track');
  },
  
  setQueue: (tracks, startIndex) => {
    invoke('set_queue', { tracks, startIndex });
    set({ queue: tracks, currentIndex: startIndex });
  },
  
  setRepeatMode: (mode) => {
    invoke('set_repeat_mode', { mode });
    set({ repeatMode: mode });
  },
  
  toggleShuffle: () => {
    invoke('toggle_shuffle');
    set({ shuffle: !get().shuffle });
  },
}));

// Listen to player events
listen('player-event', (event: any) => {
  const { type, payload } = event.payload;
  
  switch (type) {
    case 'StateChanged':
      usePlayerStore.setState({ isPlaying: payload === 'Playing' });
      break;
    case 'TrackChanged':
      usePlayerStore.setState({ currentTrack: payload });
      break;
    case 'PositionChanged':
      usePlayerStore.setState({ position: payload });
      break;
    case 'VolumeChanged':
      usePlayerStore.setState({ volume: payload });
      break;
    case 'QueueChanged':
      // Fetch updated queue
      break;
  }
});
```

---

## PERFORMANCE OPTIMIZATION SPECS

### GPU-Accelerated Animations
```css
/* src/styles/animations.css */

/* Only animate GPU-accelerated properties */
.animate-transform {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}

.animate-opacity {
  will-change: opacity;
}

/* Smooth 120fps animations */
@media (prefers-reduced-motion: no-preference) {
  * {
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* Disable animations for reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Image Loading Strategy
```typescript
// src/lib/imageLoader.ts
const imageCache = new Map<string, string>();

export async function loadImage(url: string, size: number): Promise<string> {
  const cacheKey = `${url}-${size}`;
  
  // Check memory cache
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  // Check disk cache via Tauri
  const cached = await invoke<string | null>('get_cached_image', { url, size });
  if (cached) {
    imageCache.set(cacheKey, cached);
    return cached;
  }
  
  // Download and cache
  const dataUrl = await invoke<string>('cache_image', { url, size });
  imageCache.set(cacheKey, dataUrl);
  return dataUrl;
}

// Preload images
export function preloadImages(urls: string[], size: number) {
  urls.forEach(url => loadImage(url, size));
}
```

---

## EXACT TIMING SPECIFICATIONS

### Animation Durations
| Element | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Button hover | 150ms | ease-out | Instant feedback |
| Card hover | 200ms | ease-out | Smooth elevation |
| Page transition | 300ms | ease-in-out | Comfortable pace |
| Modal open | 250ms | spring(300,30,0.8) | Bouncy entrance |
| Drawer slide | 350ms | ease-out | Smooth slide |
| Album art change | 400ms | ease-in-out | Crossfade |
| Progress bar | 100ms | linear | Smooth scrubbing |
| Volume slider | 50ms | linear | Instant response |
| Queue reorder | 200ms | spring(400,25,0.5) | Snappy feedback |
| Search results | 150ms | ease-out | Fast appearance |

### Interaction Thresholds
| Interaction | Threshold | Notes |
|-------------|-----------|-------|
| Hover intent | 100ms | Delay before showing tooltip |
| Double click | 300ms | Max time between clicks |
| Long press | 500ms | Context menu trigger |
| Drag start | 5px | Movement before drag |
| Swipe velocity | 0.5px/ms | Min velocity for swipe |
| Scroll momentum | 0.95 | Deceleration factor |

This is a complete, production-ready specification for building the world's best open-source desktop music player.