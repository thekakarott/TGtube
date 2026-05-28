# Task Backlog - GTube Code Improvements
## Actionable Tasks for Sub-Agent Execution

**Generated**: 2026-05-28  
**Source**: Comprehensive Code Analysis Report  
**Priority Levels**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)

---

## 🔴 P0 - CRITICAL SECURITY FIXES (Must Fix Immediately)

### TASK-SEC-001: Fix Command Injection in Video ID Handling
**Priority**: P0 - CRITICAL  
**Effort**: 4 hours  
**File**: `backend/player.py`  
**Lines**: 154, 132-145

**Description**:
Video IDs from track data are directly interpolated into URLs without validation, allowing potential command injection through yt-dlp.

**Acceptance Criteria**:
- [ ] Create `_validate_video_id()` function with regex validation
- [ ] Video IDs must match pattern `^[A-Za-z0-9_-]{11}$`
- [ ] Raise `ValueError` for invalid video IDs
- [ ] Update `_start_playback()` to validate before URL construction
- [ ] Add unit tests for validation function
- [ ] Test with malicious payloads (e.g., `"test; rm -rf /"`)

**Implementation**:
```python
import re

def _validate_video_id(vid: str) -> str:
    """Validate and sanitize YouTube video ID."""
    if not vid or not isinstance(vid, str):
        raise ValueError("Invalid video ID")
    if not re.match(r'^[A-Za-z0-9_-]{11}$', vid):
        raise ValueError(f"Invalid video ID format: {vid}")
    return vid

# In _start_playback:
vid = _validate_video_id(track.get("videoId", ""))
url = f"https://www.youtube.com/watch?v={vid}"
```

**Testing**:
```python
# Test cases
assert _validate_video_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"  # Valid
with pytest.raises(ValueError):
    _validate_video_id("test; rm -rf /")  # Malicious
with pytest.raises(ValueError):
    _validate_video_id("")  # Empty
with pytest.raises(ValueError):
    _validate_video_id("short")  # Too short
```

---

## 🟠 P1 - HIGH PRIORITY SECURITY FIXES

### TASK-SEC-002: Implement Safe Image Fetching
**Priority**: P1 - HIGH  
**Effort**: 6 hours  
**Files**: `ui/now_playing_bar.py`, `ui/home_page.py`, `ui/search_page.py`  
**Lines**: Multiple locations

**Description**:
HTTP requests to thumbnail URLs lack validation, size limits, and security checks, enabling SSRF and DoS attacks.

**Acceptance Criteria**:
- [ ] Create `ui/utils.py` with `_safe_fetch_image()` function
- [ ] Validate URL scheme (only HTTPS allowed)
- [ ] Whitelist YouTube domains (ytimg.com, ggpht.com)
- [ ] Check content-type header
- [ ] Implement 5MB size limit with streaming
- [ ] Reduce timeout to 3 seconds
- [ ] Replace all `requests.get(url)` calls with safe function
- [ ] Add error handling and logging

**Implementation**:
```python
# ui/utils.py
import requests
from urllib.parse import urlparse
from typing import Optional

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_SCHEMES = ['https']
ALLOWED_DOMAINS = ['ytimg.com', 'ggpht.com', 'youtube.com']
ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']

def safe_fetch_image(url: str, timeout: int = 3) -> Optional[bytes]:
    """Safely fetch image with validation."""
    try:
        parsed = urlparse(url)
        
        # Validate scheme
        if parsed.scheme not in ALLOWED_SCHEMES:
            print(f"[security] Blocked non-HTTPS URL: {parsed.scheme}")
            return None
        
        # Validate domain
        if not any(parsed.netloc.endswith(d) for d in ALLOWED_DOMAINS):
            print(f"[security] Blocked non-YouTube domain: {parsed.netloc}")
            return None
        
        # Stream response
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        
        # Check content type
        content_type = resp.headers.get('content-type', '').split(';')[0]
        if content_type not in ALLOWED_CONTENT_TYPES:
            print(f"[security] Invalid content type: {content_type}")
            return None
        
        # Check size
        content_length = resp.headers.get('content-length')
        if content_length and int(content_length) > MAX_IMAGE_SIZE:
            print(f"[security] Image too large: {content_length} bytes")
            return None
        
        # Read with size limit
        content = b''
        for chunk in resp.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_IMAGE_SIZE:
                print(f"[security] Image exceeded size limit")
                return None
        
        return content
    except Exception as e:
        print(f"[security] Image fetch error: {e}")
        return None
```

