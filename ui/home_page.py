"""
GTube — ui/home_page.py
Home feed with carousels of music cards (Quick Picks, New Releases, etc.)
"""
import threading
import requests
from gi.repository import Gtk, GLib, GdkPixbuf, Pango


def _best_thumb(thumbs: list, size=120) -> str:
    if not thumbs:
        return ""
    best = thumbs[0]
    for t in thumbs:
        if abs(t.get("width", 0) - size) < abs(best.get("width", 0) - size):
            best = t
    return best.get("url", "")


def _load_thumb(url: str, image: Gtk.Image, size=120):
    def fetch():
        try:
            resp = requests.get(url, timeout=8)
            loader = GdkPixbuf.PixbufLoader()
            loader.write(resp.content)
            loader.close()
            pb = loader.get_pixbuf().scale_simple(size, size, GdkPixbuf.InterpType.BILINEAR)
            GLib.idle_add(image.set_from_pixbuf, pb)
        except Exception:
            pass
    threading.Thread(target=fetch, daemon=True).start()


class MusicCard(Gtk.Box):
    """Square card: thumbnail + title + subtitle."""
    def __init__(self, item: dict, on_click):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.add_css_class("music-card")
        self.set_size_request(140, -1)

        img = Gtk.Image()
        img.set_pixel_size(120)
        img.set_from_icon_name("audio-x-generic")
        self.append(img)

        thumbs = item.get("thumbnails") or []
        url = _best_thumb(thumbs, 120)
        if url:
            _load_thumb(url, img, 120)

        title = (item.get("title") or item.get("name") or "Unknown")[:30]
        t = Gtk.Label(label=title)
        t.set_halign(Gtk.Align.START)
        t.set_ellipsize(Pango.EllipsizeMode.END)
        t.add_css_class("card-title")
        self.append(t)

        artists = item.get("artists") or []
        sub = artists[0].get("name", "") if artists else item.get("subtitle", "")
        if sub:
            s = Gtk.Label(label=sub[:30])
            s.set_halign(Gtk.Align.START)
            s.set_ellipsize(Pango.EllipsizeMode.END)
            s.add_css_class("card-subtitle")
            self.append(s)

        gesture = Gtk.GestureClick.new()
        gesture.connect("released", lambda *_: (print(f"[home] card clicked: {item.get('title', 'Unknown')}"), on_click(item)))
        self.add_controller(gesture)


class SectionCarousel(Gtk.Box):
    """Horizontal scrollable row of MusicCards."""
    def __init__(self, title: str, items: list, on_item_click):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=0)

        hdr = Gtk.Label(label=title)
        hdr.set_halign(Gtk.Align.START)
        hdr.add_css_class("section-title")
        self.append(hdr)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER)
        scroll.set_margin_start(8)
        scroll.set_margin_end(8)

        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)
        for item in items[:12]:
            card = MusicCard(item, on_item_click)
            row.append(card)

        scroll.set_child(row)
        self.append(scroll)


class HomePage(Gtk.ScrolledWindow):
    def __init__(self, ytmusic, player, on_navigate):
        super().__init__()
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self._ytmusic = ytmusic
        self._player = player
        self._on_navigate = on_navigate

        self._box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        self._box.set_margin_top(8)
        self._box.set_margin_bottom(24)
        self.set_child(self._box)

        self._show_loading()
        ytmusic.get_home(self._on_home_loaded)

    def _show_loading(self):
        spinner = Gtk.Spinner()
        spinner.start()
        spinner.set_halign(Gtk.Align.CENTER)
        spinner.set_valign(Gtk.Align.CENTER)
        spinner.set_vexpand(True)
        spinner.set_margin_top(80)
        self._box.append(spinner)

    def _clear(self):
        while True:
            c = self._box.get_first_child()
            if c is None:
                break
            self._box.remove(c)

    def _on_home_loaded(self, sections, err):
        GLib.idle_add(self._render, sections, err)

    def _render(self, sections, err):
        self._clear()
        if err or not sections:
            lbl = Gtk.Label(label="Could not load feed. Check your connection.")
            lbl.add_css_class("track-artist")
            lbl.set_margin_top(80)
            lbl.set_halign(Gtk.Align.CENTER)
            self._box.append(lbl)
            return

        for section in sections:
            title = section.get("title", "")
            contents = section.get("contents", [])
            if not contents:
                continue
            carousel = SectionCarousel(title, contents, self._on_item_click)
            self._box.append(carousel)

    def _on_item_click(self, item):
        kind = item.get("resultType") or ""
        vid = item.get("videoId")
        browse = item.get("browseId") or (item.get("album") or {}).get("id")

        if vid:
            # It's a playable track
            self._player.play_track(item, queue=[item])
        elif browse:
            self._on_navigate("album", browse)
