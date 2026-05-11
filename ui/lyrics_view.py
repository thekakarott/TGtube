"""
GTube — ui/lyrics_view.py
Lyrics panel shown inside the full Now Playing screen.
"""
from gi.repository import Gtk, Pango


class LyricsView(Gtk.ScrolledWindow):
    def __init__(self):
        super().__init__()
        self.set_name("lyrics-view")
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.set_vexpand(True)

        self._box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self._box.set_margin_start(24)
        self._box.set_margin_end(24)
        self._box.set_margin_top(16)
        self._box.set_margin_bottom(16)
        self.set_child(self._box)

        self._placeholder()

    def _placeholder(self):
        self._clear()
        lbl = Gtk.Label(label="No lyrics available")
        lbl.set_halign(Gtk.Align.CENTER)
        lbl.set_valign(Gtk.Align.CENTER)
        lbl.set_vexpand(True)
        lbl.add_css_class("track-artist")
        self._box.append(lbl)

    def _clear(self):
        while True:
            child = self._box.get_first_child()
            if child is None:
                break
            self._box.remove(child)

    def set_lyrics(self, text: str | None):
        self._clear()
        if not text:
            self._placeholder()
            return

        lines = text.strip().split("\n")
        for line in lines:
            lbl = Gtk.Label(label=line if line.strip() else " ")
            lbl.set_halign(Gtk.Align.START)
            lbl.set_wrap(True)
            lbl.set_wrap_mode(Pango.WrapMode.WORD_CHAR)
            lbl.add_css_class("lyric-line")
            self._box.append(lbl)

    def set_loading(self):
        self._clear()
        spinner = Gtk.Spinner()
        spinner.start()
        spinner.set_halign(Gtk.Align.CENTER)
        spinner.set_valign(Gtk.Align.CENTER)
        spinner.set_vexpand(True)
        self._box.append(spinner)