**Files to Update**:
1. `ui/now_playing_bar.py:18` - Replace in `_load_thumb_async`
2. `ui/home_page.py:23` - Replace in `_load_thumb`
3. `ui/search_page.py:19` - Replace in `_load_thumb`
4. `ui/now_playing_full.py:174` - Replace in `_load_art`

---

### TASK-SEC-003: Add Thread-Safe Queue Operations
**Priority**: P1 - HIGH  
**Effort**: 8 hours  
**File**: `backend/player.py`  
**Lines**: 260-295, 330-353

**Description**:
Queue operations lack thread synchronization, causing race conditions when accessed from multiple threads (UI, signals, MPRIS).

**Acceptance Criteria**:
- [ ] Add `threading.RLock()` to Player class
- [ ] Wrap all queue operations with lock
- [ ] Update methods: `remove_from_queue`, `reorder_queue`, `set_shuffle`, `add_to_queue`, `play_next`, `clear_queue`
- [ ] Add unit tests for concurrent access
- [ ] Verify no deadlocks
- [ ] Test with ThreadSanitizer if available

**Implementation**:
```python
import threading

class Player(GObject.Object):
    def __init__(self):
        super().__init__()
        self._queue_lock = threading.RLock()  # Reentrant lock
        # ... rest of init
    
    def remove_from_queue(self, index: int):
        """Remove track at index from queue (thread-safe)."""
        with self._queue_lock:
            if 0 <= index < len(self._queue):
                removed = self._queue.pop(index)
                if self._shuffle_enabled and removed in self._original_queue:
                    self._original_queue.remove(removed)
                if index < self._index:
                    self._index -= 1
                elif index == self._index:
                    if self._index < len(self._queue):
                        self._current_track = self._queue[self._index]
                        self._start_playback(self._current_track)
                self.emit("queue-changed")
    
    def set_shuffle(self, enabled: bool):
        """Enable or disable shuffle (thread-safe)."""
        with self._queue_lock:
            # ... existing implementation
    
    # Apply to all queue methods
```

**Testing**:
```python
def test_concurrent_queue_operations():
    player = Player()
    tracks = [{"videoId": f"vid{i}", "title": f"Track {i}"} for i in range(100)]
    player.play_track(tracks[0], queue=tracks)
    
    def add_tracks():
        for i in range(50):
            player.add_to_queue({"videoId": f"new{i}", "title": f"New {i}"})
    
    def remove_tracks():
        for i in range(50):
            if len(player.queue) > 1:
                player.remove_from_queue(1)
    
    threads = [threading.Thread(target=add_tracks), threading.Thread(target=remove_tracks)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    # Should not crash
    assert isinstance(player.queue, list)
```

---

### TASK-SEC-004: Add Playback Resource Management
**Priority**: P1 - HIGH  
**Effort**: 6 hours  
**File**: `backend/player.py`  
**Lines**: 177-203

**Description**:
Playback threads can run indefinitely without cleanup, causing memory leaks and resource exhaustion.

**Acceptance Criteria**:
- [ ] Replace threading with `ThreadPoolExecutor` (max_workers=1)
- [ ] Add timeout to playback operations (5 seconds)
- [ ] Cancel previous playback when starting new one
- [ ] Implement `__del__` for cleanup
- [ ] Add resource tracking
- [ ] Test memory usage over time

**Implementation**:
```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError

class Player(GObject.Object):
    def __init__(self):
        super().__init__()
        self._playback_executor = ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="playback"
        )
        self._current_playback_future = None
        # ... rest of init
    
    def _start_playback(self, track: dict):
        # Cancel previous playback
        if self._current_playback_future and not self._current_playback_future.done():
            self._current_playback_future.cancel()
        
        vid = _validate_video_id(track.get("videoId", ""))
        # ... setup
        
        def play_with_timeout():
            try:
                self._mpv.play(url)
                # Wait for load with event
                # ... implementation
            except Exception as e:
                print(f"[player] Playback error: {e}")
                GLib.idle_add(self.emit, "error", str(e))
        
        self._current_playback_future = self._playback_executor.submit(play_with_timeout)
        GLib.idle_add(self.emit, "track-changed", vid, title, artist, thumb)
    
    def __del__(self):
        """Cleanup on destruction."""
        if hasattr(self, '_playback_executor'):
            self._playback_executor.shutdown(wait=False, cancel_futures=True)
```

