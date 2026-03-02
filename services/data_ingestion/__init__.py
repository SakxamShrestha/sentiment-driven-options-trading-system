"""
Data ingestion layer: Alpaca News WebSocket, LunarCrush, Twitter/X, Reddit.
"""

from .twitter_service import TwitterStreamService
from .reddit_service import RedditService
from .alpaca_news_service import AlpacaNewsStreamService, fetch_news_rest
from .lunarcrush_service import LunarCrushService
from .multi_source_service import fetch_all_sources

__all__ = [
    "TwitterStreamService",
    "RedditService",
    "AlpacaNewsStreamService",
    "fetch_news_rest",
    "LunarCrushService",
    "fetch_all_sources",
]