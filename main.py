#!/usr/bin/env python3
"""
GTube — main.py
Entry point. Loads CSS, creates backend instances, shows window.
"""
import sys
import os
import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")

from gi.repository import Gtk, Adw, Gdk, GLib

# Allow running from project root
sys.path.insert(0, os.path.dirname(__file__))

from backend.player import Player
from backend.ytmusic import YTMusicClient
from ui.window import GtubeWindow


def load_css():
    css_path = os.path.join(os.path.dirname(__file__), "gtube.css")
    if not os.path.exists(css_path):
        return
    provider = Gtk.CssProvider()
    provider.load_from_path(css_path)
    Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(),
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
    )


class GtubeApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id="com.github.thekakarott.gtube")
        self.connect("activate", self._on_activate)

        # Shared singletons
        self._player = None
        self._ytmusic = None
        self._mpris = None

    def _on_activate(self, app):
        load_css()

        # Force dark colour scheme
        Adw.StyleManager.get_default().set_color_scheme(
            Adw.ColorScheme.FORCE_DARK
        )

        # Initialise backend
        self._player = Player()
        self._ytmusic = YTMusicClient()
        
        # Connect player to ytmusic for fallback streaming
        self._player.set_ytmusic_client(self._ytmusic)

        # MPRIS2 (best-effort — needs pydbus)
        try:
            from backend.mpris import MPRISService
            self._mpris = MPRISService(self._player)
        except Exception as e:
            print(f"[gtube] MPRIS disabled: {e}")

        # Create and show window
        win = GtubeWindow(
            player=self._player,
            ytmusic=self._ytmusic,
            application=app,
        )
        win.present()


def main():
    app = GtubeApp()
    return app.run(sys.argv)


if __name__ == "__main__":
    sys.exit(main())
