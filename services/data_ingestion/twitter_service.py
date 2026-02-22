"""
High-level Twitter stream service (start/stop).
"""

from typing import Optional
import threading

from config.settings import settings
from utils.logger import setup_logger
from models.social_post import SocialPost
from .twitter_stream import TwitterStreamListener

logger = setup_logger(__name__)


class TwitterStreamService:
    """
    Manages the Twitter streaming client and exposes start/stop.
    """

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._listener: Optional[TwitterStreamListener] = None
        self._running = False

    def start(self, on_post) -> bool:
        """
        Start streaming. `on_post` is a callback that receives SocialPost.
        """
        if self._running:
            logger.warning("TwitterStreamService already running")
            return True

        if not settings.TWITTER_BEARER_TOKEN:
            logger.error("TWITTER_BEARER_TOKEN is not set in .env")
            return False

        def run():
            try:
                self._listener = TwitterStreamListener(
                    bearer_token=settings.TWITTER_BEARER_TOKEN,
                    on_post=on_post,
                )

                # Basic filter rule: finance + SPY
                # NOTE: Proper rule management should handle existing rules,
                # but for now keep it simple / manual.
                logger.info("Starting Twitter stream (filter: SPY/finance keywords)")
                self._listener.filter(
                    tweet_fields=["public_metrics", "author_id", "created_at"],
                )
            except Exception as e:
                logger.error(f"Twitter stream crashed: {e}", exc_info=True)
            finally:
                self._running = False

        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()
        self._running = True
        return True

    def stop(self):
        """Stop the stream if running."""
        if self._listener:
            try:
                self._listener.disconnect()
                logger.info("Twitter stream disconnected")
            except Exception as e:
                logger.error(f"Error disconnecting Twitter stream: {e}")
        self._running = False