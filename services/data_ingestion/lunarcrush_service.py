"""
LunarCrush API client for social sentiment and buzz metrics.
API: https://lunarcrush.com/api4 (REST, API key required)
"""

from typing import Any, Callable, Dict, Optional

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

try:
    import requests
except ImportError:
    requests = None  # type: ignore


class LunarCrushService:
    """
    Fetches social buzz and sentiment metrics from LunarCrush API.
    Use for dashboard "buzz" metrics and optional signal input.
    """

    BASE_URL = "https://lunarcrush.com/api4"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.LUNARCRUSH_API_KEY
        self._session = requests.Session() if requests else None

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict]:
        if not self.api_key:
            logger.debug("LUNARCRUSH_API_KEY not set; skipping LunarCrush request")
            return None
        if not self._session:
            logger.warning("requests not installed; LunarCrush unavailable")
            return None
        url = f"{self.BASE_URL}/{endpoint}"
        params = params or {}
        params["data"] = "meta"
        params["key"] = self.api_key
        try:
            r = self._session.get(url, params=params, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.warning("LunarCrush API request failed: %s", e)
            return None

    def get_assets_meta(self, symbol: Optional[str] = None) -> Optional[Dict]:
        """
        Get asset metadata / social metrics for a symbol or top assets.
        Endpoint and params depend on LunarCrush v4 docs; adjust as needed.
        """
        return self._get("assets", {"symbol": symbol} if symbol else None)

    def get_social_buzz(self, symbol: Optional[str] = None) -> Optional[Dict]:
        """
        Get social buzz metrics for dashboard (e.g. Galaxy Score, AltRank, volume).
        Returns a dict suitable for Redis and dashboard display.
        """
        data = self.get_assets_meta(symbol)
        if not data:
            return None
        # Normalize to a simple buzz payload; structure depends on LunarCrush response
        return {
            "source": "lunarcrush",
            "symbol": symbol,
            "data": data,
            "metrics": {
                "galaxy_score": data.get("galaxy_score"),
                "alt_rank": data.get("alt_rank"),
                "social_volume": data.get("social_volume"),
                "social_engagement": data.get("social_engagement"),
            } if isinstance(data, dict) else {},
        }


def poll_lunarcrush_interval(
    callback: Callable[[Dict], None],
    interval_seconds: int = 60,
    symbol: Optional[str] = None,
) -> None:
    """
    Optional: run a background loop that fetches LunarCrush buzz and calls callback.
    Can be started in a daemon thread from the ingestion layer.
    """
    import time
    svc = LunarCrushService()
    while True:
        try:
            buzz = svc.get_social_buzz(symbol)
            if buzz:
                callback(buzz)
        except Exception as e:
            logger.debug("LunarCrush poll error: %s", e)
        time.sleep(max(1, interval_seconds))
