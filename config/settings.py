"""
Application settings and configuration management.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application configuration settings."""
    
    # Project paths
    BASE_DIR = Path(__file__).parent.parent
    DATA_DIR = BASE_DIR / 'data'
    STREAMS_DIR = DATA_DIR / 'streams'
    HISTORICAL_DIR = DATA_DIR / 'historical'
    
    # Alpaca API
    ALPACA_API_KEY = os.getenv('ALPACA_API_KEY', '')
    ALPACA_SECRET_KEY = os.getenv('ALPACA_SECRET_KEY', '')
    ALPACA_BASE_URL = os.getenv('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets')
    
    # Twitter/X API
    TWITTER_BEARER_TOKEN = os.getenv('TWITTER_BEARER_TOKEN', '')
    TWITTER_API_KEY = os.getenv('TWITTER_API_KEY', '')
    TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET', '')
    TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN', '')
    TWITTER_ACCESS_TOKEN_SECRET = os.getenv('TWITTER_ACCESS_TOKEN_SECRET', '')
    
    # Reddit API
    REDDIT_CLIENT_ID = os.getenv('REDDIT_CLIENT_ID', '')
    REDDIT_CLIENT_SECRET = os.getenv('REDDIT_CLIENT_SECRET', '')
    REDDIT_USER_AGENT = os.getenv('REDDIT_USER_AGENT', 'StockTracker/1.0')
    
    # Groq API
    GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
    
    # Anthropic API
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    
    # Redis
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    REDIS_DB = int(os.getenv('REDIS_DB', 0))
    REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')
    
    # Trading Configuration
    DEFAULT_TICKER = os.getenv('DEFAULT_TICKER', 'SPY')
    OPTIONS_EXPIRATION_TYPE = os.getenv('OPTIONS_EXPIRATION_TYPE', '0DTE')
    MAX_POSITION_SIZE = float(os.getenv('MAX_POSITION_SIZE', '1000'))
    MAX_DAILY_TRADES = int(os.getenv('MAX_DAILY_TRADES', '10'))
    ENABLE_LIVE_TRADING = os.getenv('ENABLE_LIVE_TRADING', 'false').lower() == 'true'
    
    # Performance Targets
    TARGET_LATENCY_MS = int(os.getenv('TARGET_LATENCY_MS', '200'))
    SENTIMENT_THRESHOLD_BULLISH = float(os.getenv('SENTIMENT_THRESHOLD_BULLISH', '0.6'))
    SENTIMENT_THRESHOLD_BEARISH = float(os.getenv('SENTIMENT_THRESHOLD_BEARISH', '-0.6'))
    MIN_CONFIDENCE_SCORE = float(os.getenv('MIN_CONFIDENCE_SCORE', '0.7'))
    
    # Flask Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Monitoring
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    METRICS_ENABLED = os.getenv('METRICS_ENABLED', 'true').lower() == 'true'


# Global settings instance
settings = Settings()
