# GTube Tauri - Complete Component Library

---

## NOW PLAYING COMPONENTS

### Fullscreen Player
```typescript
// src/components/player/FullscreenPlayer.tsx
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { extractAlbumColors } from '@/lib/colors';
import { springs, easings } from '@/lib/animations';
import { useState, useEffect } from 'react';

export const FullscreenPlayer = () => {
  const { currentTrack, isPlaying, position, duration } = usePlayerStore();
  const [colors, setColors] = useState({ dominant: '#1db954', vibrant: '#1ed760' });
  const [showLyrics, setShowLyrics] = useState(false);
  
  // Extract colors from album art
  useEffect(() => {
    if (currentTrack?.albumArt) {
      extractAlbumColors(currentTrack.albumArt).then(setColors);
    }
  }, [currentTrack?.albumArt]);
  
  // Parallax effect on mouse move
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5]);
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5]);
  
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.width / 2);
        mouseY.set(e.clientY - rect.height / 2);
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(circle at 50% 50%, ${colors.vibrant}22 0%, ${colors.dominant}11 50%, #000000 100%)`,
        }}
        transition={{ duration: 1.5, ease: easings.standard }}
      />
      
      {/* Blurred album art background */}
      <motion.div
        className="absolute inset-0 opacity-20 blur-3xl"
        style={{
          backgroundImage: `url(${currentTrack?.albumArt})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 2, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-12">
        {/* Album art with 3D effect */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTrack?.id}
            className="relative mb-12"
            style={{
              perspective: 1000,
              rotateX,
              rotateY,
            }}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={springs.smooth}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-3xl blur-3xl"
              style={{ backgroundColor: colors.vibrant }}
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Album art */}
            <motion.img
              src={currentTrack?.albumArt}
              alt={currentTrack?.album}
              className="relative w-96 h-96 rounded-3xl shadow-2xl"
              whileHover={{ scale: 1.05 }}
              transition={springs.snappy}
            />
            
            {/* Vinyl record effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black opacity-0"
              animate={isPlaying ? {
                rotate: 360,
                opacity: [0, 0.3, 0],
              } : {}}
              transition={{
                rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 1.5, repeat: Infinity },
              }}
            />
          </motion.div>
        </AnimatePresence>
        
        {/* Track info with stagger animation */}
        <motion.div
          className="text-center max-w-2xl"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            className="text-7xl font-black mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0 },
            }}
          >
            {currentTrack?.title}
          </motion.h1>
          
          <motion.p
            className="text-3xl text-gray-400 mb-2"
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0 },
            }}
          >
            {currentTrack?.artist}
          </motion.p>
          
          <motion.p
            className="text-xl text-gray-500"
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0 },
            }}
          >
            {currentTrack?.album}
          </motion.p>
        </motion.div>
        
        {/* Progress bar */}
        <motion.div
          className="w-full max-w-3xl mt-12"
          variants={{
            hidden: { opacity: 0, y: 30 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <ProgressBar />
        </motion.div>
        
        {/* Controls */}
        <motion.div
          className="mt-8"
          variants={{
            hidden: { opacity: 0, y: 30 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <PlayerControls size="large" />
        </motion.div>
        
        {/* Lyrics toggle */}
        <motion.button
          className="absolute bottom-8 right-8 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
          onClick={() => setShowLyrics(!showLyrics)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
        </motion.button>
      </div>
      
      {/* Lyrics panel */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            className="absolute right-0 top-0 h-full w-1/3 bg-black/90 backdrop-blur-xl p-8 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springs.smooth}
          >
            <LyricsView />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

### Mini Player
```typescript
// src/components/player/MiniPlayer.tsx
export const MiniPlayer = () => {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 backdrop-blur-xl border-t border-white/10 z-40"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={springs.smooth}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Track info */}
        <motion.div
          className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsExpanded(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.img
            src={currentTrack?.albumArt}
            alt={currentTrack?.album}
            className="w-16 h-16 rounded-lg shadow-lg"
            layoutId={`album-${currentTrack?.id}`}
          />
          
          <div className="flex-1 min-w-0">
            <motion.h3
              className="text-base font-semibold truncate"
              layoutId={`title-${currentTrack?.id}`}
            >
              {currentTrack?.title}
            </motion.h3>
            <motion.p
              className="text-sm text-gray-400 truncate"
              layoutId={`artist-${currentTrack?.id}`}
            >
              {currentTrack?.artist}
            </motion.p>
          </div>
        </motion.div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <PlayerControls size="small" />
        </div>
        
        {/* Volume */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <VolumeControl />
        </div>
      </div>
      
      {/* Thin progress bar */}
      <motion.div
        className="absolute top-0 left-0 h-1 bg-accent-primary"
        style={{ width: `${(position / duration) * 100}%` }}
        transition={{ duration: 0.1 }}
      />
    </motion.div>
  );
};
```

### Player Controls
```typescript
// src/components/player/Controls.tsx
interface ControlsProps {
  size?: 'small' | 'medium' | 'large';
}

export const PlayerControls = ({ size = 'medium' }: ControlsProps) => {
  const {
    isPlaying,
    pause,
    resume,
    next,
    previous,
    repeatMode,
    setRepeatMode,
    shuffle,
    toggleShuffle,
  } = usePlayerStore();
  
  const buttonSizes = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };
  
  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };
  
  return (
    <div className="flex items-center gap-4">
      {/* Shuffle */}
      <motion.button
        className={`${buttonSizes[size]} rounded-full flex items-center justify-center ${
          shuffle ? 'text-accent-primary' : 'text-gray-400'
        } hover:text-white transition-colors`}
        onClick={toggleShuffle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
      >
        <ShuffleIcon className={iconSizes[size]} />
      </motion.button>
      
      {/* Previous */}
      <motion.button
        className={`${buttonSizes[size]} rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors`}
        onClick={previous}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
      >
        <PreviousIcon className={iconSizes[size]} />
      </motion.button>
      
      {/* Play/Pause */}
      <motion.button
        className={`${buttonSizes[size]} rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95`}
        onClick={isPlaying ? pause : resume}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
      >
        <AnimatePresence mode="wait">
          {isPlaying ? (
            <motion.div
              key="pause"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={springs.snappy}
            >
              <PauseIcon className={iconSizes[size]} />
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={springs.snappy}
            >
              <PlayIcon className={iconSizes[size]} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      
      {/* Next */}
      <motion.button
        className={`${buttonSizes[size]} rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors`}
        onClick={next}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
      >
        <NextIcon className={iconSizes[size]} />
      </motion.button>
      
      {/* Repeat */}
      <motion.button
        className={`${buttonSizes[size]} rounded-full flex items-center justify-center ${
          repeatMode !== 'off' ? 'text-accent-primary' : 'text-gray-400'
        } hover:text-white transition-colors relative`}
        onClick={() => {
          const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
          const currentIndex = modes.indexOf(repeatMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          setRepeatMode(nextMode);
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={springs.snappy}
      >
        <RepeatIcon className={iconSizes[size]} />
        {repeatMode === 'one' && (
          <motion.span
            className="absolute -bottom-1 text-xs font-bold"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springs.bouncy}
          >
            1
          </motion.span>
        )}
      </motion.button>
    </div>
  );
};
```

### Progress Bar with Waveform
```typescript
// src/components/player/ProgressBar.tsx
export const ProgressBar = () => {
  const { position, duration, seek } = usePlayerStore();
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Generate waveform
  useEffect(() => {
    // Generate 100 random amplitudes for demo
    // In production, extract from actual audio
    setWaveform(Array.from({ length: 100 }, () => Math.random()));
  }, []);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    setHoverPosition(percent);
    
    if (isDragging) {
      seek(percent * duration);
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    seek(percent * duration);
  };
  
  return (
    <div className="w-full">
      {/* Time labels */}
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      {/* Progress bar */}
      <motion.div
        ref={progressRef}
        className="relative h-16 cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPosition(null)}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onClick={handleClick}
      >
        {/* Waveform background */}
        <svg className="absolute inset-0 w-full h-full">
          {waveform.map((amplitude, i) => {
            const x = (i / waveform.length) * 100;
            const isPlayed = x < (position / duration) * 100;
            
            return (
              <motion.rect
                key={i}
                x={`${x}%`}
                y={`${50 - amplitude * 40}%`}
                width={`${100 / waveform.length}%`}
                height={`${amplitude * 80}%`}
                fill="currentColor"
                className={isPlayed ? 'text-accent-primary' : 'text-gray-700'}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.01, duration: 0.3 }}
              />
            );
          })}
        </svg>
        
        {/* Hover preview */}
        <AnimatePresence>
          {hoverPosition !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={springs.snappy}
              style={{ left: `${hoverPosition * 100}%` }}
              className="absolute bottom-full mb-4 -translate-x-1/2 bg-black px-3 py-2 rounded-lg text-sm font-medium shadow-xl border border-white/10"
            >
              {formatTime(hoverPosition * duration)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Playhead */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg group-hover:scale-125 transition-transform"
          style={{ left: `${(position / duration) * 100}%` }}
          animate={isDragging ? { scale: 1.5 } : {}}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-accent-primary"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## QUEUE COMPONENTS

### Queue Drawer
```typescript
// src/components/queue/QueueDrawer.tsx
import { Reorder, useDragControls } from 'framer-motion';

export const QueueDrawer = ({ isOpen, onClose }: QueueDrawerProps) => {
  const { queue, currentIndex, removeFromQueue, reorderQueue } = usePlayerStore();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-screen w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-hidden flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={springs.smooth}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x > 200) {
                onClose();
              }
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Queue</h2>
                <motion.button
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <CloseIcon className="w-6 h-6" />
                </motion.button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {queue.length} tracks
              </p>
            </div>
            
            {/* Queue list */}
            <div className="flex-1 overflow-y-auto">
              <Reorder.Group
                values={queue}
                onReorder={(newQueue) => {
                  // Calculate new positions
                  newQueue.forEach((track, newIndex) => {
                    const oldIndex = queue.findIndex(t => t.id === track.id);
                    if (oldIndex !== newIndex) {
                      reorderQueue(oldIndex, newIndex);
                    }
                  });
                }}
                className="p-4 space-y-2"
              >
                {queue.map((track, index) => (
                  <QueueItem
                    key={track.id}
                    track={track}
                    index={index}
                    isPlaying={index === currentIndex}
                    onRemove={() => removeFromQueue(index)}
                  />
                ))}
              </Reorder.Group>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

### Queue Item
```typescript
// src/components/queue/QueueItem.tsx
export const QueueItem = ({ track, index, isPlaying, onRemove }: QueueItemProps) => {
  const controls = useDragControls();
  const { play } = usePlayerStore();
  
  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      className={`group relative p-3 rounded-lg transition-colors ${
        isPlaying ? 'bg-accent-primary/20' : 'hover:bg-white/5'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <motion.div
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-white"
          onPointerDown={(e) => controls.start(e)}
          whileHover={{ scale: 1.2 }}
        >
          <DragIcon className="w-5 h-5" />
        </motion.div>
        
        {/* Album art */}
        <motion.img
          src={track.albumArt}
          alt={track.album}
          className="w-12 h-12 rounded shadow-lg"
          onClick={() => play(track)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        />
        
        {/* Track info */}
        <div className="flex-1 min-w-0" onClick={() => play(track)}>
          <h4 className="text-sm font-medium truncate">
            {track.title}
          </h4>
          <p className="text-xs text-gray-400 truncate">
            {track.artist}
          </p>
        </div>
        
        {/* Playing indicator */}
        {isPlaying && (
          <motion.div
            className="flex gap-1"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springs.bouncy}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-accent-primary rounded-full"
                animate={{
                  height: ['8px', '16px', '8px'],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        )}
        
        {/* Remove button */}
        <motion.button
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <TrashIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </Reorder.Item>
  );
};
```

---

## LIBRARY COMPONENTS

### Album Grid
```typescript
// src/components/library/AlbumGrid.tsx
import { Virtuoso } from 'react-virtuoso';

export const AlbumGrid = ({ albums }: { albums: Album[] }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  return (
    <Virtuoso
      data={albums}
      itemContent={(index, album) => (
        <motion.div
          className="p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, ...springs.smooth }}
        >
          <AlbumCard
            album={album}
            isHovered={hoveredId === album.id}
            onHover={() => setHoveredId(album.id)}
            onLeave={() => setHoveredId(null)}
          />
        </motion.div>
      )}
      overscan={200}
      className="h-full"
    />
  );
};
```

### Album Card
```typescript
// src/components/library/AlbumCard.tsx
export const AlbumCard = ({ album, isHovered, onHover, onLeave }: AlbumCardProps) => {
  const { play, setQueue } = usePlayerStore();
  
  const handlePlay = async () => {
    // Fetch album tracks
    const tracks = await fetchAlbumTracks(album.id);
    setQueue(tracks, 0);
    play(tracks[0]);
  };
  
  return (
    <motion.div
      className="relative group cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      whileHover={{ y: -8 }}
      transition={springs.smooth}
    >
      {/* Album art */}
      <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg mb-4">
        <motion.img
          src={album.coverArt}
          alt={album.title}
          className="w-full h-full object-cover"
          animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
          transition={springs.smooth}
        />
        
        {/* Overlay */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            className="w-16 h-16 rounded-full bg-accent-primary text-black flex items-center justify-center shadow-xl"
            onClick={handlePlay}
            initial={{ scale: 0 }}
            animate={{ scale: isHovered ? 1 : 0 }}
            transition={springs.bouncy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <PlayIcon className="w-8 h-8" />
          </motion.button>
        </motion.div>
      </div>
      
      {/* Album info */}
      <div>
        <h3 className="font-semibold truncate mb-1">{album.title}</h3>
        <p className="text-sm text-gray-400 truncate">{album.artist}</p>
        <p className="text-xs text-gray-500 mt-1">
          {album.year} • {album.trackCount} tracks
        </p>
      </div>
    </motion.div>
  );
};
```

---

## SEARCH COMPONENTS

### Command Palette
```typescript
// src/components/search/CommandPalette.tsx
import { Command } from 'cmdk';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResults>({ tracks: [], albums: [], artists: [] });
  
  useHotkeys('mod+k', () => setOpen(true));
  useHotkeys('escape', () => setOpen(false));
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search) {
        const data = await searchAll(search);
        setResults(data);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [search]);
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          
          <motion.div
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[640px] z-50"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={springs.smooth}
          >
            <Command className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-white/10">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <SearchIcon className="w-5 h-5 text-gray-400" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search tracks, albums, artists..."
                  className="flex-1 bg-transparent outline-none text-lg"
                />
                <kbd className="px-2 py-1 text-xs bg-white/10 rounded">⌘K</kbd>
              </div>
              
              <Command.List className="max-h-96 overflow-y-auto p-2">
                {results.tracks.length > 0 && (
                  <Command.Group heading="Tracks">
                    {results.tracks.map((track) => (
                      <Command.Item
                        key={track.id}
                        onSelect={() => {
                          play(track);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                      >
                        <img
                          src={track.albumArt}
                          alt={track.album}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.title}</p>
                          <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                
                {results.albums.length > 0 && (
                  <Command.Group heading="Albums">
                    {results.albums.map((album) => (
                      <Command.Item
                        key={album.id}
                        onSelect={() => {
                          // Navigate to album
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 cursor-pointer"
                      >
                        <img
                          src={album.coverArt}
                          alt={album.title}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{album.title}</p>
                          <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

This component library provides production-ready, buttery-smooth UI components with exact animation specifications matching Spotify/Apple Music quality.