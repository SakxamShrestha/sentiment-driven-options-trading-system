"""
StockTwits API client for finance-specific social sentiment.
Public REST endpoint: https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json
No auth required for public streams; rate limits may apply.
"""

from datetime import datetime
from typing import List

from models.news_item import NewsItem
from utils.logger import setup_logger

logger = setup_logger(__name__)

try:
    import requests
except ImportError:
    requests = None  # type: ignore


def fetch_stocktwits(symbol: str, limit: int = 10) -> List[NewsItem]:
    """
    Fetch recent messages for a ticker from StockTwits public stream.
    Returns a list of NewsItem (headline=body, source=stocktwits).
    Empty if request fails or rate limited.
    """
    if not requests:
        logger.warning("requests not installed; StockTwits unavailable")
        return []

    url = f"https://api.stocktwits.com/api/2/streams/symbol/{symbol.upper()}.json"
    params = {"limit": min(limit, 30)}
    try:
        r = requests.get(url, params=params, timeout=10, headers={"User-Agent": "TradeSentAI/1.0"})
        if r.status_code == 429:
            logger.debug("StockTwits rate limited (429)")
            return []
        r.raise_for_status()
        data = r.json()
        messages = data.get("messages", [])

        items: List[NewsItem] = []
        for m in messages[:limit]:
            try:
                body = m.get("body", "").strip()
                if not body:
                    continue
                created = m.get("created_at")
                dt = None
                if created:
                    try:
                        dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    except Exception:
                        pass
                symbols = [s.get("symbol", symbol.upper()) for s in m.get("symbols", [])] or [symbol.upper()]
                items.append(
                    NewsItem(
                        source="stocktwits",
                        article_id=str(m.get("id", "")),
                        headline=body[:200] + ("..." if len(body) > 200 else ""),
                        summary=body,
                        author=m.get("user", {}).get("username") if isinstance(m.get("user"), dict) else None,
                        created_at=dt,
                        updated_at=dt,
                        url=m.get("url"),
                        symbols=symbols,
                        raw=m,
                    )
                )
            except Exception as e:
                logger.debug("Skip StockTwits message: %s", e)
        return items
    except Exception as e:
        logger.warning("StockTwits request failed: %s", e)
        return []
