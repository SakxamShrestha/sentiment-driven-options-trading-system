"""
Alpaca News WebSocket stream for real-time financial news.
Stream URL: wss://stream.data.alpaca.markets/v1beta1/news (prod)
           wss://stream.data.sandbox.alpaca.markets/v1beta1/news (sandbox)
"""

import json
import threading
from datetime import datetime
from typing import Callable, Optional

from config.settings import settings
from utils.logger import setup_logger
from models.news_item import NewsItem

logger = setup_logger(__name__)

# Use websocket-client for Alpaca news stream
try:
    import websocket
except ImportError:
    websocket = None  # type: ignore


class AlpacaNewsStreamService:
    """
    Connects to Alpaca News WebSocket and forwards news items to a callback.
    """

    PROD_URL = "wss://stream.data.alpaca.markets/v1beta1/news"
    SANDBOX_URL = "wss://stream.data.sandbox.alpaca.markets/v1beta1/news"

    def __init__(self, on_news: Callable[[NewsItem], None]):
        self.on_news = on_news
        self._ws: Optional[object] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._key = settings.ALPACA_API_KEY
        self._secret = settings.ALPACA_SECRET_KEY
        self._base_url = settings.ALPACA_STREAM_NEWS_URL.strip() or self.SANDBOX_URL

    def _parse_ts(self, s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None

    def _to_news_item(self, raw: dict) -> Optional[NewsItem]:
        try:
            return NewsItem(
                source="alpaca",
                article_id=str(raw.get("id", raw.get("key", ""))),
                headline=raw.get("headline", ""),
                summary=raw.get("summary"),
                author=raw.get("author"),
                created_at=self._parse_ts(raw.get("created_at")),
                updated_at=self._parse_ts(raw.get("updated_at")),
                url=raw.get("url"),
                symbols=raw.get("symbols", []) or [],
                raw=raw,
            )
        except Exception as e:
            logger.debug("Skip invalid news payload: %s", e)
            return None

    def _on_message(self, _ws, message):
        try:
            data = json.loads(message)
            # Stream can send list of news or single object
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict):
                    news = self._to_news_item(item)
                    if news:
                        self.on_news(news)
        except Exception as e:
            logger.error("Alpaca news message error: %s", e, exc_info=True)

    def _on_error(self, _ws, error):
        logger.error("Alpaca news WebSocket error: %s", error)

    def _on_close(self, _ws, close_status_code, close_msg):
        logger.info("Alpaca news WebSocket closed: %s %s", close_status_code, close_msg)
        self._running = False

    def _on_open(self, ws):
        # Authenticate: send auth message per Alpaca stream API
        auth_msg = {
            "action": "auth",
            "key": self._key,
            "secret": self._secret,
        }
        ws.send(json.dumps(auth_msg))
        # Subscribe to all news (use "news" or symbol-specific if needed)
        sub_msg = {"action": "subscribe", "news": ["*"]}
        ws.send(json.dumps(sub_msg))
        logger.info("Alpaca news WebSocket connected and subscribed")

    def start(self) -> bool:
        if not self._key or not self._secret:
            logger.error("ALPACA_API_KEY and ALPACA_SECRET_KEY required for news stream")
            return False
        if websocket is None:
            logger.error("websocket-client not installed. pip install websocket-client")
            return False

        def run():
            self._running = True
            self._ws = websocket.WebSocketApp(
                self._base_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open,
            )
            self._ws.run_forever()

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        return True

    def stop(self) -> None:
        self._running = False
        if self._ws:
            try:
                self._ws.close()
            except Exception as e:
                logger.debug("Alpaca news close: %s", e)
            self._ws = None


def fetch_news_rest(symbols: list, limit: int = 10) -> list:
    """
    Fallback: fetch recent news via Alpaca REST API (no WebSocket).
    Requires alpaca-trade-api or requests.
    """
    from config.settings import settings
    import os
    try:
        import requests
    except ImportError:
        logger.warning("requests not installed; REST news fetch skipped")
        return []
    base = "https://data.alpaca.markets"
    if "sandbox" in (settings.ALPACA_BASE_URL or "").lower():
        base = "https://data.sandbox.alpaca.markets"
    url = f"{base}/v1beta1/news"
    params = {"symbols": ",".join(symbols)[:100], "limit": limit}
    headers = {
        "APCA-API-KEY-ID": settings.ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": settings.ALPACA_SECRET_KEY,
    }
    try:
        r = requests.get(url, params=params, headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        news_list = data.get("news", [])
        return [NewsItem(
            source="alpaca",
            article_id=str(n.get("id", "")),
            headline=n.get("headline", ""),
            summary=n.get("summary"),
            author=n.get("author"),
            created_at=datetime.fromisoformat(n["created_at"].replace("Z", "+00:00")) if n.get("created_at") else None,
            updated_at=datetime.fromisoformat(n["updated_at"].replace("Z", "+00:00")) if n.get("updated_at") else None,
            url=n.get("url"),
            symbols=n.get("symbols", []),
            raw=n,
        ) for n in news_list]
    except Exception as e:
        logger.warning("Alpaca REST news fetch failed: %s", e)
        return []
