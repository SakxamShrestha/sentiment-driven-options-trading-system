"""
Twitter/X real-time stream integration (structure only).
"""

import tweepy
from typing import Callable, List, Optional
from datetime import datetime

from config.settings import settings
from utils.logger import setup_logger
from utils.latency_tracker import track_latency
from models.social_post import SocialPost, SourceType

logger = setup_logger(__name__)


class TwitterStreamListener(tweepy.StreamingClient):
    """
    Tweepy StreamingClient subclass that converts tweets into SocialPost
    and sends them to a callback.
    """

    def __init__(self, bearer_token: str, on_post: Callable[[SocialPost], None]):
        super().__init__(bearer_token)
        self.on_post = on_post

    def on_tweet(self, tweet: tweepy.Tweet) -> None:
        """Called when a tweet matching filters arrives."""
        try:
            with track_latency("twitter.on_tweet"):
                post = self._to_social_post(tweet)
                if post:
                    self.on_post(post)
        except Exception as e:
            logger.error(f"Error in on_tweet: {e}", exc_info=True)

    def on_errors(self, errors):
        logger.error(f"Twitter stream errors: {errors}")

    def on_connection_error(self):
        logger.error("Twitter stream connection error")

    # ---- helpers ----

    def _to_social_post(self, tweet: tweepy.Tweet) -> Optional[SocialPost]:
        """Map Tweepy Tweet -> SocialPost."""
        try:
            metrics = getattr(tweet, "public_metrics", {}) or {}

            text = tweet.text
            keywords = self._extract_keywords(text)
            relevance = self._compute_relevance(metrics, keywords)

            return SocialPost(
                source=SourceType.TWITTER,
                post_id=str(tweet.id),
                content=text,
                author=str(getattr(tweet, "author_id", "unknown")),
                timestamp=getattr(tweet, "created_at", datetime.utcnow()),
                likes=metrics.get("like_count", 0),
                shares=metrics.get("retweet_count", 0),
                replies=metrics.get("reply_count", 0),
                views=metrics.get("impression_count", 0),
                relevance_score=relevance,
                keywords_matched=keywords,
                author_verified=False,  # can be improved later
                url=f"https://twitter.com/i/web/status/{tweet.id}",
                raw=getattr(tweet, "data", {}),
            )
        except Exception as e:
            logger.error(f"Failed to convert tweet to SocialPost: {e}", exc_info=True)
            return None

    def _extract_keywords(self, text: str) -> List[str]:
        """Very simple keyword extraction, can improve later."""
        text_l = text.lower()
        kws: List[str] = []

        for kw in ["spy", "spx", "qqq", "options", "0dte", "calls", "puts",
                   "bullish", "bearish", "rally", "crash", "volatility"]:
            if kw in text_l:
                kws.append(kw)
        return kws

    def _compute_relevance(self, metrics: dict, keywords: List[str]) -> float:
        score = 0.0
        score += 0.2 * len(keywords)

        likes = metrics.get("like_count", 0)
        rts = metrics.get("retweet_count", 0)

        if likes > 0:
            score += min(0.3, likes / 1000 * 0.1)
        if rts > 0:
            score += min(0.2, rts / 500 * 0.1)

        return min(1.0, score)