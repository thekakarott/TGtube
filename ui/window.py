"""
GTube — ui/window.py
Main application window: sidebar navigation + page stack + now-playing bar.
"""
import os
from gi.repository import Gtk, Adw, GLib

from ui.home_page import HomePage
from ui.search_page import SearchPage
from ui.now_playing_bar import NowPlayingBar
from ui.now_playing_full import NowPlayingFull
from ui.queue_view import QueueView


class GtubeWindow(Adw.ApplicationWindow):
    def __init__(self, player, ytmusic, **kwargs):
        super().__init__(**kwargs)
        self._player = player
        self._ytmusic = ytmusic

        self.set_title("GTube")
        self.set_default_size(1100, 700)
        self.set_size_request(800, 500)

        self._build()

    # ------------------------------------------------------------------
    def _build(self):
        # Root vertical box
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.set_content(root)

        # ── Header bar ──────────────────────────────────────────────────
        hbar = Adw.HeaderBar()
        hbar.set_show_end_title_buttons(True)

        title_lbl = Gtk.Label(label="GTube")
        title_lbl.add_css_class("title")
        hbar.set_title_widget(title_lbl)

        # Keyboard shortcut: Ctrl+F → focus search
        root.append(hbar)

        # ── Body: sidebar + stack ────────────────────────────────────────
        body = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        body.set_vexpand(True)
        root.append(body)

        # Sidebar
        sidebar = self._build_sidebar()
        body.append(sidebar)

        # Main stack (pages)
        self._stack = Gtk.Stack()
        self._stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
        self._stack.set_transition_duration(180)
        self._stack.set_hexpand(True)
        self._stack.set_vexpand(True)
        body.append(self._stack)

        # Pages
        self._home_page = HomePage(self._ytmusic, self._player, self._navigate)
        self._search_page = SearchPage(self._ytmusic, self._player, self._navigate)
        self._full_page = NowPlayingFull(self._player, self._ytmusic, self._close_full)
        self._queue_page = QueueView(self._player)

        self._stack.add_named(self._home_page, "home")
        self._stack.add_named(self._search_page, "search")
        self._stack.add_named(self._full_page, "nowplaying")
        self._stack.add_named(self._queue_page, "queue")

        # ── Now Playing bar (bottom) ─────────────────────────────────────
        self._player_bar = NowPlayingBar(self._player, on_expand=self._open_full)
        root.append(self._player_bar)

        # Show home by default
        self._set_page("home")

    # ------------------------------------------------------------------
    def _build_sidebar(self) -> Gtk.Box:
        sidebar = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        sidebar.set_name("sidebar")
        sidebar.set_size_request(200, -1)

        # Logo
        logo = Gtk.Label(label="🎵 GTube")
        logo.add_css_class("logo-label")
        logo.set_halign(Gtk.Align.START)
        sidebar.append(logo)

        sep = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        sep.set_margin_start(12)
        sep.set_margin_end(12)
        sep.set_margin_bottom(8)
        sidebar.append(sep)

        nav_items = [
            ("go-home-symbolic", "Home", "home"),
            ("system-search-symbolic", "Search", "search"),
            ("view-list-symbolic", "Queue", "queue"),
        ]

        self._nav_buttons = {}
        for icon, label, page in nav_items:
            btn = Gtk.Button()
            btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
            ico = Gtk.Image.new_from_icon_name(icon)
            ico.set_pixel_size(16)
            btn_box.append(ico)
            lbl = Gtk.Label(label=label)
            btn_box.append(lbl)
            btn.set_child(btn_box)
            btn.connect("clicked", lambda b, p=page: self._set_page(p))
            self._nav_buttons[page] = btn
            sidebar.append(btn)

        # Spacer
        spacer = Gtk.Box()
        spacer.set_vexpand(True)
        sidebar.append(spacer)

        # Version label
        ver = Gtk.Label(label="GTube v0.1")
        ver.add_css_class("track-duration")
        ver.set_margin_bottom(8)
        sidebar.append(ver)

        return sidebar

    # ------------------------------------------------------------------
    def _set_page(self, page: str):
        self._stack.set_visible_child_name(page)
        # Update active button styling
        for key, btn in self._nav_buttons.items():
            if key == page:
                btn.add_css_class("active")
            else:
                btn.remove_css_class("active")

        if page == "search":
            GLib.idle_add(self._search_page.focus_search)

    def _navigate(self, kind: str, browse_id: str):
        """Called by child pages to navigate to album/artist/playlist."""
        # For Phase 1, just play the browse item directly
        # Future: dedicated detail pages
        if kind == "album":
            self._ytmusic.get_album(browse_id, self._on_album_loaded)
        elif kind == "artist":
            self._ytmusic.get_artist(browse_id, self._on_artist_loaded)
        elif kind == "playlist":
            self._ytmusic.get_playlist(browse_id, self._on_playlist_loaded)

    def _on_album_loaded(self, data, err):
        if not data or err:
            return
        tracks = data.get("tracks", [])
        if tracks:
            GLib.idle_add(self._player.play_track, tracks[0], tracks)

    def _on_artist_loaded(self, data, err):
        if not data or err:
            return
        # Try to play top tracks
        songs = (data.get("songs") or {}).get("results", [])
        if songs:
            GLib.idle_add(self._player.play_track, songs[0], songs)

    def _on_playlist_loaded(self, data, err):
        if not data or err:
            return
        tracks = data.get("tracks", [])
        if tracks:
            GLib.idle_add(self._player.play_track, tracks[0], tracks)

    def _open_full(self):
        self._set_page("nowplaying")

    def _close_full(self):
        self._set_page("home")
