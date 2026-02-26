"""
Pipeline: NewsItem → SentimentEngine → TradeSignalService → persistence (SQLite + Redis).
Orchestrates the flow from ingestion to stored sentiment and signal.
"""

import json
from typing import Any, Dict, Optional

from models.news_item import NewsItem
from services.intelligence.sentiment_engine import SentimentEngine
from services.intelligence.trade_signal import TradeSignalService
from db import SQLiteRepository, RedisState
from utils.logger import setup_logger

logger = setup_logger(__name__)


class NewsPipeline:
    """
    Processes a single NewsItem: score sentiment, compute trade signal,
    persist to SQLite and update Redis for the dashboard.
    """

    def __init__(
        self,
        sentiment_engine: Optional[SentimentEngine] = None,
        trade_signal_service: Optional[TradeSignalService] = None,
        repo: Optional[SQLiteRepository] = None,
        redis: Optional[RedisState] = None,
    ):
        self.sentiment_engine = sentiment_engine or SentimentEngine(use_finbert=True, use_llama=False)
        self.trade_signal_service = trade_signal_service or TradeSignalService()
        self.repo = repo or SQLiteRepository()
        self.redis = redis or RedisState()

    @staticmethod
    def _text_for_sentiment(news_item: NewsItem) -> str:
        """Build text to score from headline and summary."""
        headline = (news_item.headline or "").strip()
        summary = (news_item.summary or "").strip()
        if headline and summary:
            return f"{headline} {summary}"
        return headline or summary or ""

    def process(self, news_item: NewsItem) -> Dict[str, Any]:
        """
        Run full pipeline for one news item: sentiment → signal → persist.
        Returns a dict with keys: sentiment_result, signal, sentiment_row_id.
        """
        text = self._text_for_sentiment(news_item)
        if not text:
            logger.debug("Skipping news item with no headline/summary: %s", news_item.article_id)
            return {"sentiment_result": None, "signal": None, "sentiment_row_id": None}

        # Score sentiment
        sentiment_result = self.sentiment_engine.score(text)
        score = sentiment_result.get("score", 0.0)
        model_used = sentiment_result.get("model_used", "none")

        # Circuit breaker from Redis
        circuit_breaker_tripped = self.redis.circuit_breaker_tripped()
        signal = self.trade_signal_service.signal(
            sentiment_score=score,
            confidence=None,
            circuit_breaker_tripped=circuit_breaker_tripped,
        )

        # Persist sentiment to SQLite
        raw_payload_str = json.dumps(sentiment_result) if sentiment_result else None
        try:
            row_id = self.repo.insert_sentiment(
                source=news_item.source,
                score=score,
                source_id=news_item.article_id,
                content_hash=None,
                model_used=model_used,
                raw_payload=raw_payload_str,
            )
        except Exception as e:
            logger.warning("Failed to insert sentiment: %s", e)
            row_id = None

        # Update Redis for dashboard (latest sentiment)
        latest_payload = {
            "score": score,
            "model_used": model_used,
            "source": news_item.source,
            "source_id": news_item.article_id,
            "headline": (news_item.headline or "")[:200],
            "symbols": news_item.symbols,
            "signal_side": signal.get("side"),
            "signal_reason": signal.get("reason"),
        }
        try:
            self.redis.set_latest_sentiment(latest_payload)
        except Exception as e:
            logger.warning("Failed to set latest sentiment in Redis: %s", e)

        logger.info(
            "Pipeline processed news %s: score=%.3f signal=%s",
            news_item.article_id,
            score,
            signal.get("side"),
        )
        return {
            "sentiment_result": sentiment_result,
            "signal": signal,
            "sentiment_row_id": row_id,
        }