---

## 🟡 P2 - MEDIUM PRIORITY IMPROVEMENTS

### TASK-OPT-001: Consolidate Image Loading Code
**Priority**: P2 - MEDIUM  
**Effort**: 4 hours  
**Files**: `ui/now_playing_bar.py`, `ui/home_page.py`, `ui/search_page.py`

**Description**:
Image loading code is duplicated in 3 files with slight variations.

**Acceptance Criteria**:
- [ ] Create `ui/utils.py` module
- [ ] Implement `load_thumbnail_async(url, size, callback)` function
- [ ] Replace all duplicate code with utility function
- [ ] Ensure consistent behavior across all uses
- [ ] Add docstrings

**Implementation**:
```python
# ui/utils.py
import threading
from gi.repository import GLib, GdkPixbuf
from typing import Callable

def load_thumbnail_async(url: str, size: int, callback: Callable):
    """Load thumbnail asynchronously.
    
    Args:
        url: Image URL to fetch
        size: Target size in pixels (square)
        callback: Function to call with GdkPixbuf or None
    """
    def fetch():
        try:
            content = safe_fetch_image(url)
            if not content:
                GLib.idle_add(callback, None)
                return
            
            loader = GdkPixbuf.PixbufLoader()
            loader.write(content)
            loader.close()
            pb = loader.get_pixbuf().scale_simple(
                size, size, GdkPixbuf.InterpType.BILINEAR
            )
            GLib.idle_add(callback, pb)
        except Exception as e:
            print(f"[thumbnail] Load error: {e}")
            GLib.idle_add(callback, None)
    
    threading.Thread(target=fetch, daemon=True).start()
```

**Usage**:
```python
# In all UI files:
from ui.utils import load_thumbnail_async

# Replace existing code with:
load_thumbnail_async(url, 52, self._set_art)
```

---

### TASK-OPT-002: Implement Image Caching
**Priority**: P2 - MEDIUM  
**Effort**: 8 hours  
**Files**: `ui/utils.py` (new)

**Description**:
Same thumbnails are downloaded multiple times, wasting bandwidth and slowing UI.

**Acceptance Criteria**:
- [ ] Create `ImageCache` class with LRU eviction
- [ ] Set max cache size to 50MB
- [ ] Use MD5 hash of URL as cache key
- [ ] Integrate with `load_thumbnail_async`
- [ ] Add cache hit/miss metrics
- [ ] Test cache eviction logic

**Implementation**:
```python
# ui/image_cache.py
import hashlib
from typing import Optional

class ImageCache:
    """LRU cache for image data."""
    
    def __init__(self, max_size_mb: int = 50):
        self._cache = {}  # key -> (data, timestamp)
        self._max_size = max_size_mb * 1024 * 1024
        self._current_size = 0
        self._hits = 0
        self._misses = 0
    
    def get(self, url: str) -> Optional[bytes]:
        """Get cached image data."""
        key = hashlib.md5(url.encode()).hexdigest()
        if key in self._cache:
            self._hits += 1
            return self._cache[key][0]
        self._misses += 1
        return None
    
    def put(self, url: str, data: bytes):
        """Cache image data with LRU eviction."""
        key = hashlib.md5(url.encode()).hexdigest()
        size = len(data)
        
        # Evict if needed (FIFO for simplicity, could use LRU)
        while self._current_size + size > self._max_size and self._cache:
            old_key = next(iter(self._cache))
            old_data, _ = self._cache.pop(old_key)
            self._current_size -= len(old_data)
        
        self._cache[key] = (data, time.time())
        self._current_size += size
    
    def stats(self) -> dict:
        """Get cache statistics."""
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / (self._hits + self._misses) if (self._hits + self._misses) > 0 else 0,
            "size_mb": self._current_size / (1024 * 1024),
            "entries": len(self._cache),
        }

# Global cache instance
_image_cache = ImageCache()
```

---

