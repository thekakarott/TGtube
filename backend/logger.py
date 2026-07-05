"""
GTube — backend/logger.py
Centralized logging system with multiple severity levels and file rotation.
"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler


class GTubeLogger:
    """Centralized logging system for GTube application.
    
    Features:
    - Multiple severity levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - Console output for INFO and above
    - File logging for DEBUG and above with rotation
    - Structured log format with timestamps
    - Automatic log directory creation
    - Log file rotation (10MB max, 5 backups)
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup logging configuration with console and file handlers."""
        # Create log directory
        log_dir = Path.home() / '.local' / 'share' / 'gtube' / 'logs'
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Log file with date
        log_file = log_dir / f'gtube_{datetime.now():%Y%m%d}.log'
        
        # Root logger configuration
        root_logger = logging.getLogger('gtube')
        root_logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers to avoid duplicates
        root_logger.handlers.clear()
        
        # Console handler - INFO and above
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_format = logging.Formatter(
            '[%(levelname)s] %(name)s: %(message)s'
        )
        console_handler.setFormatter(console_format)
        
        # File handler - DEBUG and above with rotation
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_format)
        
        # Add handlers
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)
        
        # Log startup
        root_logger.info("=" * 60)
        root_logger.info(f"GTube logging initialized - {datetime.now():%Y-%m-%d %H:%M:%S}")
        root_logger.info(f"Log file: {log_file}")
        root_logger.info("=" * 60)
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get a logger for a specific module.
        
        Args:
            name: Module name (e.g., 'player', 'ui.home_page')
            
        Returns:
            Logger instance for the module
        """
        return logging.getLogger(f'gtube.{name}')


# Global logger instance
_logger_instance = None


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a specific module.
    
    This is the main entry point for getting loggers throughout the application.
    
    Usage:
        from backend.logger import get_logger
        logger = get_logger('player')
        logger.info("Playback started")
        logger.error("Failed to load track", exc_info=True)
    
    Args:
        name: Module name (e.g., 'player', 'ui.home_page')
        
    Returns:
        Logger instance for the module
    """
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = GTubeLogger()
    return _logger_instance.get_logger(name)


def log_exception(logger: logging.Logger, message: str, exc: Exception):
    """Log an exception with full traceback.
    
    Args:
        logger: Logger instance
        message: Context message
        exc: Exception to log
    """
    logger.error(f"{message}: {exc}", exc_info=True)


def log_performance(logger: logging.Logger, operation: str, duration_ms: float):
    """Log performance metrics.
    
    Args:
        logger: Logger instance
        operation: Operation name
        duration_ms: Duration in milliseconds
    """
    if duration_ms > 1000:
        logger.warning(f"SLOW: {operation} took {duration_ms:.2f}ms")
    elif duration_ms > 100:
        logger.info(f"Performance: {operation} took {duration_ms:.2f}ms")
    else:
        logger.debug(f"Performance: {operation} took {duration_ms:.2f}ms")


# Convenience functions for common logging patterns
def log_user_action(logger: logging.Logger, action: str, **kwargs):
    """Log user actions for analytics.
    
    Args:
        logger: Logger instance
        action: Action name (e.g., 'play_track', 'skip_track')
        **kwargs: Additional context
    """
    context = ', '.join(f"{k}={v}" for k, v in kwargs.items())
    logger.info(f"USER_ACTION: {action} ({context})")


def log_api_call(logger: logging.Logger, endpoint: str, duration_ms: float, success: bool):
    """Log API calls for monitoring.
    
    Args:
        logger: Logger instance
        endpoint: API endpoint
        duration_ms: Request duration
        success: Whether request succeeded
    """
    status = "SUCCESS" if success else "FAILED"
    logger.info(f"API: {endpoint} - {status} ({duration_ms:.2f}ms)")


def log_state_change(logger: logging.Logger, component: str, old_state: str, new_state: str):
    """Log state changes for debugging.
    
    Args:
        logger: Logger instance
        component: Component name
        old_state: Previous state
        new_state: New state
    """
    logger.debug(f"STATE: {component} {old_state} → {new_state}")

# Made with Bob
