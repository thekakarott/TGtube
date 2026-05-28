"""
GTube — ui/now_playing_full.py
Full-screen overlay: large album art, track info, controls, and lyrics panel.
"""
from gi.repository import Gtk, GLib, Pango
from ui.lyrics_view import LyricsView
from ui.utils import load_thumbnail_async, format_time


class NowPlayingFull(Gtk.Box):
    def __init__(self, player, ytmusic, on_close):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.set_name("now-playing-full")
        self.set_vexpand(True)
        self._player = player
        self._ytmusic = ytmusic
        self._on_close = on_close
        self._current_vid = None

        self._build()
        self._connect()

    # ------------------------------------------------------------------
    def _build(self):
        # Header row
        hdr = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        hdr.set_margin_start(16)
        hdr.set_margin_end(16)
        hdr.set_margin_top(12)
        hdr.set_margin_bottom(12)

        close_btn = Gtk.Button()
        close_btn.set_icon_name("go-down-symbolic")
        close_btn.add_css_class("control-btn")
        close_btn.connect("clicked", lambda _: self._on_close())
        hdr.append(close_btn)

        hdr_title = Gtk.Label(label="Now Playing")
        hdr_title.set_hexpand(True)
        hdr_title.set_halign(Gtk.Align.CENTER)
        hdr_title.add_css_class("section-title")
        hdr.append(hdr_title)

        queue_btn = Gtk.Button()
        queue_btn.set_icon_name("view-list-symbolic")
        queue_btn.add_css_class("control-btn")
        hdr.append(queue_btn)

        self.append(hdr)

        # Main content: art + info on left, lyrics on right
        content = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        content.set_vexpand(True)
        self.append(content)

        # ── Left panel ──────────────────────────────────────────────────
        left = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        left.set_hexpand(True)
        left.set_valign(Gtk.Align.CENTER)
        left.set_margin_start(40)
        left.set_margin_end(24)
        left.set_margin_bottom(24)
        content.append(left)

        # Album art
        self._art = Gtk.Image()
        self._art.set_pixel_size(300)
        self._art.set_from_icon_name("audio-x-generic")
        self._art.set_halign(Gtk.Align.CENTER)
        left.append(self._art)

        # Title + artist
        self._title = Gtk.Label(label="Not playing")
        self._title.add_css_class("big-title")
        self._title.set_halign(Gtk.Align.CENTER)
        self._title.set_ellipsize(Pango.EllipsizeMode.END)
        left.append(self._title)

        self._artist = Gtk.Label(label="—")
        self._artist.add_css_class("big-artist")
        self._artist.set_halign(Gtk.Align.CENTER)
        left.append(self._artist)

        # Progress
        prog_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        prog_box.set_halign(Gtk.Align.FILL)

        self._pos_lbl = Gtk.Label(label="0:00")
        self._pos_lbl.add_css_class("track-duration")
        prog_box.append(self._pos_lbl)

        self._seek = Gtk.Scale.new(Gtk.Orientation.HORIZONTAL, None)
        self._seek.set_range(0, 1)
        self._seek.set_hexpand(True)
        self._seek.set_draw_value(False)
        self._dragging = False
        
        # GTK4 uses gesture controllers instead of event signals
        click_gesture = Gtk.GestureClick.new()
        click_gesture.set_button(0)  # All buttons
        click_gesture.connect("pressed", lambda *_: setattr(self, '_dragging', True))
        click_gesture.connect("released", self._on_seek_release)
        self._seek.add_controller(click_gesture)
        prog_box.append(self._seek)

        self._dur_lbl = Gtk.Label(label="0:00")
        self._dur_lbl.add_css_class("track-duration")
        prog_box.append(self._dur_lbl)

        left.append(prog_box)

        # Controls
        ctrl = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        ctrl.set_halign(Gtk.Align.CENTER)

        self._shuffle = self._mkbtn("media-playlist-shuffle-symbolic", "control-btn", lambda _: self._player.toggle_shuffle())
        self._prev = self._mkbtn("media-skip-backward-symbolic", "control-btn", lambda _: self._player.prev())
        self._play = self._mkbtn("media-playback-start-symbolic", "play-btn", lambda _: self._player.play_pause())
        self._next = self._mkbtn("media-skip-forward-symbolic", "control-btn", lambda _: self._player.next())
        self._repeat = self._mkbtn("media-playlist-repeat-symbolic", "control-btn", lambda _: self._player.cycle_repeat_mode())

        ctrl.append(self._shuffle)
        ctrl.append(self._prev)
        ctrl.append(self._play)
        ctrl.append(self._next)
        ctrl.append(self._repeat)
        left.append(ctrl)

        # ── Right panel: lyrics ─────────────────────────────────────────
        right = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        right.set_size_request(320, -1)
        right.set_vexpand(True)
        right.set_margin_end(24)

        lyrics_hdr = Gtk.Label(label="Lyrics")
        lyrics_hdr.add_css_class("section-title")
        lyrics_hdr.set_halign(Gtk.Align.START)
        right.append(lyrics_hdr)

        self._lyrics = LyricsView()
        self._lyrics.set_vexpand(True)
        right.append(self._lyrics)

        content.append(right)

    def _mkbtn(self, icon, css, handler):
        b = Gtk.Button()
        b.set_icon_name(icon)
        b.add_css_class(css)
        b.connect("clicked", handler)
        return b

    # ------------------------------------------------------------------
    def _connect(self):
        self._player.connect("track-changed", self._on_track)
        self._player.connect("position-changed", self._on_pos)
        self._player.connect("state-changed", self._on_state)
        self._player.connect("repeat-mode-changed", self._on_repeat_mode_changed)
        self._player.connect("shuffle-changed", self._on_shuffle_changed)
        
        # Initialize button states
        self._update_repeat_button()
        self._update_shuffle_button()

    def _on_track(self, player, vid, title, artist, thumb):
        self._current_vid = vid
        self._title.set_label(title or "Unknown")
        self._artist.set_label(artist or "—")
        self._lyrics.set_loading()
        if thumb:
            load_thumbnail_async(thumb, 300, self._art.set_from_pixbuf)
        # Fetch lyrics
        if self._ytmusic:
            self._ytmusic.get_lyrics(vid, self._on_lyrics)

    def _on_lyrics(self, data, err):
        if data and isinstance(data, dict):
            text = data.get("lyrics", "")
        else:
            text = None
        GLib.idle_add(self._lyrics.set_lyrics, text)

    def _on_pos(self, player, pos, dur):
        if self._dragging:
            return
        if dur > 0:
            self._seek.set_range(0, dur)
            self._seek.set_value(pos)
        self._pos_lbl.set_label(format_time(pos))
        self._dur_lbl.set_label(format_time(dur))

    def _on_state(self, player, playing):
        icon = "media-playback-pause-symbolic" if playing else "media-playback-start-symbolic"
        self._play.set_icon_name(icon)

    def _on_seek_release(self, gesture):
        self._dragging = False
        self._player.seek(self._seek.get_value())

    def _on_repeat_mode_changed(self, player, mode):
        self._update_repeat_button()

    def _on_shuffle_changed(self, player, enabled):
        self._update_shuffle_button()

    def _update_repeat_button(self):
        """Update repeat button icon based on mode."""
        mode = self._player.repeat_mode
        if mode == "one":
            self._repeat.set_icon_name("media-playlist-repeat-song-symbolic")
            self._repeat.add_css_class("active")
        elif mode == "all":
            self._repeat.set_icon_name("media-playlist-repeat-symbolic")
            self._repeat.add_css_class("active")
        else:  # none
            self._repeat.set_icon_name("media-playlist-repeat-symbolic")
            self._repeat.remove_css_class("active")

    def _update_shuffle_button(self):
        """Update shuffle button state."""
        if self._player.shuffle_enabled:
            self._shuffle.add_css_class("active")
        else:
            self._shuffle.remove_css_class("active")
