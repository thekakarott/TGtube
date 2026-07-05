import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import backend.server as server


def test_get_stream_url_returns_url_when_callback_succeeds(monkeypatch):
    server._stream_cache.clear()
    def fake_get_stream_url(video_id, callback):
        callback("https://example.com/stream.m4a", None)

    monkeypatch.setattr(server.ytmusic, "get_stream_url", fake_get_stream_url)

    assert server._get_stream_url("abc123def45", timeout_seconds=1) == "https://example.com/stream.m4a"


def test_get_stream_url_returns_none_when_callback_reports_error(monkeypatch):
    def fake_get_stream_url(video_id, callback):
        callback(None, "boom")

    monkeypatch.setattr(server.ytmusic, "get_stream_url", fake_get_stream_url)

    server._stream_cache["abc123def45"] = ("https://example.com/stream.m4a", 0)
    assert server._get_stream_url("abc123def45", timeout_seconds=1, bypass_cache=True) is None
