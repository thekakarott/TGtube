"""
GTube — ui/utils.py
Shared utility functions for UI components.
"""
import threading
import requests
from urllib.parse import urlparse
from gi.repository import GLib, GdkPixbuf
from typing import Callable, Optional

# Security constants
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_SCHEMES = ['https']
ALLOWED_DOMAINS = ['ytimg.com', 'ggpht.com', 'youtube.com', 'googleusercontent.com']
ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']


def safe_fetch_image(url: str, timeout: int = 3) -> Optional[bytes]:
    """Safely fetch image with validation and size limits.
    
    Args:
        url: Image URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        Image bytes if successful, None otherwise
        
    Security:
        - Only HTTPS URLs allowed
        - Domain whitelist (YouTube/Google only)
        - Content-type validation
        - 5MB size limit with streaming
    """
    try:
        # Validate URL scheme
        parsed = urlparse(url)
        if parsed.scheme not in ALLOWED_SCHEMES:
            print(f"[security] Blocked non-HTTPS URL: {parsed.scheme}://{parsed.netloc}")
            return None
        
        # Validate domain (whitelist YouTube/Google domains)
        if not any(parsed.netloc.endswith(d) for d in ALLOWED_DOMAINS):
            print(f"[security] Blocked non-whitelisted domain: {parsed.netloc}")
            return None
        
        # Stream response to check size before downloading
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        
        # Check content type
        content_type = resp.headers.get('content-type', '').split(';')[0].lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            print(f"[security] Invalid content type: {content_type}")
            return None
        
        # Check content length if provided
        content_length = resp.headers.get('content-length')
        if content_length and int(content_length) > MAX_IMAGE_SIZE:
            print(f"[security] Image too large: {content_length} bytes (max {MAX_IMAGE_SIZE})")
            return None
        
        # Read with size limit
        content = b''
        for chunk in resp.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_IMAGE_SIZE:
                print(f"[security] Image exceeded size limit during download")
                return None
        
        return content
        
    except requests.exceptions.Timeout:
        print(f"[image] Timeout fetching: {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"[image] Request error: {e}")
        return None
    except Exception as e:
        print(f"[image] Unexpected error: {e}")
        return None


def load_thumbnail_async(url: str, size: int, callback: Callable[[Optional[GdkPixbuf.Pixbuf]], None]):
    """Load thumbnail asynchronously with security validation.
    
    Args:
        url: Image URL to fetch
        size: Target size in pixels (square)
        callback: Function to call with GdkPixbuf.Pixbuf or None
        
    Example:
        load_thumbnail_async(thumb_url, 52, self._set_art)
    """
    def fetch():
        try:
            # Fetch with security validation
            content = safe_fetch_image(url)
            if not content:
                GLib.idle_add(callback, None)
                return
            
            # Load and scale image
            loader = GdkPixbuf.PixbufLoader()
            loader.write(content)
            loader.close()
            pixbuf = loader.get_pixbuf()
            
            if pixbuf:
                scaled = pixbuf.scale_simple(
                    size, size,
                    GdkPixbuf.InterpType.BILINEAR
                )
                GLib.idle_add(callback, scaled)
            else:
                GLib.idle_add(callback, None)
                
        except Exception as e:
            print(f"[thumbnail] Load error: {e}")
            GLib.idle_add(callback, None)
    
    threading.Thread(target=fetch, daemon=True).start()


def format_time(seconds: float) -> str:
    """Format seconds as MM:SS.
    
    Args:
        seconds: Time in seconds
        
    Returns:
        Formatted time string (e.g., "3:45")
    """
    s = int(seconds)
    return f"{s // 60}:{s % 60:02d}"

# Made with Bob
