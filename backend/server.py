import sys
import os
import threading
import time
import requests
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.ytmusic import YTMusicClient

app = Flask(__name__)
CORS(app, origins=os.environ.get("CORS_ORIGIN", "*").split(","))


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

ytmusic = YTMusicClient()

# Stream URL cache: video_id -> (url, timestamp)
_stream_cache: dict[str, tuple[str, float]] = {}
_stream_cache_lock = threading.Lock()
_STREAM_CACHE_TTL = 3600  # 1 hour

def _get_stream_url(video_id: str) -> str | None:
    with _stream_cache_lock:
        cached = _stream_cache.get(video_id)
        if cached and time.time() - cached[1] < _STREAM_CACHE_TTL:
            return cached[0]

    result = {}
    event = threading.Event()
    def cb(url, err):
        result["url"] = url
        result["err"] = err
        event.set()
    ytmusic.get_stream_url(video_id, cb)
    event.wait(30)
    if result.get("err") or not result.get("url"):
        return None
    with _stream_cache_lock:
        _stream_cache[video_id] = (result["url"], time.time())
    return result["url"]


def _sync_search(q: str, filter: str | None = None) -> tuple:
    result = {}
    event = threading.Event()
    def cb(data, err):
        result["data"] = data
        result["err"] = err
        event.set()

    if filter:
        ytmusic.search(q, filter=filter, callback=cb)
    else:
        ytmusic.search_all(q, cb)

    event.wait(15)
    return result.get("data"), result.get("err")


# ── API Endpoints ──────────────────────────────

@app.route("/api/state")
def get_state():
    return jsonify({
        "isPlaying": False,
        "currentTrack": None,
        "position": 0,
        "duration": 0,
        "volume": 100,
        "queue": [],
        "currentIndex": -1,
        "repeatMode": "Off",
        "shuffle": False,
    })


@app.route("/api/home")
def get_home():
    result = {}
    event = threading.Event()
    def cb(data, err):
        result["data"] = data
        result["err"] = err
        event.set()
    ytmusic.get_home(cb)
    event.wait(15)
    if result.get("err"):
        return jsonify({"error": result["err"]}), 500
    return jsonify(result.get("data", []))


@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    filter_type = request.args.get("filter")
    if not q:
        return jsonify({"error": "Missing q"}), 400
    data, err = _sync_search(q, filter_type)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data if data else [])


@app.route("/api/search-suggestions")
def search_suggestions():
    q = request.args.get("q", "")
    if not q or len(q) < 1:
        return jsonify([])
    data, err = _run_ytm(lambda cb: ytmusic.get_search_suggestions(q, cb), 10)
    if err:
        return jsonify([])
    return jsonify(data or [])


@app.route("/api/moods-genres")
def get_moods_genres():
    data, err = _run_ytm(lambda cb: ytmusic.get_moods_genres(cb), 15)
    if err:
        return jsonify([])
    return jsonify(data or [])


@app.route("/api/charts")
def get_charts():
    country = request.args.get("country", "US")
    data, err = _run_ytm(lambda cb: ytmusic.get_charts(country=country, callback=cb), 15)
    if err:
        return jsonify([])
    return jsonify(data or [])


@app.route("/api/stream-url")
def get_stream_url():
    video_id = request.args.get("videoId", "")
    if not video_id:
        return jsonify({"error": "Missing videoId"}), 400
    url = _get_stream_url(video_id)
    if not url:
        return jsonify({"error": "Could not get stream URL"}), 500
    return jsonify({"url": url})


