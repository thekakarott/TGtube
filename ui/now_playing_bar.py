"""
GTube — ui/now_playing_bar.py
Persistent bottom bar showing current track + playback controls.
"""
import threading
import requests
from gi.repository import Gtk, GLib, GdkPixbuf, Pango


def _fmt_time(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 60}:{s % 60:02d}"


def _load_thumb_async(url: str, callback):
    def fetch():
        try:
            resp = requests.get(url, timeout=8)
            loader = GdkPixbuf.PixbufLoader()
            loader.write(resp.content)
            loader.close()
            pb = loader.get_pixbuf().scale_simple(52, 52, GdkPixbuf.InterpType.BILINEAR)
            GLib.idle_add(callback, pb)
        except Exception:
            GLib.idle_add(callback, None)
    threading.Thread(target=fetch, daemon=True).start()


class NowPlayingBar(Gtk.Box):
    def __init__(self, player, on_expand=None):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.set_name("now-playing-bar")
        self._player = player
        self._on_expand = on_expand
        self._dragging = False

        self._build()
        self._connect_signals()

    # ------------------------------------------------------------------
    def _build(self):
        self.add_css_class("now-playing-bar")

        root = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        root.set_margin_start(12)
        root.set_margin_end(12)
        root.set_margin_top(8)
        root.set_margin_bottom(8)
        self.append(root)

        # ── Left: art + info ────────────────────────────────────────────
        self._art = Gtk.Image()
        self._art.set_pixel_size(52)
        self._art.set_from_icon_name("audio-x-generic")
        self._art.add_css_class("art-thumb")
        root.append(self._art)

        info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        info_box.set_valign(Gtk.Align.CENTER)
        info_box.set_size_request(180, -1)

        self._title_label = Gtk.Label(label="Not playing")
        self._title_label.set_halign(Gtk.Align.START)
        self._title_label.set_ellipsize(Pango.EllipsizeMode.END)
        self._title_label.add_css_class("track-title")
        info_box.append(self._title_label)

        self._artist_label = Gtk.Label(label="—")
        self._artist_label.set_halign(Gtk.Align.START)
        self._artist_label.set_ellipsize(Pango.EllipsizeMode.END)
        self._artist_label.add_css_class("track-artist")
        info_box.append(self._artist_label)

        root.append(info_box)

        # ── Center: controls + progress ──────────────────────────────────
        center = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        center.set_hexpand(True)
        center.set_valign(Gtk.Align.CENTER)

        btn_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        btn_row.set_halign(Gtk.Align.CENTER)

        self._shuffle_btn = self._make_btn("media-playlist-shuffle-symbolic", "control-btn", self._on_shuffle)
        self._prev_btn = self._make_btn("media-skip-backward-symbolic", "control-btn", self._on_prev)
        self._play_btn = self._make_btn("media-playback-start-symbolic", "play-btn", self._on_play_pause)
        self._next_btn = self._make_btn("media-skip-forward-symbolic", "control-btn", self._on_next)
        self._repeat_btn = self._make_btn("media-playlist-repeat-symbolic", "control-btn", self._on_repeat)

        btn_row.append(self._shuffle_btn)
        btn_row.append(self._prev_btn)
        btn_row.append(self._play_btn)
        btn_row.append(self._next_btn)
        btn_row.append(self._repeat_btn)
        center.append(btn_row)

        prog_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        prog_row.set_halign(Gtk.Align.FILL)

        self._pos_label = Gtk.Label(label="0:00")
        self._pos_label.add_css_class("track-duration")
        prog_row.append(self._pos_label)

        self._progress = Gtk.Scale.new(Gtk.Orientation.HORIZONTAL, None)
        self._progress.set_range(0, 1)
        self._progress.set_value(0)
        self._progress.set_hexpand(True)
        self._progress.set_draw_value(False)
        self._progress.set_sensitive(False)
        
        # GTK4 uses gesture controllers instead of event signals
        click_gesture = Gtk.GestureClick.new()
        click_gesture.set_button(0)  # All buttons
        click_gesture.connect("pressed", lambda *_: setattr(self, '_dragging', True))
        click_gesture.connect("released", self._on_seek_release)
        self._progress.add_controller(click_gesture)
        prog_row.append(self._progress)

        self._dur_label = Gtk.Label(label="0:00")
        self._dur_label.add_css_class("track-duration")
        prog_row.append(self._dur_label)

        center.append(prog_row)
        root.append(center)

        # ── Right: volume ────────────────────────────────────────────────
        right = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        right.set_valign(Gtk.Align.CENTER)

        vol_icon = Gtk.Image.new_from_icon_name("audio-volume-medium-symbolic")
        vol_icon.set_pixel_size(16)
        right.append(vol_icon)

        self._vol_scale = Gtk.Scale.new(Gtk.Orientation.HORIZONTAL, None)
        self._vol_scale.set_range(0, 100)
        self._vol_scale.set_value(80)
        self._vol_scale.set_size_request(90, -1)
        self._vol_scale.set_draw_value(False)
        self._vol_scale.connect("value-changed", self._on_volume_changed)
        right.append(self._vol_scale)

        # Expand button
        expand_btn = self._make_btn("go-up-symbolic", "control-btn", self._on_expand_clicked)
        right.append(expand_btn)

        root.append(right)

    def _make_btn(self, icon, css_class, handler):
        btn = Gtk.Button()
        btn.set_icon_name(icon)
        btn.add_css_class(css_class)
        btn.connect("clicked", handler)
        return btn

    # ------------------------------------------------------------------
    def _connect_signals(self):
        p = self._player
        p.connect("track-changed", self._on_track_changed)
        p.connect("position-changed", self._on_position_changed)
        p.connect("state-changed", self._on_state_changed)
        p.connect("repeat-mode-changed", self._on_repeat_mode_changed)
        p.connect("shuffle-changed", self._on_shuffle_changed)
        
        # Initialize button states
        self._update_repeat_button()
        self._update_shuffle_button()

    def _on_track_changed(self, player, vid, title, artist, thumb):
        self._title_label.set_label(title or "Unknown")
        self._artist_label.set_label(artist or "—")
        self._progress.set_sensitive(True)
        if thumb:
            _load_thumb_async(thumb, self._set_art)
        else:
            self._art.set_from_icon_name("audio-x-generic")

    def _set_art(self, pixbuf):
        if pixbuf:
            self._art.set_from_pixbuf(pixbuf)
        else:
            self._art.set_from_icon_name("audio-x-generic")

    def _on_position_changed(self, player, pos, dur):
        if self._dragging:
            return
        if dur > 0:
            self._progress.set_range(0, dur)
            self._progress.set_value(pos)
        self._pos_label.set_label(_fmt_time(pos))
        self._dur_label.set_label(_fmt_time(dur))

    def _on_state_changed(self, player, is_playing):
        icon = "media-playback-pause-symbolic" if is_playing else "media-playback-start-symbolic"
        self._play_btn.set_icon_name(icon)

    # ── Control handlers ────────────────────────────────────────────────
    def _on_play_pause(self, btn):
        self._player.play_pause()

    def _on_prev(self, btn):
        self._player.prev()

    def _on_next(self, btn):
        self._player.next()

    def _on_shuffle(self, btn):
        self._player.toggle_shuffle()

    def _on_repeat(self, btn):
        self._player.cycle_repeat_mode()

    def _on_seek_release(self, gesture):
        self._dragging = False
        self._player.seek(self._progress.get_value())

    def _on_volume_changed(self, scale):
        self._player.set_volume(scale.get_value())

    def _on_expand_clicked(self, btn):
        if self._on_expand:
            self._on_expand()

    def _on_repeat_mode_changed(self, player, mode):
        self._update_repeat_button()

    def _on_shuffle_changed(self, player, enabled):
        self._update_shuffle_button()

    def _update_repeat_button(self):
        """Update repeat button icon based on mode."""
        mode = self._player.repeat_mode
        if mode == "one":
            self._repeat_btn.set_icon_name("media-playlist-repeat-song-symbolic")
            self._repeat_btn.add_css_class("active")
        elif mode == "all":
            self._repeat_btn.set_icon_name("media-playlist-repeat-symbolic")
            self._repeat_btn.add_css_class("active")
        else:  # none
            self._repeat_btn.set_icon_name("media-playlist-repeat-symbolic")
            self._repeat_btn.remove_css_class("active")

    def _update_shuffle_button(self):
        """Update shuffle button state."""
        if self._player.shuffle_enabled:
            self._shuffle_btn.add_css_class("active")
        else:
            self._shuffle_btn.remove_css_class("active")
