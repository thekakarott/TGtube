"""
GTube — ui/queue_view.py
Queue sidebar panel listing upcoming tracks.
"""
import threading
import requests
from gi.repository import Gtk, GLib, GdkPixbuf, Pango


class QueueRow(Gtk.Box):
    def __init__(self, track: dict, index: int, on_play):
        super().__init__(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        self.add_css_class("track-row")
        self.set_margin_top(2)
        self.set_margin_bottom(2)

        # Index label
        idx_lbl = Gtk.Label(label=str(index + 1))
        idx_lbl.set_size_request(24, -1)
        idx_lbl.add_css_class("track-duration")
        self.append(idx_lbl)

        # Info
        info = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        info.set_hexpand(True)

        title = track.get("title", "Unknown")
        artists = track.get("artists") or []
        artist = artists[0].get("name", "") if artists else ""

        t = Gtk.Label(label=title)
        t.set_halign(Gtk.Align.START)
        t.set_ellipsize(Pango.EllipsizeMode.END)
        t.add_css_class("track-title")
        info.append(t)

        a = Gtk.Label(label=artist)
        a.set_halign(Gtk.Align.START)
        a.set_ellipsize(Pango.EllipsizeMode.END)
        a.add_css_class("track-artist")
        info.append(a)

        self.append(info)

        # Play button
        play = Gtk.Button()
        play.set_icon_name("media-playback-start-symbolic")
        play.add_css_class("control-btn")
        play.connect("clicked", lambda _: on_play(track))
        self.append(play)


class QueueView(Gtk.Box):
    def __init__(self, player):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self._player = player
        self._build()
        player.connect("track-changed", lambda *_: self._refresh())

    def _build(self):
        hdr = Gtk.Label(label="Queue")
        hdr.add_css_class("section-title")
        hdr.set_halign(Gtk.Align.START)
        self.append(hdr)

        scroll = Gtk.ScrolledWindow()
        scroll.set_vexpand(True)
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)

        self._list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        scroll.set_child(self._list_box)
        self.append(scroll)

    def _refresh(self):
        while True:
            child = self._list_box.get_first_child()
            if child is None:
                break
            self._list_box.remove(child)

        for i, track in enumerate(self._player.queue):
            row = QueueRow(track, i, self._play_track)
            self._list_box.append(row)

    def _play_track(self, track):
        self._player.play_track(track)
