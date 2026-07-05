"""
GTube — ui/error_boundary.py
Error boundary system for graceful error handling in UI components.
"""
from gi.repository import Gtk, Adw, GLib
from functools import wraps
import traceback
from typing import Callable, Optional
from backend.logger import get_logger

logger = get_logger('ui.error_boundary')


def error_boundary(show_dialog: bool = True, fallback_value=None):
    """Decorator to catch and handle UI errors gracefully.
    
    This decorator wraps UI methods to catch exceptions and handle them
    appropriately, preventing crashes and providing user feedback.
    
    Args:
        show_dialog: Whether to show error dialog to user
        fallback_value: Value to return on error (default: None)
    
    Usage:
        @error_boundary(show_dialog=True)
        def on_button_clicked(self, button):
            # Code that might raise exceptions
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Log the error
                logger.error(f"Error in {func.__name__}: {e}", exc_info=True)
                
                # Show dialog if requested
                if show_dialog and args:
                    # Try to get the window from the first argument (usually self)
                    widget = args[0] if args else None
                    if widget and hasattr(widget, 'get_root'):
                        window = widget.get_root()
                        if window:
                            GLib.idle_add(show_error_dialog, window, str(e), func.__name__)
                
                return fallback_value
        return wrapper
    return decorator


def async_error_boundary(callback: Optional[Callable] = None):
    """Decorator for async operations with error handling.
    
    Args:
        callback: Optional callback to call on error
    
    Usage:
        @async_error_boundary(callback=lambda e: print(f"Error: {e}"))
        def load_data_async(self):
            # Async code
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Async error in {func.__name__}: {e}", exc_info=True)
                if callback:
                    try:
                        callback(e)
                    except Exception as cb_error:
                        logger.error(f"Error in error callback: {cb_error}")
                return None
        return wrapper
    return decorator


def show_error_dialog(parent, message: str, context: str = ""):
    """Show error dialog to user.
    
    Args:
        parent: Parent window
        message: Error message
        context: Context where error occurred
    """
    try:
        dialog = Adw.MessageDialog.new(parent)
        dialog.set_heading("Error")
        
        # Format message
        if context:
            body = f"An error occurred in {context}:\n\n{message}"
        else:
            body = f"An error occurred:\n\n{message}"
        
        dialog.set_body(body)
        dialog.add_response("ok", "OK")
        dialog.set_default_response("ok")
        dialog.set_close_response("ok")
        
        dialog.present()
        
    except Exception as e:
        logger.error(f"Failed to show error dialog: {e}")
        # Fallback to console
        print(f"ERROR: {message}")


def show_warning_dialog(parent, message: str, title: str = "Warning"):
    """Show warning dialog to user.
    
    Args:
        parent: Parent window
        message: Warning message
        title: Dialog title
    """
    try:
        dialog = Adw.MessageDialog.new(parent)
        dialog.set_heading(title)
        dialog.set_body(message)
        dialog.add_response("ok", "OK")
        dialog.set_default_response("ok")
        dialog.set_close_response("ok")
        
        dialog.present()
        
    except Exception as e:
        logger.error(f"Failed to show warning dialog: {e}")


def show_info_dialog(parent, message: str, title: str = "Information"):
    """Show information dialog to user.
    
    Args:
        parent: Parent window
        message: Info message
        title: Dialog title
    """
    try:
        dialog = Adw.MessageDialog.new(parent)
        dialog.set_heading(title)
        dialog.set_body(message)
        dialog.add_response("ok", "OK")
        dialog.set_default_response("ok")
        dialog.set_close_response("ok")
        
        dialog.present()
        
    except Exception as e:
        logger.error(f"Failed to show info dialog: {e}")


def show_confirmation_dialog(parent, message: str, title: str, on_confirm: Callable):
    """Show confirmation dialog with Yes/No buttons.
    
    Args:
        parent: Parent window
        message: Confirmation message
        title: Dialog title
        on_confirm: Callback to call if user confirms
    """
    try:
        dialog = Adw.MessageDialog.new(parent)
        dialog.set_heading(title)
        dialog.set_body(message)
        dialog.add_response("cancel", "Cancel")
        dialog.add_response("confirm", "Confirm")
        dialog.set_default_response("confirm")
        dialog.set_close_response("cancel")
        
        def on_response(dialog, response):
            if response == "confirm":
                try:
                    on_confirm()
                except Exception as e:
                    logger.error(f"Error in confirmation callback: {e}")
                    show_error_dialog(parent, str(e))
        
        dialog.connect("response", on_response)
        dialog.present()
        
    except Exception as e:
        logger.error(f"Failed to show confirmation dialog: {e}")


class ErrorBoundary:
    """Context manager for error boundaries.
    
    Usage:
        with ErrorBoundary("Loading data"):
            # Code that might raise exceptions
            load_data()
    """
    
    def __init__(self, context: str, show_dialog: bool = False, parent=None):
        self.context = context
        self.show_dialog = show_dialog
        self.parent = parent
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            logger.error(f"Error in {self.context}: {exc_val}", exc_info=True)
            
            if self.show_dialog and self.parent:
                GLib.idle_add(show_error_dialog, self.parent, str(exc_val), self.context)
            
            # Return True to suppress the exception
            return True
        return False


def safe_callback(func: Callable, *args, **kwargs):
    """Execute a callback safely with error handling.
    
    Args:
        func: Callback function
        *args: Positional arguments
        **kwargs: Keyword arguments
    
    Returns:
        Result of callback or None on error
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Error in callback {func.__name__}: {e}", exc_info=True)
        return None


def retry_on_error(max_attempts: int = 3, delay_ms: int = 1000):
    """Decorator to retry operations on failure.
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay_ms: Delay between retries in milliseconds
    
    Usage:
        @retry_on_error(max_attempts=3, delay_ms=1000)
        def fetch_data(self):
            # Code that might fail
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_attempts} failed for {func.__name__}: {e}"
                    )
                    
                    if attempt < max_attempts - 1:
                        # Wait before retry
                        import time
                        time.sleep(delay_ms / 1000.0)
            
            # All attempts failed
            logger.error(f"All {max_attempts} attempts failed for {func.__name__}: {last_error}")
            raise last_error
        
        return wrapper
    return decorator

# Made with Bob
