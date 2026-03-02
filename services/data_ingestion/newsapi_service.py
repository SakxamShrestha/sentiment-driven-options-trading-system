"""
NewsAPI.org client for backup news ingestion.
API: https://newsapi.org/docs/endpoints/everything (REST, API key required)
"""

from datetime import datetime
from typing import List

from config.settings import settings
from models.news_item import NewsItem
from utils.logger import setup_logger

logger = setup_logger(__name__)

try:
    import requests
except ImportError:
    requests = None  # type: ignore


def fetch_newsapi(symbol: str, limit: int = 10) -> List[NewsItem]:
    """
    Fetch recent news for a ticker from NewsAPI.org.
    Returns a list of NewsItem. Empty if API key missing or request fails.
    """
    if not settings.NEWSAPI_API_KEY:
        logger.debug("NEWSAPI_API_KEY not set; skipping NewsAPI fetch")
        return []
    if not requests:
        logger.warning("requests not installed; NewsAPI unavailable")
        return []

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": f'"{symbol}" OR {symbol} stock',
        "apiKey": settings.NEWSAPI_API_KEY,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(limit, 20),
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "ok":
            logger.warning("NewsAPI returned status: %s", data.get("status"))
            return []

        items: List[NewsItem] = []
        for a in data.get("articles", [])[:limit]:
            try:
                pub = a.get("publishedAt")
                dt = None
                if pub:
                    dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                items.append(
                    NewsItem(
                        source="newsapi",
                        article_id=str(a.get("url", a.get("title", "")))[:200],
                        headline=a.get("title", ""),
                        summary=a.get("description"),
                        author=a.get("author"),
                        created_at=dt,
                        updated_at=dt,
                        url=a.get("url"),
                        symbols=[symbol.upper()],
                        raw=a,
                    )
                )
            except Exception as e:
                logger.debug("Skip NewsAPI article: %s", e)
        return items
    except Exception as e:
        logger.warning("NewsAPI request failed: %s", e)
        return []
