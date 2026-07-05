# Pull Request: Player Enhancements - Repeat, Shuffle & Queue Management

## 🎯 Fixes Issue
Closes #1 - "player issue"

## 📋 Summary
This PR implements comprehensive player enhancements to transform GTube into a state-of-the-art music player. Adds essential features that were missing: repeat modes, shuffle functionality, and advanced queue management.

## ✨ Features Implemented

### 1. **Repeat Modes** 🔁
- **None**: Play queue once and stop
- **One**: Repeat current track indefinitely  
- **All**: Loop entire queue continuously
- Cycle through modes with repeat button
- Visual feedback with highlighted button states
- Icon changes: repeat-all vs repeat-one

### 2. **Shuffle** 🔀
- Randomize queue order while preserving current track
- Toggle on/off with shuffle button
- Maintains original queue order for restoration
- Visual feedback with active button state
- Smart handling: current track stays at position 0 when shuffled

### 3. **Enhanced Queue Management** 📝
- **Add to Queue**: Append tracks to end
- **Play Next**: Insert after current track
- **Remove**: Delete individual tracks with trash button
- **Clear All**: Empty entire queue with one click
- **Reorder**: Foundation for drag-and-drop (future enhancement)
- Real-time UI updates via `queue-changed` signal

### 4. **Improved Playback Context** 🎵
- **Home Page**: Uses section context as queue (not just single track)
- **Search Results**: All search results become queue for continuous play
- **Better Flow**: Natural progression through related content

### 5. **UI/UX Enhancements** 🎨
- Shuffle and repeat buttons in mini player bar
- Shuffle and repeat controls in full player view
- Active state styling (highlighted when enabled)
- Remove buttons on each queue item
- Clear queue button in queue view header
- Consistent button styling across all views

## 🔧 Technical Changes

### Backend (`backend/player.py`)
**New Properties:**
- `_repeat_mode`: "none" | "one" | "all"
- `_shuffle_enabled`: boolean
- `_original_queue`: Preserves unshuffled order

**New Methods:**
- `set_repeat_mode(mode)` / `get_repeat_mode()` / `cycle_repeat_mode()`
- `set_shuffle(enabled)` / `toggle_shuffle()`
- `add_to_queue(track)` - Append to end
- `play_next(track)` - Insert after current
- `remove_from_queue(index)` - Delete track
- `reorder_queue(old_idx, new_idx)` - Move track
- Enhanced `clear_queue()` - Clears both queues

**New Signals:**
- `repeat-mode-changed(mode: str)`
- `shuffle-changed(enabled: bool)`
- `queue-changed()`

**Enhanced Logic:**
- `_on_track_ended()` now respects repeat modes
- Shuffle preserves current track position
- Queue operations emit signals for UI sync

### UI Components

**`ui/now_playing_bar.py`** (+42 lines)
- Added shuffle button (left of prev)
- Added repeat button (right of next)
- Signal handlers for mode changes
- Button state update methods
- Active class toggling

**`ui/now_playing_full.py`** (+36 lines)
- Added shuffle and repeat controls
- Signal connections for state sync
- Button update methods matching mini player

**`ui/queue_view.py`** (+33 lines)
- Added remove button to each `QueueRow`
- Added "Clear" button in header
- Connected to `queue-changed` signal
- Remove track handler

**`ui/home_page.py`** (+16 lines)
- Store sections data for queue building
- Build queue from section context
- Find which section contains clicked item

**`ui/search_page.py`** (+8 lines)
- Store current song results
- Use all results as queue context

**`gtube.css`** (+4 lines)
- `.control-btn.active` styling
- Highlighted background and accent color

## 📊 Code Statistics
```
7 files changed, 274 insertions(+), 8 deletions(-)

backend/player.py      | +143 lines
gtube.css              | +4 lines
ui/home_page.py        | +16 lines
ui/now_playing_bar.py  | +42 lines
ui/now_playing_full.py | +36 lines
ui/queue_view.py       | +33 lines
ui/search_page.py      | +8 lines
```

## 🧪 Testing Checklist
- [x] Repeat None: Queue plays once and stops
- [x] Repeat One: Current track loops indefinitely
- [x] Repeat All: Queue loops back to start
- [x] Shuffle: Queue randomizes, current track preserved
- [x] Shuffle toggle: Restores original order
- [x] Add to queue: Track appends to end
- [x] Remove from queue: Track deleted, playback continues
- [x] Clear queue: All tracks removed
- [x] Home page: Section context used as queue
- [x] Search page: Results used as queue
- [x] Button states: Visual feedback for active modes
- [x] Signal propagation: UI updates on state changes

## 🎬 User Experience Flow

### Before
1. Click track → plays single track → stops
2. No repeat options
3. No shuffle
4. Can't manage queue
5. Limited playback context

### After
1. Click track → plays with full context queue
2. Toggle repeat: none → one → all
3. Toggle shuffle for variety
4. Remove unwanted tracks
5. Clear queue anytime
6. Visual feedback for all actions
7. Continuous playback experience

## 🚀 Future Enhancements
- [ ] Drag-and-drop queue reordering
- [ ] Keyboard shortcuts (Space, Ctrl+R, Ctrl+S)
- [ ] State persistence (save repeat/shuffle preferences)
- [ ] Auto-queue generation (radio mode)
- [ ] Context menu (right-click options)
- [ ] Playback speed control
- [ ] Crossfade between tracks

## 📸 Visual Changes
- Shuffle button: `media-playlist-shuffle-symbolic`
- Repeat button: `media-playlist-repeat-symbolic` / `media-playlist-repeat-song-symbolic`
- Active state: Highlighted with accent color background
- Remove button: `user-trash-symbolic` on each queue row
- Clear button: Text button in queue header

## ⚠️ Breaking Changes
None - All changes are additive and backward compatible.

## 🔍 Review Notes
- All type errors from linter are expected (gi.repository not in type stubs)
- Shuffle algorithm preserves current track at index 0
- Queue operations are thread-safe via GLib.idle_add
- Signal-based architecture ensures UI consistency
- CSS active class works with GTK4 style system

## 📝 Commit Message
```
feat: Add comprehensive player enhancements

Implements repeat modes, shuffle, and enhanced queue management to address issue #1.

Fixes #1