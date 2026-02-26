"""
Unit tests for SentimentEngine and TradeSignalService.
"""

from typing import Any, Dict, List

from services.intelligence.sentiment_engine import SentimentEngine
from services.intelligence.trade_signal import TradeSignalService


class _FakeFinbertPipeline:
    """Fake FinBERT pipeline for testing without external model."""

    def __call__(self, text: str, top_k: Any = None) -> List[Dict[str, Any]]:
        # Simple deterministic output: mostly positive
        return [
            {"label": "positive", "score": 0.8},
            {"label": "negative", "score": 0.1},
            {"label": "neutral", "score": 0.1},
        ]


def test_sentiment_engine_uses_finbert_scores():
    engine = SentimentEngine(use_finbert=True, use_llama=False)
    # Inject fake FinBERT pipeline to avoid loading real model
    engine._finbert_pipeline = _FakeFinbertPipeline()

    result = engine.score("Stocks rally on strong earnings.")

    assert "score" in result
    assert "model_used" in result
    # Score should be in [-1, 1]
    assert -1.0 <= result["score"] <= 1.0
    # With fake pipeline, positive should dominate
    assert result["score"] > 0
    assert result["model_used"] == "finbert"
    assert "finbert" in result.get("raw", {})


def test_trade_signal_service_basic_thresholds():
    service = TradeSignalService(
        threshold_bullish=0.6,
        threshold_bearish=-0.6,
        min_confidence=0.5,
    )

    # Strong positive sentiment → buy
    buy_signal = service.signal(sentiment_score=0.8, confidence=1.0)
    assert buy_signal["side"] == "buy"
    assert buy_signal["reason"] == "sentiment_bullish"

    # Strong negative sentiment → sell
    sell_signal = service.signal(sentiment_score=-0.7, confidence=1.0)
    assert sell_signal["side"] == "sell"
    assert sell_signal["reason"] == "sentiment_bearish"

    # Neutral sentiment → hold
    hold_signal = service.signal(sentiment_score=0.1, confidence=1.0)
    assert hold_signal["side"] == "hold"
    assert hold_signal["reason"] == "neutral"


def test_trade_signal_respects_low_confidence_and_circuit_breaker():
    service = TradeSignalService(
        threshold_bullish=0.6,
        threshold_bearish=-0.6,
        min_confidence=0.9,
    )

    # Low confidence should force hold even with strong sentiment
    low_conf_signal = service.signal(sentiment_score=0.9, confidence=0.5)
    assert low_conf_signal["side"] == "hold"
    assert low_conf_signal["reason"] == "low_confidence"

    # Circuit breaker always forces hold
    cb_signal = service.signal(
        sentiment_score=0.9,
        confidence=1.0,
        circuit_breaker_tripped=True,
    )
    assert cb_signal["side"] == "hold"
    assert cb_signal["reason"] == "circuit_breaker"

