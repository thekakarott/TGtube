"""
GTube — ui/home_page.py
Home feed with carousels of music cards (Quick Picks, New Releases, etc.)
"""
from gi.repository import Gtk, GLib, Pango
from ui.utils import load_thumbnail_async


def _best_thumb(thumbs: list, size=120) -> str:
    if not thumbs:
        return ""
    best = thumbs[0]
    for t in thumbs:
        if abs(t.get("width", 0) - size) < abs(best.get("width", 0) - size):
            best = t
    return best.get("url", "")


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
            load_thumbnail_async(url, 120, img.set_from_pixbuf)

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
        self._sections = []  # Store sections for queue building

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

        # Store sections for queue building
        self._sections = sections

        for section in sections:
            title = section.get("title", "")
            contents = section.get("contents", [])
            if not contents:
                continue
            carousel = SectionCarousel(title, contents, self._on_item_click)
            self._box.append(carousel)

    def _on_item_click(self, item):
        """Handle item click with comprehensive error handling and logging."""
        try:
            title = item.get('title') or item.get('name') or 'Unknown'
            print(f"\n[home] ===== Item Clicked =====")
            print(f"[home] Title: {title}")
            print(f"[home] Type: {item.get('resultType', 'unknown')}")
            print(f"[home] Keys: {list(item.keys())}")
            
            # Extract all possible identifiers
            vid = item.get("videoId")
            browse_id = item.get("browseId")
            playlist_id = item.get("playlistId")
            album = item.get("album")
            
            print(f"[home] videoId: {vid}")
            print(f"[home] browseId: {browse_id}")
            print(f"[home] playlistId: {playlist_id}")
            print(f"[home] album: {album}")
            
            if vid:
                # It's a playable track
                print(f"[home] Handling as playable track")
                self._handle_track_click(item)
            elif browse_id:
                # It's an album, artist, or playlist
                print(f"[home] Handling as browse item (album/artist/playlist)")
                self._handle_browse_click(item, browse_id)
            elif playlist_id:
                # It's a playlist
                print(f"[home] Handling as playlist")
                self._handle_playlist_click(item, playlist_id)
            elif album and isinstance(album, dict) and album.get("id"):
                # Album nested in item
                print(f"[home] Handling as nested album")
                self._handle_browse_click(item, album["id"])
            else:
                print(f"[home] WARNING: Item has no playable content or browse ID")
                print(f"[home] Full item data: {item}")
                
        except Exception as e:
            print(f"[home] ERROR handling item click: {e}")
            import traceback
            traceback.print_exc()
    
    def _handle_track_click(self, item):
        """Handle click on a playable track."""
        try:
            # Build queue from current section using videoId comparison
            queue = self._build_queue_for_item(item)
            print(f"[home] Playing track with queue of {len(queue)} items")
            self._player.play_track(item, queue=queue)
        except Exception as e:
            print(f"[home] ERROR playing track: {e}")
            import traceback
            traceback.print_exc()
    
    def _build_queue_for_item(self, item) -> list[dict]:
        """Build queue for an item by finding its section.
        
        Uses videoId comparison instead of object identity to handle
        different data structures across sections.
        """
        item_vid = item.get("videoId")
        if not item_vid:
            print(f"[home] No videoId for item, returning single-item queue")
            return [item]
        
        print(f"[home] Looking for section containing videoId: {item_vid}")
        
        # Find the section containing this item
        for section in getattr(self, '_sections', []):
            section_title = section.get("title", "Unknown")
            contents = section.get("contents", [])
            
            # Compare by videoId instead of object identity
            for content in contents:
                if content.get("videoId") == item_vid:
                    # Found the section - build queue from all playable items
                    queue = [c for c in contents if c.get("videoId")]
                    print(f"[home] ✓ Found section '{section_title}': {len(queue)} playable tracks")
                    return queue
        
        # Fallback to single item
        print(f"[home] Could not find section for item, using single-item queue")
        return [item]
    
    def _handle_browse_click(self, item, browse_id):
        """Handle click on album/artist/playlist."""
        try:
            print(f"[home] Navigating to browse ID: {browse_id}")
            self._on_navigate("album", browse_id)
        except Exception as e:
            print(f"[home] ERROR navigating to browse item: {e}")
            import traceback
            traceback.print_exc()
    
    def _handle_playlist_click(self, item, playlist_id):
        """Handle click on playlist."""
        try:
            print(f"[home] Loading playlist: {playlist_id}")
            # TODO: Implement playlist loading
            print(f"[home] WARNING: Playlist loading not yet implemented")
        except Exception as e:
            print(f"[home] ERROR handling playlist: {e}")
            import traceback
            traceback.print_exc()