@app.route("/api/stream/<video_id>")
def stream_audio(video_id):
    url = _get_stream_url(video_id)
    if not url:
        return jsonify({"error": "Could not get stream URL"}), 500

    try:
        headers = {}
        if "Range" in request.headers:
            headers["Range"] = request.headers["Range"]

        resp = requests.get(url, stream=True, timeout=120, headers=headers)
        resp.raise_for_status()

        response_headers = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        }
        ct = resp.headers.get("content-type", "audio/webm")
        response_headers["Content-Type"] = ct

        status = resp.status_code
        if "Range" in headers and resp.status_code == 206:
            response_headers["Content-Range"] = resp.headers.get("Content-Range", "")
            cl = resp.headers.get("Content-Length")
            if cl:
                response_headers["Content-Length"] = cl

        return Response(
            stream_with_context(resp.iter_content(chunk_size=65536)),
            status=status,
            headers=response_headers,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route("/api/lyrics")
def get_lyrics():
    video_id = request.args.get("videoId", "")
    if not video_id:
        return jsonify({"error": "Missing videoId"}), 400
    result = {}
    event = threading.Event()
    def cb(data, err):
        result["data"] = data
        result["err"] = err
        event.set()
    ytmusic.get_lyrics(video_id, cb)
    event.wait(15)
    if result.get("err"):
        return jsonify({"error": result["err"]}), 500
    return jsonify({"lyrics": result.get("data", "") or ""})


def _run_ytm(fn, timeout=15):
    result = {}
    event = threading.Event()
    def cb(data, err):
        result["data"] = data
        result["err"] = err
        event.set()
    fn(cb)
    event.wait(timeout)
    if result.get("err"):
        return None, result["err"]
    return result.get("data"), None


@app.route("/api/album")
def get_album():
    browse_id = request.args.get("browseId", "")
    if not browse_id:
        return jsonify({"error": "Missing browseId"}), 400
    data, err = _run_ytm(lambda cb: ytmusic.get_album(browse_id, cb), 20)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


@app.route("/api/artist")
def get_artist():
    channel_id = request.args.get("channelId", "")
    if not channel_id:
        return jsonify({"error": "Missing channelId"}), 400
    data, err = _run_ytm(lambda cb: ytmusic.get_artist(channel_id, cb), 20)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


@app.route("/api/playlist")
def get_playlist():
    list_id = request.args.get("listId", "")
    if not list_id:
        return jsonify({"error": "Missing listId"}), 400
    data, err = _run_ytm(lambda cb: ytmusic.get_playlist(list_id, cb), 20)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


@app.route("/api/watch-queue")
def get_watch_queue():
    video_id = request.args.get("videoId", "")
    playlist_id = request.args.get("playlistId", "")
    radio = request.args.get("radio", "false").lower() == "true"
    if not video_id and not playlist_id:
        return jsonify({"error": "Missing videoId or playlistId"}), 400
    data, err = _run_ytm(
        lambda cb: ytmusic.get_watch_playlist(
            video_id=video_id or None,
            playlist_id=playlist_id or None,
            radio=radio,
            callback=cb,
        ),
        15,
    )
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


@app.route("/api/artist-tracks")
def get_artist_tracks():
    """Batch fetch top tracks for multiple artists by channel IDs."""
    ids_param = request.args.get("channelIds", "")
    if not ids_param:
        return jsonify({"error": "Missing channelIds"}), 400
    channel_ids = [cid.strip() for cid in ids_param.split(",") if cid.strip()]
    if not channel_ids:
        return jsonify({"error": "No valid channelIds"}), 400
    data, err = _run_ytm(lambda cb: ytmusic.get_artist_tracks(channel_ids, cb), 30)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


@app.route("/api/artist-songs")
def get_artist_songs():
    """Get full song list for an artist via songs browseId."""
    browse_id = request.args.get("browseId", "")
    if not browse_id:
        return jsonify({"error": "Missing browseId"}), 400
    data, err = _run_ytm(lambda cb: ytmusic.get_artist_songs(browse_id, cb), 20)
    if err:
        return jsonify({"error": err}), 500
    return jsonify(data or {})


def run_server(port=None, production=False):
    if port is None:
        port = int(os.environ.get("PORT", 8765))
    if production:
        try:
            from waitress import serve
            serve(app, host="0.0.0.0", port=port)
        except ImportError:
            print("waitress not installed, falling back to Flask dev server")
            app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
    else:
        app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    import sys
    prod = "--production" in sys.argv or "-p" in sys.argv
    run_server(production=prod)
