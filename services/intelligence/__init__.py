"""
Intelligence Layer: Sentiment scoring (FinBERT, Llama 3) and trade signal generation.
"""

from .sentiment_engine import SentimentEngine
from .trade_signal import TradeSignalService

__all__ = ["SentimentEngine", "TradeSignalService"]
