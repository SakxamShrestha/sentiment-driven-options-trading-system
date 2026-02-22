"""
Data models for financial news (e.g. Alpaca News API).
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class NewsItem:
    """
    Unified representation of a financial news item from Alpaca or other sources.
    """
    source: str  # e.g. "alpaca"
    article_id: str
    headline: str
    summary: Optional[str] = None
    author: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    url: Optional[str] = None
    symbols: List[str] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "article_id": self.article_id,
            "headline": self.headline,
            "summary": self.summary,
            "author": self.author,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "url": self.url,
            "symbols": self.symbols,
            **{k: v for k, v in self.raw.items() if k not in ("created_at", "updated_at")},
        }