### TASK-OPT-003: Refactor Player Controls Mixin
**Priority**: P2 - MEDIUM  
**Effort**: 6 hours  
**Files**: `ui/now_playing_bar.py`, `ui/now_playing_full.py`, `ui/player_controls_mixin.py` (new)

**Description**:
Player control button creation and update logic is duplicated between mini and full player views.

**Acceptance Criteria**:
- [ ] Create `PlayerControlsMixin` class
- [ ] Extract common button creation logic
- [ ] Extract common signal handling
- [ ] Extract common update methods
- [ ] Update both player views to use mixin
- [ ] Ensure no behavior changes

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-QUAL-003

---

### TASK-OPT-004: Optimize Queue View Refresh
**Priority**: P2 - MEDIUM  
**Effort**: 4 hours  
**File**: `ui/queue_view.py`  
**Lines**: 74-83

**Description**:
Queue UI is completely rebuilt on every change, causing poor performance with large queues.

**Acceptance Criteria**:
- [ ] Implement differential update algorithm
- [ ] Reuse existing widgets when possible
- [ ] Only create/destroy widgets as needed
- [ ] Add `update_track()` method to `QueueRow`
- [ ] Test with 1000+ item queue
- [ ] Measure performance improvement

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-PERF-003

---

### TASK-OPT-005: Throttle Position Updates
**Priority**: P2 - MEDIUM  
**Effort**: 2 hours  
**File**: `backend/player.py`  
**Lines**: 95-99

**Description**:
Position signal emitted too frequently (10+ times per second), causing unnecessary UI updates.

**Acceptance Criteria**:
- [ ] Add `_last_position_emit` timestamp
- [ ] Set update interval to 500ms
- [ ] Only emit if interval elapsed
- [ ] Measure CPU usage reduction
- [ ] Ensure smooth UI updates

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-PERF-005

---

### TASK-SEC-005: Add Input Validation for Track Data
**Priority**: P2 - MEDIUM  
**Effort**: 6 hours  
**File**: `backend/player.py`  
**Lines**: 132-145

**Description**:
Track dictionaries from API are used without validation, risking type errors and crashes.

**Acceptance Criteria**:
- [ ] Create `TrackData` TypedDict
- [ ] Implement `_validate_track()` function
- [ ] Validate all required fields
- [ ] Sanitize string lengths (max 200 chars)
- [ ] Validate list types
- [ ] Add unit tests

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section SEC-MED-002

---

### TASK-SEC-006: Secure yt-dlp Binary Discovery
**Priority**: P2 - MEDIUM  
**Effort**: 4 hours  
**File**: `backend/player.py`  
**Lines**: 52-57

**Description**:
PATH manipulation and lack of binary validation could lead to executing malicious binaries.

**Acceptance Criteria**:
- [ ] Create `_find_ytdlp()` function
- [ ] Create `_validate_ytdlp_binary()` function
- [ ] Check executable permissions
- [ ] Validate binary location (no symlinks to unexpected paths)
- [ ] Don't modify global PATH
- [ ] Add logging

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section SEC-MED-003

---

### TASK-SEC-007: Add MPRIS Rate Limiting
**Priority**: P2 - MEDIUM  
**Effort**: 4 hours  
**File**: `backend/mpris.py`  
**Lines**: 159-171

**Description**:
MPRIS interface has no rate limiting, allowing DoS attacks via rapid method calls.

**Acceptance Criteria**:
- [ ] Implement rate limiter (10 calls/second per method)
- [ ] Track calls per method with timestamps
- [ ] Clean old entries automatically
- [ ] Log rate limit violations
- [ ] Test with rapid calls

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section SEC-MED-004

---

### TASK-SEC-008: Use Cryptographically Secure Shuffle
**Priority**: P2 - MEDIUM  
**Effort**: 2 hours  
**File**: `backend/player.py`  
**Lines**: 330-350

**Description**:
`random.shuffle()` is predictable and not cryptographically secure.

**Acceptance Criteria**:
- [ ] Replace `random.shuffle()` with `secrets`-based shuffle
- [ ] Implement Fisher-Yates shuffle with `secrets.randbelow()`
- [ ] Test randomness distribution
- [ ] Ensure no performance regression

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section SEC-MED-005

---

