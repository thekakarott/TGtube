"""
GTube — ui/search_page.py
Search page: text entry + tabbed results (Songs / Albums / Artists / Playlists).
"""
from gi.repository import Gtk, GLib, Pango
from ui.utils import load_thumbnail_async


def _best_thumb(thumbs, size=56):
    if not thumbs:
        return ""
    return thumbs[-1].get("url", "")


class TrackRow(Gtk.Box):
    def __init__(self, track: dict, on_play):
        super().__init__(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.add_css_class("track-row")

        img = Gtk.Image()
        img.set_pixel_size(48)
        img.set_from_icon_name("audio-x-generic")
        self.append(img)

        thumbs = track.get("thumbnails") or []
        if thumbs:
            load_thumbnail_async(thumbs[-1]["url"], 48, img.set_from_pixbuf)

        info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        info.set_hexpand(True)

        t = Gtk.Label(label=track.get("title", "Unknown"))
        t.set_halign(Gtk.Align.START)
        t.set_ellipsize(Pango.EllipsizeMode.END)
        t.add_css_class("track-title")
        info.append(t)

        artists = track.get("artists") or []
        artist_str = ", ".join(a.get("name", "") for a in artists)
        album = (track.get("album") or {}).get("name", "")
        sub = f"{artist_str}  •  {album}" if album else artist_str

        a = Gtk.Label(label=sub)
        a.set_halign(Gtk.Align.START)
        a.set_ellipsize(Pango.EllipsizeMode.END)
        a.add_css_class("track-artist")
        info.append(a)
        self.append(info)

        dur = track.get("duration", "")
        if dur:
            d = Gtk.Label(label=dur)
            d.add_css_class("track-duration")
            d.set_valign(Gtk.Align.CENTER)
            self.append(d)

        play = Gtk.Button()
        play.set_icon_name("media-playback-start-symbolic")
        play.add_css_class("control-btn")
        play.connect("clicked", lambda _: (print(f"[search] track button clicked: {track.get('title', 'Unknown')}"), on_play(track)))
        self.append(play)


class CardRow(Gtk.Box):
    """Generic card row for albums / artists / playlists."""
    def __init__(self, item: dict, on_click):
        super().__init__(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.add_css_class("track-row")

        img = Gtk.Image()
        img.set_pixel_size(48)
        img.set_from_icon_name("audio-x-generic")
        self.append(img)

        thumbs = item.get("thumbnails") or []
        if thumbs:
            load_thumbnail_async(thumbs[-1]["url"], 48, img.set_from_pixbuf)

        info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        info.set_hexpand(True)

        name = item.get("title") or item.get("artist") or item.get("name") or "Unknown"
        t = Gtk.Label(label=name)
        t.set_halign(Gtk.Align.START)
        t.set_ellipsize(Pango.EllipsizeMode.END)
        t.add_css_class("track-title")
        info.append(t)

        artists = item.get("artists") or []
        sub = ", ".join(a.get("name", "") for a in artists) if artists else item.get("type", "")
        if sub:
            s = Gtk.Label(label=sub)
            s.set_halign(Gtk.Align.START)
            s.set_ellipsize(Pango.EllipsizeMode.END)
            s.add_css_class("track-artist")
            info.append(s)

        self.append(info)

        g = Gtk.GestureClick.new()
        g.connect("released", lambda *_: on_click(item))
        self.add_controller(g)


def _make_list(items, row_factory):
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
    box.set_margin_start(8)
    box.set_margin_end(8)
    box.set_margin_top(8)
    for item in items:
        row = row_factory(item)
        box.append(row)
    return box


class SearchPage(Gtk.Box):
    def __init__(self, ytmusic, player, on_navigate):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self._ytmusic = ytmusic
        self._player = player
        self._on_navigate = on_navigate
        self._results = {}
        self._current_songs = []  # Store current song results for queue
        self._build()

    def _build(self):
        # Search entry
        entry_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        entry_box.set_margin_start(16)
        entry_box.set_margin_end(16)
        entry_box.set_margin_top(16)
        entry_box.set_margin_bottom(12)

        self._entry = Gtk.SearchEntry()
        self._entry.set_hexpand(True)
        self._entry.set_placeholder_text("Search songs, albums, artists…")
        self._entry.connect("search-changed", self._on_search_changed)
        self._entry.connect("activate", self._on_activate)
        entry_box.append(self._entry)
        self.append(entry_box)

        # Tab bar
        self._tabs = Gtk.Notebook()
        self._tabs.set_vexpand(True)
        self._tabs.set_tab_pos(Gtk.PositionType.TOP)
        self.append(self._tabs)

        self._tab_scrolls = {}
        for label in ("Songs", "Albums", "Artists", "Playlists"):
            scroll = Gtk.ScrolledWindow()
            scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
            scroll.set_vexpand(True)
            lbl = Gtk.Label(label=label)
            self._tabs.append_page(scroll, lbl)
            self._tab_scrolls[label.lower()] = scroll

        self._show_empty()

    def _show_empty(self):
        for key, scroll in self._tab_scrolls.items():
            box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
            lbl = Gtk.Label(label="Search for music above")
            lbl.set_halign(Gtk.Align.CENTER)
            lbl.set_valign(Gtk.Align.CENTER)
            lbl.set_vexpand(True)
            lbl.set_margin_top(60)
            lbl.add_css_class("track-artist")
            box.append(lbl)
            scroll.set_child(box)

    def _show_loading(self):
        for scroll in self._tab_scrolls.values():
            sp = Gtk.Spinner()
            sp.start()
            sp.set_halign(Gtk.Align.CENTER)
            sp.set_valign(Gtk.Align.CENTER)
            sp.set_vexpand(True)
            sp.set_margin_top(60)
            scroll.set_child(sp)

    def _on_search_changed(self, entry):
        pass  # Could add debounce here

    def _on_activate(self, entry):
        query = entry.get_text().strip()
        if not query:
            return
        self._show_loading()
        self._ytmusic.search_all(query, self._on_results)

    def _on_results(self, results, err):
        GLib.idle_add(self._render, results)

    def _render(self, results):
        # Songs - store for queue building
        songs = results.get("songs", [])
        self._current_songs = songs
        if songs:
            lst = _make_list(songs, lambda t: TrackRow(t, self._play_track))
            self._tab_scrolls["songs"].set_child(lst)
        else:
            self._set_empty("songs")

        # Albums
        albums = results.get("albums", [])
        if albums:
            lst = _make_list(albums, lambda a: CardRow(a, self._on_album_click))
            self._tab_scrolls["albums"].set_child(lst)
        else:
            self._set_empty("albums")

        # Artists
        artists = results.get("artists", [])
        if artists:
            lst = _make_list(artists, lambda a: CardRow(a, self._on_artist_click))
            self._tab_scrolls["artists"].set_child(lst)
        else:
            self._set_empty("artists")

        # Playlists
        playlists = results.get("playlists", [])
        if playlists:
            lst = _make_list(playlists, lambda p: CardRow(p, self._on_playlist_click))
            self._tab_scrolls["playlists"].set_child(lst)
        else:
            self._set_empty("playlists")

    def _set_empty(self, key):
        lbl = Gtk.Label(label="No results")
        lbl.set_halign(Gtk.Align.CENTER)
        lbl.set_valign(Gtk.Align.CENTER)
        lbl.set_vexpand(True)
        lbl.set_margin_top(60)
        lbl.add_css_class("track-artist")
        self._tab_scrolls[key].set_child(lbl)

    def _play_track(self, track):
        # Use all search results as queue for better experience
        queue = self._current_songs if self._current_songs else [track]
        self._player.play_track(track, queue=queue)

    def _on_album_click(self, item):
        bid = item.get("browseId")
        if bid:
            self._on_navigate("album", bid)

    def _on_artist_click(self, item):
        bid = item.get("browseId")
        if bid:
            self._on_navigate("artist", bid)

    def _on_playlist_click(self, item):
        pid = item.get("browseId") or item.get("playlistId")
        if pid:
            self._on_navigate("playlist", pid)

    def focus_search(self):
        self._entry.grab_focus()
