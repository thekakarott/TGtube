"""
GTube — backend/mpris.py
MPRIS2 D-Bus service so media keys, playerctl, and polybar work.
Runs in its own GLib main context thread to avoid blocking GTK.
"""
import threading
from gi.repository import GLib


MPRIS_XML = """
<node>
  <interface name="org.mpris.MediaPlayer2">
    <property name="Identity" type="s" access="read"/>
    <property name="DesktopEntry" type="s" access="read"/>
    <property name="SupportedUriSchemes" type="as" access="read"/>
    <property name="SupportedMimeTypes" type="as" access="read"/>
    <property name="CanQuit" type="b" access="read"/>
    <property name="CanRaise" type="b" access="read"/>
    <property name="HasTrackList" type="b" access="read"/>
    <method name="Quit"/>
    <method name="Raise"/>
  </interface>
  <interface name="org.mpris.MediaPlayer2.Player">
    <property name="PlaybackStatus" type="s" access="read"/>
    <property name="LoopStatus" type="s" access="readwrite"/>
    <property name="Rate" type="d" access="readwrite"/>
    <property name="Shuffle" type="b" access="readwrite"/>
    <property name="Metadata" type="a{sv}" access="read"/>
    <property name="Volume" type="d" access="readwrite"/>
    <property name="Position" type="x" access="read"/>
    <property name="MinimumRate" type="d" access="read"/>
    <property name="MaximumRate" type="d" access="read"/>
    <property name="CanGoNext" type="b" access="read"/>
    <property name="CanGoPrevious" type="b" access="read"/>
    <property name="CanPlay" type="b" access="read"/>
    <property name="CanPause" type="b" access="read"/>
    <property name="CanSeek" type="b" access="read"/>
    <property name="CanControl" type="b" access="read"/>
    <method name="Next"/>
    <method name="Previous"/>
    <method name="Pause"/>
    <method name="PlayPause"/>
    <method name="Stop"/>
    <method name="Play"/>
    <method name="Seek"><arg direction="in" type="x" name="Offset"/></method>
    <method name="SetPosition">
      <arg direction="in" type="o" name="TrackId"/>
      <arg direction="in" type="x" name="Position"/>
    </method>
  </interface>
</node>
"""


class MPRISService:
    def __init__(self, player):
        self._player = player
        self._bus = None
        self._loop = None
        self._metadata = {
            "mpris:trackid": GLib.Variant("o", "/com/gtube/track/none"),
            "xesam:title": GLib.Variant("s", ""),
            "xesam:artist": GLib.Variant("as", []),
            "mpris:artUrl": GLib.Variant("s", ""),
        }
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

        # Connect to player signals
        player.connect("track-changed", self._on_track_changed)
        player.connect("state-changed", self._on_state_changed)

    def _run(self):
        try:
            import pydbus
            self._loop = GLib.MainLoop()
            self._bus = pydbus.SessionBus()
            self._bus.publish("org.mpris.MediaPlayer2.gtube", self)
            self._loop.run()
        except Exception as e:
            print(f"[mpris] D-Bus error: {e}")

    def _on_track_changed(self, player, vid, title, artist, thumb):
        self._metadata = {
            "mpris:trackid": GLib.Variant("o", f"/com/gtube/track/{vid}"),
            "xesam:title": GLib.Variant("s", title),
            "xesam:artist": GLib.Variant("as", [artist]),
            "mpris:artUrl": GLib.Variant("s", thumb),
        }

    def _on_state_changed(self, player, is_playing):
        pass  # properties are read live

    # ---- org.mpris.MediaPlayer2 ----
    @property
    def Identity(self): return "GTube"
    @property
    def DesktopEntry(self): return "gtube"
    @property
    def CanQuit(self): return False
    @property
    def CanRaise(self): return False
    @property
    def HasTrackList(self): return False
    @property
    def SupportedUriSchemes(self): return ["https"]
    @property
    def SupportedMimeTypes(self): return ["audio/mpeg"]
    def Quit(self): pass
    def Raise(self): pass

    # ---- org.mpris.MediaPlayer2.Player ----
    @property
    def PlaybackStatus(self):
        return "Playing" if self._player.is_playing else "Paused"
    @property
    def LoopStatus(self): return "None"
    @LoopStatus.setter
    def LoopStatus(self, v): pass
    @property
    def Rate(self): return 1.0
    @Rate.setter
    def Rate(self, v): pass
    @property
    def Shuffle(self): return False
    @Shuffle.setter
    def Shuffle(self, v): pass
    @property
    def Metadata(self): return self._metadata
    @property
    def Volume(self): return self._player.volume / 100.0
    @Volume.setter
    def Volume(self, v): self._player.set_volume(v * 100)
    @property
    def Position(self): return int(self._player.position * 1_000_000)
    @property
    def MinimumRate(self): return 1.0
    @property
    def MaximumRate(self): return 1.0
    @property
    def CanGoNext(self): return True
    @property
    def CanGoPrevious(self): return True
    @property
    def CanPlay(self): return True
    @property
    def CanPause(self): return True
    @property
    def CanSeek(self): return True
    @property
    def CanControl(self): return True

    def Next(self): GLib.idle_add(self._player.next)
    def Previous(self): GLib.idle_add(self._player.prev)
    def Pause(self):
        if self._player.is_playing:
            GLib.idle_add(self._player.play_pause)
    def Play(self):
        if not self._player.is_playing:
            GLib.idle_add(self._player.play_pause)
    def PlayPause(self): GLib.idle_add(self._player.play_pause)
    def Stop(self): GLib.idle_add(self._player.play_pause)
    def Seek(self, offset): pass
    def SetPosition(self, track_id, position):
        GLib.idle_add(self._player.seek, position / 1_000_000)