## 🟢 P3 - LOW PRIORITY ENHANCEMENTS

### TASK-QUAL-001: Add Configuration Management
**Priority**: P3 - LOW  
**Effort**: 8 hours  
**Files**: `config.py` (new), multiple

**Description**:
No way to configure app behavior (timeouts, cache size, preferences).

**Acceptance Criteria**:
- [ ] Create `Config` class
- [ ] Store config in `~/.config/gtube/config.json`
- [ ] Support nested configuration
- [ ] Add default values
- [ ] Implement save/load
- [ ] Add config validation

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-QUAL-004

---

### TASK-QUAL-002: Standardize Error Handling
**Priority**: P3 - LOW  
**Effort**: 6 hours  
**Files**: All

**Description**:
Inconsistent error handling (mix of print, pass, no handling).

**Acceptance Criteria**:
- [ ] Set up Python logging module
- [ ] Create `safe_callback()` wrapper
- [ ] Replace all `print()` with `logger` calls
- [ ] Add error boundaries in signal handlers
- [ ] Configure log levels
- [ ] Add log rotation

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-QUAL-002

---

### TASK-QUAL-003: Extract Magic Numbers to Constants
**Priority**: P3 - LOW  
**Effort**: 4 hours  
**Files**: Multiple

**Description**:
Hardcoded values throughout codebase reduce maintainability.

**Acceptance Criteria**:
- [ ] Create `constants.py` module
- [ ] Define UI constants (sizes, margins)
- [ ] Define network constants (timeouts, limits)
- [ ] Define player constants (intervals, thresholds)
- [ ] Replace all magic numbers
- [ ] Add documentation

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-QUAL-001

---

### TASK-QUAL-004: Add Comprehensive Type Hints
**Priority**: P3 - LOW  
**Effort**: 8 hours  
**Files**: All

**Description**:
Inconsistent type hints make code harder to audit and maintain.

**Acceptance Criteria**:
- [ ] Add type hints to all function signatures
- [ ] Add type hints to all class attributes
- [ ] Use `TypedDict` for structured dicts
- [ ] Run mypy with strict mode
- [ ] Fix all type errors
- [ ] Add py.typed marker

---

### TASK-QUAL-005: Create Unit Test Suite
**Priority**: P3 - LOW  
**Effort**: 40 hours  
**Files**: `tests/` (new directory)

**Description**:
No test suite exists, making refactoring risky.

**Acceptance Criteria**:
- [ ] Set up pytest framework
- [ ] Create `tests/test_player.py`
- [ ] Create `tests/test_ytmusic.py`
- [ ] Create `tests/test_ui.py`
- [ ] Achieve 70%+ code coverage
- [ ] Add CI/CD integration
- [ ] Mock external dependencies

**Test Categories**:
1. Player operations (play, pause, next, prev)
2. Queue management (add, remove, shuffle, repeat)
3. Signal emissions and handling
4. Thread safety
5. Error handling
6. API client operations
7. UI component rendering

---

### TASK-QUAL-006: Add Developer Documentation
**Priority**: P3 - LOW  
**Effort**: 16 hours  
**Files**: `docs/` (new directory)

**Description**:
No developer documentation exists.

**Acceptance Criteria**:
- [ ] Create architecture overview
- [ ] Document signal flow
- [ ] Document API client usage
- [ ] Add contribution guidelines
- [ ] Create setup guide
- [ ] Add troubleshooting section
- [ ] Generate API documentation

---

### TASK-TRACE-001: Add Error Toast Notifications
**Priority**: P3 - LOW  
**Effort**: 6 hours  
**Files**: `ui/window.py`, multiple

**Description**:
Errors are silently ignored, providing no user feedback.

**Acceptance Criteria**:
- [ ] Create `show_error_toast()` utility
- [ ] Add toast to all error callbacks
- [ ] Use Adw.Toast for notifications
- [ ] Add error icons
- [ ] Test all error paths
- [ ] Add user-friendly messages

**Implementation**:
```python
# ui/window.py
def show_error_toast(self, message: str):
    """Show error toast notification."""
    toast = Adw.Toast.new(message)
    toast.set_timeout(5)
    toast.set_priority(Adw.ToastPriority.HIGH)
    # Add to toast overlay
    self._toast_overlay.add_toast(toast)

def _on_album_loaded(self, data, err):
    if err:
        self.show_error_toast(f"Failed to load album: {err}")
        return
    if not data:
        self.show_error_toast("Album not found")
        return
    # ... success path
```

