"""
GTube — backend/player.py
Audio engine wrapping python-mpv with GObject signals.
All mpv callbacks are marshalled onto the GTK main loop via GLib.idle_add.
"""
import threading
from gi.repository import GObject, GLib


class Player(GObject.Object):
    """Singleton audio player. Emit GObject signals so UI can observe state."""

    __gsignals__ = {
        # (video_id, title, artist, thumbnail_url)
        "track-changed": (GObject.SignalFlags.RUN_FIRST, None,
                          (str, str, str, str)),
        # (position_seconds, duration_seconds)
        "position-changed": (GObject.SignalFlags.RUN_FIRST, None,
                             (float, float)),
        # (is_playing,)
        "state-changed": (GObject.SignalFlags.RUN_FIRST, None, (bool,)),
        # (volume 0-100,)
        "volume-changed": (GObject.SignalFlags.RUN_FIRST, None, (float,)),
        # track ended naturally → advance queue
        "track-ended": (GObject.SignalFlags.RUN_FIRST, None, ()),
        # (error_message,)
        "error": (GObject.SignalFlags.RUN_FIRST, None, (str,)),
    }

    def __init__(self):
        super().__init__()
        self._queue: list[dict] = []
        self._index: int = -1
        self._current_track: dict = {}
        self._seeking = False
        self._mpv = None
        self._ytmusic = None  # Will be set later
        self._init_mpv()

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _init_mpv(self):
        try:
            import mpv
            import shutil
            
            # Check if yt-dlp is available
            ytdlp_path = shutil.which("yt-dlp")
            print(f"[player] yt-dlp available: {ytdlp_path}")
            
            self._mpv = mpv.MPV(
                ytdl=True,
                ytdl_format="bestaudio[ext=webm]/bestaudio/best",
                video=False,
                terminal=False,
                quiet=False,
                input_default_bindings=False,
            )
            self._mpv["ytdl-raw-options"] = "yes-playlist="

            @self._mpv.event_callback("file-loaded")
            def _on_file_loaded():
                duration = self._mpv.duration or 0
                pause = self._mpv.pause if self._mpv else None
                print(f"[mpv] file-loaded: duration={duration}s, pause={pause}")

            @self._mpv.event_callback("playback-restart")
            def _on_restart():
                print(f"[mpv] playback-restart event")

            @self._mpv.event_callback("log-message")
            def _on_log(event):
                msg = getattr(event, 'message', '')
                level = getattr(event, 'level', '')
                # Print all messages, not just errors
                if msg and level:
                    print(f"[mpv-{level}] {msg.strip()}")

            @self._mpv.event_callback("end-file")
            def _on_end(event):
                reason = getattr(event, 'reason', '')
                file_error = getattr(event, 'file_error', None)
                print(f"[mpv] end-file: reason='{reason}', file_error={file_error}")
                if reason == "eof":
                    GLib.idle_add(self._on_track_ended)

            @self._mpv.property_observer("time-pos")
            def _on_time(name, value):
                if value is not None and not self._seeking:
                    dur = self._mpv.duration or 0.0
                    GLib.idle_add(self._emit_position, float(value), float(dur))

            @self._mpv.property_observer("pause")
            def _on_pause(name, value):
                if value is not None:
                    playing = not value
                    print(f"[mpv] pause property changed: {value} (playing={playing})")
                    GLib.idle_add(self.emit, "state-changed", playing)

            @self._mpv.property_observer("volume")
            def _on_vol(name, value):
                if value is not None:
                    GLib.idle_add(self.emit, "volume-changed", float(value))

            @self._mpv.property_observer("duration")
            def _on_duration(name, value):
                if value is not None:
                    print(f"[mpv] duration property changed: {value}s")

        except Exception as e:
            print(f"[player] mpv init error: {e}")

    def _emit_position(self, pos, dur):
        self.emit("position-changed", pos, dur)

    def _on_track_ended(self):
        self.emit("track-ended")
        self.next()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def play_track(self, track: dict, queue: list[dict] | None = None):
        """Play a track dict. Optionally set a new queue."""
        print(f"[player] play_track called with track: {track.get('title', 'Unknown')}, videoId: {track.get('videoId', 'MISSING')}")
        if queue is not None:
            self._queue = list(queue)
        if track in self._queue:
            self._index = self._queue.index(track)
        else:
            self._queue.insert(self._index + 1, track)
            self._index = self._queue.index(track)

        self._current_track = track
        self._start_playback(track)

    def _start_playback(self, track: dict):
        vid = track.get("videoId", "")
        title = track.get("title", "Unknown")
        artists = track.get("artists") or []
        artist = artists[0].get("name", "") if artists else track.get("artist", "")
        thumbs = track.get("thumbnails") or []
        thumb = thumbs[-1]["url"] if thumbs else ""

        url = f"https://www.youtube.com/watch?v={vid}"
        print(f"[player] _start_playback: title='{title}', vid='{vid}'")
        
        def play_thread():
            try:
                # First try: yt-dlp via mpv
                print(f"[player] [thread] Attempt 1: mpv with yt-dlp")
                self._mpv.play(url)
                print(f"[player] [thread] mpv.play() returned")
                
                # Set a flag to track if file loaded successfully
                file_loaded = False
                
                def on_file_loaded():
                    nonlocal file_loaded
                    file_loaded = True
                    duration = self._mpv.duration or 0
                    print(f"[player] [thread] SUCCESS: file loaded, duration={duration}s")
                
                # Add our success check callback
                self._mpv.event_callback("file-loaded")(on_file_loaded)
                
                # Wait up to 5 seconds for file to load
                import time
                for i in range(10):  # 10 * 0.5s = 5s
                    time.sleep(0.5)
                    if file_loaded:
                        print(f"[player] [thread] yt-dlp succeeded!")
                        return
                
                print(f"[player] [thread] yt-dlp failed to load file, trying ytmusicapi...")
                
                # Second try: ytmusicapi streaming
                if self._ytmusic:
                    def on_stream_url(stream_url, error):
                        if stream_url and not error:
                            print(f"[player] [thread] Got stream URL from ytmusicapi, playing...")
                            self._mpv.play(stream_url)
                        else:
                            print(f"[player] [thread] ytmusicapi failed: {error}")
                    
                    self._ytmusic.get_stream_url(vid, on_stream_url)
                else:
                    print(f"[player] [thread] No ytmusic client available")
                    
            except Exception as e:
                print(f"[player] [thread] Error: {e}")
                import traceback
                traceback.print_exc()
        
        threading.Thread(target=play_thread, daemon=True).start()
        GLib.idle_add(self.emit, "track-changed", vid, title, artist, thumb)

    def play_pause(self):
        if self._mpv:
            self._mpv.pause = not self._mpv.pause

    def seek(self, position: float):
        if self._mpv:
            self._seeking = True
            self._mpv.seek(position, "absolute")
            self._seeking = False

    def set_volume(self, vol: float):
        if self._mpv:
            self._mpv.volume = max(0.0, min(100.0, vol))

    def next(self):
        if self._index < len(self._queue) - 1:
            self._index += 1
            self._current_track = self._queue[self._index]
            self._start_playback(self._current_track)

    def prev(self):
        if self._mpv and self._mpv.time_pos and self._mpv.time_pos > 3:
            self._mpv.seek(0, "absolute")
        elif self._index > 0:
            self._index -= 1
            self._current_track = self._queue[self._index]
            self._start_playback(self._current_track)

    def set_ytmusic_client(self, ytmusic):
        """Set the ytmusic client for fallback streaming."""
        self._ytmusic = ytmusic

    def clear_queue(self):
        self._queue.clear()
        self._index = -1

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def is_playing(self) -> bool:
        if self._mpv is None:
            return False
        return not self._mpv.pause

    @property
    def position(self) -> float:
        if self._mpv and self._mpv.time_pos:
            return float(self._mpv.time_pos)
        return 0.0

    @property
    def duration(self) -> float:
        if self._mpv and self._mpv.duration:
            return float(self._mpv.duration)
        return 0.0

    @property
    def volume(self) -> float:
        if self._mpv:
            return float(self._mpv.volume or 80)
        return 80.0

    @property
    def current_track(self) -> dict:
        return self._current_track

    @property
    def queue(self) -> list[dict]:
        return self._queue
