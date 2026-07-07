"""
GTube — backend/ytmusic.py
Thread-safe wrapper around ytmusicapi.
All API calls run in a background thread; results delivered via callback(data, error).
"""
import threading
import shutil
import subprocess
import urllib.request
import json
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

    _INNERTUBE_API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX3"
    _INNERTUBE_BASE = "https://music.youtube.com/youtubei/v1"

    # Client configs from Metrolist/InnerTune — different YouTube clients have
    # different blocking policies. We try multiple to maximize success from
    # datacenter IPs.
    _CLIENTS = [
        {
            "name": "ANDROID",
            "version": "21.03.38",
            "id": "3",
            "ua": "com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip",
        },
        {
            "name": "ANDROID_VR",
            "version": "1.61.48",
            "id": "28",
            "ua": "com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Oculus Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)",
        },
        {
            "name": "ANDROID_CREATOR",
            "version": "25.03.101",
            "id": "14",
            "ua": "com.google.android.apps.youtube.creator/25.03.101 (Linux; U; Android 15; en_US; Pixel 9 Pro Fold; Build/AP3A.241005.015.A2; Cronet/132.0.6779.0)",
        },
        {
            "name": "WEB_REMIX",
            "version": "1.20260213.01.00",
            "id": "67",
            "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
        },
        {
            "name": "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
            "version": "2.0",
            "id": "85",
            "ua": "Mozilla/5.0 (PlayStation; PlayStation 4/12.02) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
        },
    ]

    def _try_innertube(self, video_id: str) -> str | None:
        """
        Direct InnerTube player API call — same approach as Metrolist/InnerTune.
        Uses multiple client types since some may be less restricted from
        datacenter IPs.
        """
        for client in self._CLIENTS:
            try:
                url = f"{self._INNERTUBE_BASE}/player?key={self._INNERTUBE_API_KEY}&prettyPrint=false"

                body = {
                    "context": {
                        "client": {
                            "clientName": client["name"],
                            "clientVersion": client["version"],
                            "hl": "en",
                            "gl": "US",
                        }
                    },
                    "videoId": video_id,
                    "playbackContext": {
                        "contentPlaybackContext": {
                            "signatureTimestamp": 19495,
                        }
                    },
                    "contentCheckOk": True,
                    "racyCheckOk": True,
                }

                headers = {
                    "User-Agent": client["ua"],
                    "X-YouTube-Client-Name": client["id"],
                    "X-YouTube-Client-Version": client["version"],
                    "X-Origin": "https://music.youtube.com",
                    "Referer": "https://music.youtube.com/",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }

                print(f"[stream] innertube: trying {client['name']} for {video_id}")
                req = urllib.request.Request(
                    url,
                    data=json.dumps(body).encode(),
                    headers=headers,
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=25) as resp:
                    data = json.loads(resp.read().decode())

                streaming_data = data.get("streamingData")
                if not streaming_data:
                    reason = data.get("playabilityStatus", {}).get("reason", "no streamingData")
                    print(f"[stream] innertube {client['name']}: {reason}")
                    continue

                # Try adaptiveFormats first (best audio quality)
                formats = streaming_data.get("adaptiveFormats", [])
                if not formats:
                    formats = streaming_data.get("formats", [])

                if not formats:
                    print(f"[stream] innertube {client['name']}: no formats")
                    continue

                # Prefer audio-only formats (audio/mp4, audio/webm)
                audio_formats = [
                    f for f in formats
                    if f.get("mimeType", "").startswith("audio/")
                ]
                candidates = audio_formats or formats

                # Pick highest bitrate
                best = max(candidates, key=lambda f: f.get("bitrate", 0) or 0)
                stream_url = best.get("url") or best.get("url")

                # If direct URL is present, use it
                if best.get("url"):
                    print(f"[stream] innertube {client['name']}: resolved {video_id}")
                    return best["url"]

                # If no URL, check for cipher/signatureCipher (needs decoding)
                cipher = best.get("signatureCipher") or best.get("cipher")
                if cipher:
                    print(f"[stream] innertube {client['name']}: needs signature decoding, skipping")
                    continue

                print(f"[stream] innertube {client['name']}: no URL in format")
                continue

            except urllib.error.HTTPError as e:
                print(f"[stream] innertube {client['name']}: HTTP {e.code}")
                continue
            except Exception as e:
                print(f"[stream] innertube {client['name']}: {e}")
                continue

        print(f"[stream] innertube: all clients failed for {video_id}")
        return None

    def _try_piped(self, video_id: str) -> str | None:
        """Resolve stream URL via Piped API — uses Piped's own server IPs."""
        try:
            url = f"https://pipedapi.kavin.rocks/streams/{video_id}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; GTube/1.0)",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())

            audio = data.get("audioStreams", [])
            if not audio:
                print(f"[stream] piped: no audio streams for {video_id}")
                return None

            for pref in ["m4a", "webm"]:
                for s in audio:
                    if s.get("mimeType", "").startswith(f"audio/{pref}"):
                        url = s.get("url")
                        if url:
                            print(f"[stream] piped: resolved {video_id} ({pref})")
                            return url

            url = audio[0].get("url")
            if url:
                print(f"[stream] piped: resolved {video_id} (fallback)")
                return url

            print(f"[stream] piped: no usable audio URL for {video_id}")
            return None
        except Exception as e:
            print(f"[stream] piped error for {video_id}: {e}")
            return None

    def _try_ytdlp(self, video_id: str) -> str | None:
        """Fallback: resolve via yt-dlp with android client."""
        try:
            import sys

            ytdlp_paths = ["yt-dlp", "/home/linuxbrew/.linuxbrew/bin/yt-dlp", f"{sys.prefix}/bin/yt-dlp"]
            ytdlp = next((p for p in ytdlp_paths if shutil.which(p)), None)
            if not ytdlp:
                print(f"[stream] yt-dlp binary not found, skipping")
                return None

            cmd = [
                ytdlp,
                "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "--extractor-args", "youtube:player_client=android",
                "--socket-timeout", "15",
                "--verbose",
                "-g",
                "-f", "bestaudio[ext=m4a]/bestaudio",
                video_id
            ]

            print(f"[stream] yt-dlp fallback for {video_id}")
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, timeout=42,
            )

            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            print(f"[stream] yt-dlp exit: {result.returncode}, has stdout: {bool(stdout)}")
            if stderr:
                for line in stderr.splitlines()[-5:]:
                    print(f"[stream] yt-dlp: {line}")

            if result.returncode != 0:
                error_msg = stderr or stdout or "yt-dlp failed"
                raise RuntimeError(f"yt-dlp error: {error_msg[:300]}")

            if stdout:
                print(f"[stream] yt-dlp resolved {video_id}")
                return stdout

            raise RuntimeError("yt-dlp returned empty output")
        except subprocess.TimeoutExpired:
            print(f"[stream] yt-dlp timeout for {video_id}")
            return None
        except Exception as e:
            print(f"[stream] yt-dlp error for {video_id}: {e}")
            return None

    def get_stream_url(self, video_id: str, callback: Callable):
        """Get streaming URL for a video. callback(url: str, error)

        Strategy (in order):
        1. Direct InnerTube player API call (multiple client types)
        2. Piped API (third-party YouTube proxy)
        3. yt-dlp with android client
        """
        def fn():
            url = self._try_innertube(video_id)
            if url:
                return url

            url = self._try_piped(video_id)
            if url:
                return url

            url = self._try_ytdlp(video_id)
            if url:
                return url

            raise RuntimeError("All stream resolution methods failed")
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
