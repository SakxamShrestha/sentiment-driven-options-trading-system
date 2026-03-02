"""
Finviz headline scraper for backup news ingestion.
Page: https://finviz.com/quote.ashx?t={symbol}
Light scraping with respectful rate limits. No API key.
"""

from datetime import datetime
from typing import List

from models.news_item import NewsItem
from utils.logger import setup_logger

logger = setup_logger(__name__)

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None  # type: ignore


def fetch_finviz(symbol: str, limit: int = 10) -> List[NewsItem]:
    """
    Scrape recent news headlines for a ticker from Finviz quote page.
    Returns a list of NewsItem. Empty if scraping fails.
    """
    if not requests or not BeautifulSoup:
        logger.debug("requests/beautifulsoup4 required for Finviz; skipping")
        return []

    url = f"https://finviz.com/quote.ashx?t={symbol.upper()}"
    headers = {"User-Agent": "TradeSentAI/1.0 (research; +https://github.com/)"}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        # Finviz news table: table with id="news-table" or class containing news
        table = soup.find("table", id="news-table")
        if not table:
            return []

        items: List[NewsItem] = []
        rows = table.find_all("tr", limit=limit * 2)  # some rows are date separators
        for row in rows[:limit]:
            link_el = row.find("a", href=True)
            if not link_el:
                continue
            title = (link_el.get_text() or "").strip()
            href = link_el.get("href", "")
            if not title:
                continue
            items.append(
                NewsItem(
                    source="finviz",
                    article_id=str(href)[:200],
                    headline=title,
                    summary=None,
                    author=None,
                    created_at=datetime.utcnow(),
                    updated_at=None,
                    url=href,
                    symbols=[symbol.upper()],
                    raw={"title": title},
                )
            )
        return items[:limit]
    except Exception as e:
        logger.warning("Finviz scrape failed: %s", e)
        return []
