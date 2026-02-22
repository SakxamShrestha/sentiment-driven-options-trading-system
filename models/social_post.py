"""
Data models for social media posts.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class SourceType(str, Enum):
    TWITTER = "twitter"
    REDDIT = "reddit"


@dataclass
class SocialPost:
    """
    Unified representation of a social media post.
    """
    source: SourceType
    post_id: str
    content: str
    author: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

    # Engagement
    likes: int = 0
    shares: int = 0      # retweets / crossposts
    replies: int = 0
    views: int = 0

    # Relevance features
    relevance_score: float = 0.0
    keywords_matched: List[str] = field(default_factory=list)

    # Metadata
    author_verified: bool = False
    url: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source.value,
            "post_id": self.post_id,
            "content": self.content,
            "author": self.author,
            "timestamp": self.timestamp.isoformat(),
            "likes": self.likes,
            "shares": self.shares,
            "replies": self.replies,
            "views": self.views,
            "relevance_score": self.relevance_score,
            "keywords_matched": self.keywords_matched,
            "author_verified": self.author_verified,
            "url": self.url,
        }