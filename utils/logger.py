"""
Structured logging utility for the trading system.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from config.settings import settings

# Create logs directory if it doesn't exist
LOG_DIR = Path(__file__).parent.parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# Configure log file name with timestamp
LOG_FILE = LOG_DIR / f'trading_system_{datetime.now().strftime("%Y%m%d")}.log'


def setup_logger(name: str, log_level: str = None) -> logging.Logger:
    """
    Set up a structured logger with both file and console handlers.
    
    Args:
        name: Logger name (typically __name__)
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Don't add handlers if logger already has them
    if logger.handlers:
        return logger
    
    # Set log level
    level = getattr(logging, log_level or settings.LOG_LEVEL, logging.INFO)
    logger.setLevel(level)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    console_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # File handler (detailed logs)
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)
    logger.addHandler(file_handler)
    
    # Console handler (simpler format)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    return logger


# Create default logger
default_logger = setup_logger('trading_system')