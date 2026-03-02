"""
Yahoo Finance RSS feed client for headline ingestion.
Feed URL: https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}
No API key required.
"""

from datetime import datetime
from typing import List

from models.news_item import NewsItem
from utils.logger import setup_logger

logger = setup_logger(__name__)

try:
    import feedparser
except ImportError:
    feedparser = None  # type: ignore


def fetch_yahoo_rss(symbol: str, limit: int = 10) -> List[NewsItem]:
    """
    Fetch recent headlines for a ticker from Yahoo Finance RSS.
    Returns a list of NewsItem. Empty if feedparser missing or parse fails.
    """
    if not feedparser:
        logger.warning("feedparser not installed; Yahoo RSS unavailable")
        return []

    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol.upper()}"
    try:
        feed = feedparser.parse(url)
        items: List[NewsItem] = []
        for entry in feed.get("entries", [])[:limit]:
            try:
                title = (entry.get("title") or "").strip()
                desc = (entry.get("summary", "") or (entry.get("description", "")) or "").strip()
                link = entry.get("link")
                guid = entry.get("id") or link or title
                pub = entry.get("published_parsed")
                dt = None
                if pub and len(pub) >= 6:
                    try:
                        dt = datetime(pub[0], pub[1], pub[2], pub[3], pub[4], min(pub[5], 59))
                    except Exception:
                        pass
                if not title and not desc:
                    continue
                items.append(
                    NewsItem(
                        source="yahoo_rss",
                        article_id=str(guid)[:200],
                        headline=title or desc[:100],
                        summary=desc if desc != title else None,
                        author=None,
                        created_at=dt,
                        updated_at=dt,
                        url=link,
                        symbols=[symbol.upper()],
                        raw={"published": entry.get("published"), "link": link},
                    )
                )
            except Exception as e:
                logger.debug("Skip Yahoo RSS entry: %s", e)
        return items
    except Exception as e:
        logger.warning("Yahoo RSS parse failed: %s", e)
        return []