---

### TASK-TRACE-002: Standardize Callback Signatures
**Priority**: P3 - LOW  
**Effort**: 4 hours  
**File**: `backend/ytmusic.py`  
**Lines**: 142-154

**Description**:
Inconsistent callback signatures cause confusion and errors.

**Acceptance Criteria**:
- [ ] All callbacks use `(data, error)` signature
- [ ] Update `get_lyrics()` to match pattern
- [ ] Update all callers
- [ ] Add type hints for callbacks
- [ ] Document callback contract

---

### TASK-FEAT-001: Connect MPRIS to Player State
**Priority**: P3 - LOW  
**Effort**: 4 hours  
**File**: `backend/mpris.py`  
**Lines**: 123-133

**Description**:
MPRIS properties don't reflect actual player state (repeat, shuffle).

**Acceptance Criteria**:
- [ ] Connect `LoopStatus` to player repeat mode
- [ ] Connect `Shuffle` to player shuffle state
- [ ] Emit property changes on D-Bus
- [ ] Test with playerctl
- [ ] Test with media keys

**Implementation**: See COMPREHENSIVE_CODE_ANALYSIS.md section OPT-DEAD-001

---

## 📊 Task Summary

### By Priority
- **P0 (Critical)**: 1 task, 4 hours
- **P1 (High)**: 3 tasks, 20 hours
- **P2 (Medium)**: 8 tasks, 40 hours
- **P3 (Low)**: 11 tasks, 96 hours

### By Category
- **Security**: 8 tasks, 40 hours
- **Optimization**: 5 tasks, 24 hours
- **Code Quality**: 6 tasks, 46 hours
- **Traceability**: 2 tasks, 10 hours
- **Features**: 1 task, 4 hours
- **Testing**: 1 task, 40 hours

### Total Effort
**23 tasks, ~160 hours** (excluding testing and documentation)

---

## 🎯 Recommended Execution Order

### Sprint 1 (Week 1) - Critical Security
1. TASK-SEC-001: Fix command injection (P0)
2. TASK-SEC-002: Safe image fetching (P1)
3. TASK-SEC-003: Thread-safe queues (P1)
4. TASK-SEC-004: Resource management (P1)

### Sprint 2 (Week 2) - High-Value Optimizations
5. TASK-OPT-001: Consolidate image loading (P2)
6. TASK-OPT-002: Image caching (P2)
7. TASK-OPT-003: Player controls mixin (P2)
8. TASK-OPT-004: Queue view optimization (P2)

### Sprint 3 (Week 3) - Medium Security & Quality
9. TASK-SEC-005: Input validation (P2)
10. TASK-SEC-006: Secure yt-dlp (P2)
11. TASK-SEC-007: MPRIS rate limiting (P2)
12. TASK-OPT-005: Throttle position updates (P2)

### Sprint 4 (Week 4) - Code Quality
13. TASK-QUAL-001: Configuration management (P3)
14. TASK-QUAL-002: Error handling (P3)
15. TASK-QUAL-003: Extract constants (P3)
16. TASK-TRACE-001: Error toasts (P3)

### Sprint 5+ (Ongoing) - Testing & Documentation
17. TASK-QUAL-005: Unit tests (P3)
18. TASK-QUAL-006: Documentation (P3)
19. Remaining P3 tasks as time permits

---

## 📝 Notes for Sub-Agents

### General Guidelines
1. **Read the full task description** before starting
2. **Check acceptance criteria** - all must be met
3. **Run tests** after implementation
4. **Update documentation** if applicable
5. **Request code review** before marking complete

### Testing Requirements
- All security fixes must include tests
- All optimizations must include benchmarks
- All refactorings must maintain behavior

### Code Style
- Follow PEP 8
- Add type hints
- Write docstrings
- Use meaningful variable names
- Keep functions under 50 lines

### Git Workflow
- Create feature branch: `fix/SEC-001-command-injection`
- Commit with task ID: `[SEC-001] Fix command injection in video ID`
- Reference task in PR description
- Link to analysis report

---

**End of Task Backlog**