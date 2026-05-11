"""
GTube — backend/ytmusic.py
Thread-safe wrapper around ytmusicapi.
All API calls run in a background thread; results delivered via callback(data, error).
"""
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional
from ytmusicapi import YTMusic


_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="gtube-api")


class YTMusicClient:
    def __init__(self):
        # Anonymous mode — no login required for search/streaming
        self._yt = YTMusic()

    # ------------------------------------------------------------------
    # Internal async helper
    # ------------------------------------------------------------------

    def _run_async(self, fn, callback: Callable):
        def task():
            try:
                result = fn()
                callback(result, None)
            except Exception as e:
                print(f"[ytmusic] error: {e}")
                callback(None, str(e))
        _executor.submit(task)

    # ------------------------------------------------------------------
    # Home feed
    # ------------------------------------------------------------------

    def get_home(self, callback: Callable):
        """Fetch home feed sections. callback(sections: list, error)"""
        self._run_async(lambda: self._yt.get_home(limit=6), callback)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(self, query: str, filter: Optional[str] = None, callback: Callable = None):
        """
        filter: None | 'songs' | 'albums' | 'artists' | 'playlists'
        callback(results: list, error)
        """
        def fn():
            return self._yt.search(query, filter=filter, limit=20)
        self._run_async(fn, callback)

    def search_all(self, query: str, callback: Callable):
        """Run searches for songs, albums, artists in parallel, combine."""
        results = {"songs": [], "albums": [], "artists": [], "playlists": []}
        lock = threading.Lock()
        remaining = [4]

        def done():
            with lock:
                remaining[0] -= 1
                if remaining[0] == 0:
                    callback(results, None)

        def make_cb(key):
            def cb(data, err):
                if data:
                    with lock:
                        results[key] = data
                done()
            return cb

        for f, key in [("songs", "songs"), ("albums", "albums"),
                       ("artists", "artists"), ("playlists", "playlists")]:
            self.search(query, filter=f, callback=make_cb(key))

    # ------------------------------------------------------------------
    # Detail pages
    # ------------------------------------------------------------------

    def get_album(self, browse_id: str, callback: Callable):
        self._run_async(lambda: self._yt.get_album(browse_id), callback)

    def get_artist(self, channel_id: str, callback: Callable):
        self._run_async(lambda: self._yt.get_artist(channel_id), callback)

    def get_playlist(self, playlist_id: str, callback: Callable):
        self._run_async(
            lambda: self._yt.get_playlist(playlist_id, limit=50), callback
        )

    # ------------------------------------------------------------------
    # Playback context
    # ------------------------------------------------------------------

    def get_watch_playlist(self, video_id: str, callback: Callable):
        """Get up-next queue for a given track."""
        def fn():
            return self._yt.get_watch_playlist(videoId=video_id, limit=25)
        self._run_async(fn, callback)
    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    def get_stream_url(self, video_id: str, callback: Callable):
        """Get streaming URL for a video. callback(url: str, error)"""
        def fn():
            try:
                print(f"[ytmusic] Getting song info for {video_id}")
                song_info = self._yt.get_song(video_id)
                print(f"[ytmusic] Song info keys: {list(song_info.keys()) if song_info else 'None'}")
                
                if song_info and 'streamingData' in song_info:
                    streaming_data = song_info['streamingData']
                    print(f"[ytmusic] Streaming data keys: {list(streaming_data.keys())}")
                    
                    formats = streaming_data.get('formats', [])
                    if formats:
                        print(f"[ytmusic] Found {len(formats)} formats")
                        # Get the best audio format
                        best_format = max(formats, key=lambda f: f.get('bitrate', 0))
                        url = best_format.get('url')
                        print(f"[ytmusic] Best format bitrate: {best_format.get('bitrate')}, has url: {bool(url)}")
                        return url
                    else:
                        print("[ytmusic] No formats in streaming data")
                else:
                    print("[ytmusic] No streamingData in song info")
                return None
            except Exception as e:
                print(f"[ytmusic] get_stream_url error: {e}")
                import traceback
                traceback.print_exc()
                return None
        self._run_async(fn, callback)
    # ------------------------------------------------------------------
    # Lyrics
    # ------------------------------------------------------------------

    def get_lyrics(self, video_id: str, callback: Callable):
        """Fetch lyrics for a track. Returns lyrics text or None."""
        def fn():
            try:
                wp = self._yt.get_watch_playlist(videoId=video_id, limit=1)
                lyrics_id = wp.get("lyrics")
                if lyrics_id:
                    data = self._yt.get_lyrics(lyrics_id)
                    return data
                return None
            except Exception:
                return None
        self._run_async(fn, callback)

    # ------------------------------------------------------------------
    # Charts / trending (public)
    # ------------------------------------------------------------------

    def get_charts(self, country: str = "US", callback: Callable = None):
        self._run_async(lambda: self._yt.get_charts(country=country), callback)
