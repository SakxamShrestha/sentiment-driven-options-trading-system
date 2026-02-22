"""
Trade signal generation from sentiment scores and user-approved rules.
"""

from typing import Any, Dict, Literal, Optional

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

SignalSide = Literal["buy", "sell", "hold"]


class TradeSignalService:
    """
    Converts sentiment score and optional buzz metrics into a trade signal (buy/sell/hold).
    Enforces user-approved thresholds and risk circuit breaker.
    """

    def __init__(
        self,
        threshold_bullish: Optional[float] = None,
        threshold_bearish: Optional[float] = None,
        min_confidence: Optional[float] = None,
    ):
        self.threshold_bullish = threshold_bullish or settings.SENTIMENT_THRESHOLD_BULLISH
        self.threshold_bearish = threshold_bearish or settings.SENTIMENT_THRESHOLD_BEARISH
        self.min_confidence = min_confidence or settings.MIN_CONFIDENCE_SCORE

    def signal(
        self,
        sentiment_score: float,
        confidence: Optional[float] = None,
        circuit_breaker_tripped: bool = False,
    ) -> Dict[str, Any]:
        """
        Compute signal from sentiment. If circuit breaker is tripped, always return hold.
        Returns dict: { "side": "buy"|"sell"|"hold", "reason": str, "score": float }.
        """
        if circuit_breaker_tripped:
            return {
                "side": "hold",
                "reason": "circuit_breaker",
                "score": sentiment_score,
            }
        conf = confidence if confidence is not None else 1.0
        if conf < self.min_confidence:
            return {
                "side": "hold",
                "reason": "low_confidence",
                "score": sentiment_score,
            }
        if sentiment_score >= self.threshold_bullish:
            return {
                "side": "buy",
                "reason": "sentiment_bullish",
                "score": sentiment_score,
            }
        if sentiment_score <= self.threshold_bearish:
            return {
                "side": "sell",
                "reason": "sentiment_bearish",
                "score": sentiment_score,
            }
        return {
            "side": "hold",
            "reason": "neutral",
            "score": sentiment_score,
        }
