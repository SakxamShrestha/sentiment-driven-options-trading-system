"""
Data models for trade execution records.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class TradeLog:
    """Represents a single executed (or paper) trade for dashboard and persistence."""
    ticker: str
    side: str  # "buy" | "sell"
    qty: float
    price: Optional[float] = None
    order_id: Optional[str] = None
    sentiment_score: Optional[float] = None
    signal_source: Optional[str] = None
    created_at: Optional[datetime] = None
    raw_response: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ticker": self.ticker,
            "side": self.side,
            "qty": self.qty,
            "price": self.price,
            "order_id": self.order_id,
            "sentiment_score": self.sentiment_score,
            "signal_source": self.signal_source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "raw_response": self.raw_response,
        }
