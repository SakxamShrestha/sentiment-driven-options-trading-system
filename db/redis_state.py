"""
Redis-backed live state for real-time dashboard and circuit breakers.
"""

from typing import Any, Optional

import redis
from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class RedisState:
    """Live state management using Redis."""

    KEY_LATEST_SENTIMENT = "tradesent:latest_sentiment"
    KEY_LATEST_BUZZ = "tradesent:latest_buzz"
    KEY_CIRCUIT_BREAKER = "tradesent:circuit_breaker"
    KEY_LAST_NEWS_TS = "tradesent:last_news_ts"
    KEY_ACTIVE_ALERTS = "tradesent:active_alerts"

    def __init__(self):
        self._client: Optional[redis.Redis] = None

    def _get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD or None,
                decode_responses=True,
            )
        return self._client

    def set_latest_sentiment(self, payload: dict) -> None:
        """Store latest aggregate sentiment for dashboard."""
        import json
        try:
            self._get_client().set(
                self.KEY_LATEST_SENTIMENT,
                json.dumps(payload),
                ex=300,
            )
        except redis.RedisError as e:
            logger.warning("Redis set_latest_sentiment failed: %s", e)

    def get_latest_sentiment(self) -> Optional[dict]:
        """Retrieve latest sentiment payload."""
        import json
        try:
            raw = self._get_client().get(self.KEY_LATEST_SENTIMENT)
            return json.loads(raw) if raw else None
        except (redis.RedisError, TypeError, ValueError) as e:
            logger.debug("Redis get_latest_sentiment: %s", e)
            return None

    def set_latest_buzz(self, payload: dict) -> None:
        """Store latest social buzz metrics (e.g. from LunarCrush)."""
        import json
        try:
            self._get_client().set(
                self.KEY_LATEST_BUZZ,
                json.dumps(payload),
                ex=300,
            )
        except redis.RedisError as e:
            logger.warning("Redis set_latest_buzz failed: %s", e)

    def get_latest_buzz(self) -> Optional[dict]:
        try:
            import json
            raw = self._get_client().get(self.KEY_LATEST_BUZZ)
            return json.loads(raw) if raw else None
        except (redis.RedisError, TypeError, ValueError):
            return None

    def circuit_breaker_tripped(self) -> bool:
        """Check if risk circuit breaker is active."""
        try:
            return self._get_client().get(self.KEY_CIRCUIT_BREAKER) == "1"
        except redis.RedisError:
            return False

    def set_circuit_breaker(self, tripped: bool) -> None:
        """Set or clear circuit breaker."""
        try:
            if tripped:
                self._get_client().set(self.KEY_CIRCUIT_BREAKER, "1", ex=3600)
            else:
                self._get_client().delete(self.KEY_CIRCUIT_BREAKER)
        except redis.RedisError as e:
            logger.warning("Redis circuit_breaker update failed: %s", e)

    def close(self) -> None:
        if self._client:
            try:
                self._client.close()
            except Exception:
                pass
            self._client = None
