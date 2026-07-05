#!/usr/bin/env python3
import sys
import json
from ytmusicapi import YTMusic

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)

    cmd = sys.argv[1]
    yt = YTMusic()

    try:
        if cmd == "search":
            query = sys.argv[2]
            # Get songs, albums, artists, playlists, compile them
            songs = yt.search(query, filter="songs", limit=10)
            albums = yt.search(query, filter="albums", limit=10)
            artists = yt.search(query, filter="artists", limit=10)
            playlists = yt.search(query, filter="playlists", limit=10)
            res = {
                "songs": songs,
                "albums": albums,
                "artists": artists,
                "playlists": playlists
            }
            print(json.dumps(res))
        elif cmd == "get_album":
            album_id = sys.argv[2]
            print(json.dumps(yt.get_album(album_id)))
        elif cmd == "get_playlist":
            playlist_id = sys.argv[2]
            print(json.dumps(yt.get_playlist(playlist_id, limit=50)))
        elif cmd == "get_artist":
            channel_id = sys.argv[2]
            print(json.dumps(yt.get_artist(channel_id)))
        elif cmd == "get_home":
            print(json.dumps(yt.get_home(limit=6)))
        elif cmd == "get_lyrics":
            video_id = sys.argv[2]
            try:
                wp = yt.get_watch_playlist(videoId=video_id, limit=1)
                lyrics_id = wp.get("lyrics")
                if lyrics_id:
                    print(json.dumps(yt.get_lyrics(lyrics_id)))
                else:
                    print(json.dumps(None))
            except Exception:
                print(json.dumps(None))
        elif cmd == "get_stream_url":
            video_id = sys.argv[2]
            # We can use yt-dlp to get stream url directly or fallback to yt.get_song
            import subprocess
            try:
                url = f"https://www.youtube.com/watch?v={video_id}"
                # Get the bestaudio stream URL using yt-dlp
                output = subprocess.check_output([
                    "yt-dlp",
                    "-g",
                    "-f", "bestaudio/best",
                    url
                ], text=True).strip()
                print(json.dumps({"url": output}))
            except Exception as e:
                # Fallback to get_song streamingData
                try:
                    song_info = yt.get_song(video_id)
                    formats = song_info.get('streamingData', {}).get('formats', [])
                    if not formats:
                        formats = song_info.get('streamingData', {}).get('adaptiveFormats', [])
                    if formats:
                        best_format = max(formats, key=lambda f: f.get('bitrate', 0))
                        print(json.dumps({"url": best_format.get('url')}))
                    else:
                        print(json.dumps({"error": f"Failed to get stream: {e}"}))
                except Exception as ex:
                    print(json.dumps({"error": f"Failed to get stream: {ex}"}))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
