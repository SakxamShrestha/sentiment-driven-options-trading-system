"""
Reddit data ingestion service.
Fetches posts from finance/trading subreddits and normalizes them to SocialPost.
"""

from datetime import datetime
from typing import Callable, List, Optional, Set

import praw

from config.settings import settings
from models.social_post import SocialPost, SourceType
from utils.logger import setup_logger
from utils.latency_tracker import track_latency

logger = setup_logger(__name__)

# Subreddits to monitor (finance / trading)
DEFAULT_SUBREDDITS = [
    "wallstreetbets",
    "options",
    "stocks",
    "StockMarket",
]

# Keywords used for relevance and filtering
STOCK_KEYWORDS = [
    "spy", "spx", "qqq", "dow", "nasdaq", "s&p", "etf",
    "options", "calls", "puts", "0dte", "expiration", "strike",
    "bullish", "bearish", "rally", "crash", "pump", "dump",
    "volatility", "iv", "theta", "premium",
]


class RedditService:
    """
    Fetches Reddit submissions (and optionally comments) and converts them
    to SocialPost for the pipeline.
    """

    def __init__(
        self,
        subreddits: Optional[List[str]] = None,
        user_agent: Optional[str] = None,
    ):
        self.subreddits = subreddits or DEFAULT_SUBREDDITS
        self._reddit: Optional[praw.Reddit] = None
        self._user_agent = user_agent or settings.REDDIT_USER_AGENT

    def _get_reddit(self) -> praw.Reddit:
        """Build or return existing PRAW Reddit instance."""
        if self._reddit is None:
            if not settings.REDDIT_CLIENT_ID or not settings.REDDIT_CLIENT_SECRET:
                raise ValueError(
                    "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in .env"
                )
            self._reddit = praw.Reddit(
                client_id=settings.REDDIT_CLIENT_ID,
                client_secret=settings.REDDIT_CLIENT_SECRET,
                user_agent=self._user_agent,
            )
            logger.info("PRAW Reddit client initialized (read-only)")
        return self._reddit

    def fetch_recent(
        self,
        limit_per_sub: int = 10,
        kind: str = "new",
        include_comments: bool = False,
        comment_limit_per_post: int = 5,
    ) -> List[SocialPost]:
        """
        Fetch recent submissions from configured subreddits and convert to SocialPost.

        Args:
            limit_per_sub: Max number of submissions per subreddit.
            kind: "new", "hot", or "top".
            include_comments: If True, also add top-level comments as posts.
            comment_limit_per_post: Max comments per submission when include_comments=True.

        Returns:
            List of SocialPost (submissions and optionally comments).
        """
        with track_latency("reddit.fetch_recent"):
            reddit = self._get_reddit()
            posts: List[SocialPost] = []

            for sub_name in self.subreddits:
                try:
                    sub = reddit.subreddit(sub_name)
                    if kind == "new":
                        items = sub.new(limit=limit_per_sub)
                    elif kind == "hot":
                        items = sub.hot(limit=limit_per_sub)
                    elif kind == "top":
                        items = sub.top(limit=limit_per_sub, time_filter="day")
                    else:
                        items = sub.new(limit=limit_per_sub)

                    for submission in items:
                        try:
                            post = self._submission_to_social_post(submission)
                            if post:
                                posts.append(post)
                            if include_comments:
                                for comment in submission.comments.list()[:comment_limit_per_post]:
                                    if getattr(comment, "body", None):
                                        comment_post = self._comment_to_social_post(
                                            comment, submission
                                        )
                                        if comment_post:
                                            posts.append(comment_post)
                        except Exception as e:
                            logger.debug("Skip submission %s: %s", getattr(submission, "id", "?"), e)
                            continue
                except Exception as e:
                    logger.warning("Subreddit %s: %s", sub_name, e)

            logger.info("Reddit fetch_recent: %d posts from %s", len(posts), self.subreddits)
            return posts

    def _submission_to_social_post(self, submission: praw.models.Submission) -> Optional[SocialPost]:
        """Convert a Reddit submission to SocialPost."""
        try:
            title = getattr(submission, "title", "") or ""
            selftext = getattr(submission, "selftext", "") or ""
            content = f"{title}\n{selftext}".strip() or title

            author_name = getattr(submission.author, "name", None) if submission.author else None
            author = author_name or "[deleted]"

            created = getattr(submission, "created_utc", None)
            timestamp = datetime.utcfromtimestamp(created) if created else datetime.utcnow()

            score = getattr(submission, "score", 0) or 0
            num_comments = getattr(submission, "num_comments", 0) or 0
            permalink = getattr(submission, "permalink", "") or ""
            if permalink and not permalink.startswith("http"):
                permalink = f"https://www.reddit.com{permalink}"

            keywords = self._extract_keywords(content)
            relevance = self._relevance_score(score, num_comments, keywords)

            return SocialPost(
                source=SourceType.REDDIT,
                post_id=submission.id,
                content=content[:10000],
                author=author,
                timestamp=timestamp,
                likes=score,
                shares=getattr(submission, "num_crossposts", 0) or 0,
                replies=num_comments,
                views=0,
                relevance_score=relevance,
                keywords_matched=keywords,
                author_verified=False,
                url=permalink,
                raw={
                    "subreddit": getattr(submission, "subreddit", {}),
                    "link_flair_text": getattr(submission, "link_flair_text", None),
                },
            )
        except Exception as e:
            logger.debug("_submission_to_social_post: %s", e)
            return None

    def _comment_to_social_post(
        self,
        comment: praw.models.Comment,
        submission: praw.models.Submission,
    ) -> Optional[SocialPost]:
        """Convert a Reddit comment to SocialPost."""
        try:
            body = getattr(comment, "body", "") or ""
            if not body.strip():
                return None

            author_name = getattr(comment.author, "name", None) if comment.author else None
            author = author_name or "[deleted]"

            created = getattr(comment, "created_utc", None)
            timestamp = datetime.utcfromtimestamp(created) if created else datetime.utcnow()

            score = getattr(comment, "score", 0) or 0
            permalink = getattr(comment, "permalink", "") or ""
            if permalink and not permalink.startswith("http"):
                permalink = f"https://www.reddit.com{permalink}"

            keywords = self._extract_keywords(body)
            relevance = self._relevance_score(score, 0, keywords)

            return SocialPost(
                source=SourceType.REDDIT,
                post_id=comment.id,
                content=body[:10000],
                author=author,
                timestamp=timestamp,
                likes=score,
                shares=0,
                replies=0,
                views=0,
                relevance_score=relevance,
                keywords_matched=keywords,
                author_verified=False,
                url=permalink,
                raw={"submission_id": submission.id},
            )
        except Exception as e:
            logger.debug("_comment_to_social_post: %s", e)
            return None

    def _extract_keywords(self, text: str) -> List[str]:
        """Find STOCK_KEYWORDS present in text (case-insensitive)."""
        if not text:
            return []
        lower = text.lower()
        return [kw for kw in STOCK_KEYWORDS if kw in lower]

    def _relevance_score(self, score: int, num_comments: int, keywords: List[str]) -> float:
        """Simple 0–1 relevance from score, comments, and keyword matches."""
        r = 0.0
        r += 0.2 * len(keywords)
        if score > 0:
            r += min(0.4, 0.1 * (score / 50))
        if num_comments > 0:
            r += min(0.2, 0.05 * (num_comments / 10))
        return min(1.0, r)

    def run_poll_loop(
        self,
        interval_seconds: int = 60,
        limit_per_sub: int = 10,
        on_post: Optional[Callable[[SocialPost], None]] = None,
    ) -> None:
        """
        Repeatedly fetch recent posts and call on_post for each (for new ones).
        Deduplicates by post_id in memory.
        """
        seen: Set[str] = set()
        if on_post is None:
            on_post = lambda p: logger.info("Reddit post %s (score=%s)", p.post_id, p.likes)

        while True:
            try:
                posts = self.fetch_recent(limit_per_sub=limit_per_sub)
                for post in posts:
                    if post.post_id not in seen:
                        seen.add(post.post_id)
                        on_post(post)
            except Exception as e:
                logger.error("Reddit poll loop error: %s", e)
            import time
            time.sleep(interval_seconds)