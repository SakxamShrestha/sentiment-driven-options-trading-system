"""
Integration-style tests for NewsPipeline:
NewsItem -> SentimentEngine -> TradeSignalService -> SQLite + Redis.
"""

import json
from pathlib import Path
from typing import Any, Dict, Optional

from models.news_item import NewsItem
from services.pipeline import NewsPipeline
from services.intelligence.sentiment_engine import SentimentEngine
from services.intelligence.trade_signal import TradeSignalService
from db.sqlite_repository import SQLiteRepository


class _FakeSentimentEngine(SentimentEngine):
    """Fake sentiment engine that returns a fixed score without external models."""

    def __init__(self, fixed_score: float = 0.75):
        super().__init__(use_finbert=False, use_llama=False)
        self._fixed_score = fixed_score

    def score(self, text: str) -> Dict[str, Any]:  # type: ignore[override]
        return {
            "score": self._fixed_score,
            "model_used": "fake",
            "raw": {"fake": {"text": text}},
        }


class _FakeRedisState:
    """In-memory stand-in for RedisState used by the pipeline."""

    def __init__(self):
        self.latest_sentiment: Optional[Dict[str, Any]] = None
        self._circuit_breaker_tripped = False

    def circuit_breaker_tripped(self) -> bool:
        return self._circuit_breaker_tripped

    def set_circuit_breaker(self, tripped: bool) -> None:
        self._circuit_breaker_tripped = tripped

    def set_latest_sentiment(self, payload: dict) -> None:
        # Mimic Redis serialization semantics for test assertions
        # but just keep it in memory.
        # Ensure payload is JSON-serializable.
        json.dumps(payload)
        self.latest_sentiment = payload


def _make_temp_repo(tmp_path: Path) -> SQLiteRepository:
    """Create a SQLiteRepository backed by a temp DB file."""
    db_file = tmp_path / "test_tradesent.db"
    return SQLiteRepository(db_path=db_file)


def test_news_pipeline_persists_sentiment_and_updates_redis(tmp_path):
    fake_engine = _FakeSentimentEngine(fixed_score=0.8)
    trade_service = TradeSignalService(
        threshold_bullish=0.6,
        threshold_bearish=-0.6,
        min_confidence=0.5,
    )
    repo = _make_temp_repo(tmp_path)
    fake_redis = _FakeRedisState()

    pipeline = NewsPipeline(
        sentiment_engine=fake_engine,
        trade_signal_service=trade_service,
        repo=repo,
        redis=fake_redis,  # type: ignore[arg-type]
    )

    news = NewsItem(
        source="alpaca",
        article_id="unit-test-1",
        headline="Stocks surge on positive economic data",
        summary="Markets rallied after better-than-expected GDP numbers.",
        symbols=["SPY"],
    )

    result = pipeline.process(news)

    # Check sentiment result and signal returned
    assert result["sentiment_result"] is not None
    assert result["signal"] is not None
    assert result["signal"]["side"] == "buy"

    # Sentiment should be persisted in SQLite
    sentiments = repo.get_recent_sentiment(limit=5)
    assert len(sentiments) == 1
    row = sentiments[0]
    assert row["source"] == "alpaca"
    assert row["source_id"] == "unit-test-1"
    assert row["score"] == 0.8
    assert row["model_used"] == "fake"

    # Latest sentiment should be stored in the fake Redis state
    assert fake_redis.latest_sentiment is not None
    ls = fake_redis.latest_sentiment
    assert ls["score"] == 0.8
    assert ls["signal_side"] == "buy"
    assert ls["source_id"] == "unit-test-1"
    assert ls["headline"].startswith("Stocks surge")

