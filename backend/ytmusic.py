"""
GTube — backend/ytmusic.py
Thread-safe wrapper around ytmusicapi.
All API calls run in a background thread; results delivered via callback(data, error).
"""
import threading
import shutil
import subprocess
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

    def get_search_suggestions(self, query: str, callback: Callable):
        """Get search autocomplete suggestions."""
        self._run_async(lambda: self._yt.get_search_suggestions(query), callback)

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

    def get_watch_playlist(self, video_id: str = None, playlist_id: str = None,
                           radio: bool = False, callback: Callable = None):
        """Get up-next queue for a given track, or artist radio/shuffle playlist."""
        def fn():
            kwargs = {"limit": 25}
            if playlist_id:
                kwargs["playlistId"] = playlist_id
                kwargs["radio"] = radio
            elif video_id:
                kwargs["videoId"] = video_id
            return self._yt.get_watch_playlist(**kwargs)
        self._run_async(fn, callback)
    # ------------------------------------------------------------------
    # Streaming
    # ------------------------------------------------------------------

    def get_stream_url(self, video_id: str, callback: Callable):
        """Get streaming URL for a video. callback(url: str, error)"""
        def fn():
            try:
                # Try ytmusicapi first (may not return URLs on newer YouTube)
                song_info = self._yt.get_song(video_id)
                if song_info and 'streamingData' in song_info:
                    streaming_data = song_info['streamingData']
                    formats = streaming_data.get('formats', [])
                    if formats:
                        best_format = max(formats, key=lambda f: f.get('bitrate', 0))
                        url = best_format.get('url')
                        if url:
                            return url

                # Fallback: use yt-dlp to extract direct audio URL
                ytdlp_paths = ["yt-dlp", "/home/linuxbrew/.linuxbrew/bin/yt-dlp"]
                ytdlp = next((p for p in ytdlp_paths if shutil.which(p)), "yt-dlp")
                result = subprocess.run(
                    [ytdlp, "-g", "-f", "bestaudio[ext=m4a]/bestaudio", video_id],
                    capture_output=True, text=True, timeout=60,
                )
                if result.returncode == 0:
                    url = result.stdout.strip()
                    if url:
                        return url

                print(f"[ytmusic] Failed to get stream URL for {video_id}")
                return None
            except Exception as e:
                print(f"[ytmusic] get_stream_url error: {e}")
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

    def get_moods_genres(self, callback: Callable):
        """Get mood and genre categories."""
        self._run_async(lambda: self._yt.get_mood_categories(), callback)

    def get_artist_related(self, channel_id: str, callback: Callable):
        """Get related/similar artists."""
        def fn():
            artist = self._yt.get_artist(channel_id)
            return artist.get("related", []) if artist else []
        self._run_async(fn, callback)

    # ------------------------------------------------------------------
    # Batch artist tracks (for personalized home feed)
    # ------------------------------------------------------------------

    def get_artist_tracks(self, channel_ids: list[str], callback: Callable):
        """Batch fetch top tracks for multiple artists. Returns {channelId: {name, thumbnail, tracks, radioId}}."""
        def fn():
            results = {}
            for cid in channel_ids:
                try:
                    artist = self._yt.get_artist(cid)
                    if not artist:
                        continue
                    songs_data = artist.get("songs", {})
                    tracks = songs_data.get("results", []) if isinstance(songs_data, dict) else []
                    thumb = artist.get("thumbnails", [{}])
                    results[cid] = {
                        "name": artist.get("name", ""),
                        "channelId": cid,
                        "thumbnail": thumb[-1]["url"] if thumb else "",
                        "tracks": tracks[:10],
                        "radioId": artist.get("radioId"),
                        "shuffleId": artist.get("shuffleId"),
                        "monthlyListeners": artist.get("monthlyListeners", ""),
                    }
                except Exception as e:
                    print(f"[ytmusic] get_artist_tracks error for {cid}: {e}")
            return results
        self._run_async(fn, callback)

    def get_artist_songs(self, browse_id: str, callback: Callable):
        """Get full song list for an artist via their songs browseId."""
        self._run_async(
            lambda: self._yt.get_playlist(browse_id, limit=50), callback
        )

    def get_song_related(self, browse_id: str, callback: Callable):
        """Get related content for a song."""
        self._run_async(lambda: self._yt.get_song_related(browse_id), callback)
