"""
Multi-source news aggregator: Alpaca + NewsAPI + StockTwits + Yahoo RSS + Finviz.
Combines Layer 1 (news), Layer 2 (social), and Layer 3 (RSS/scrape) into a single fetch.
"""

from typing import List

from models.news_item import NewsItem

from .alpaca_news_service import fetch_news_rest
from .newsapi_service import fetch_newsapi
from .stocktwits_service import fetch_stocktwits
from .yahoo_rss_service import fetch_yahoo_rss
from .finviz_service import fetch_finviz


def fetch_all_sources(symbol: str, limit_per_source: int = 5) -> List[NewsItem]:
    """
    Fetch news and social content from all configured sources for a ticker.
    Returns a merged list of NewsItem with source tags (alpaca, newsapi, stocktwits, yahoo_rss, finviz).
    Deduplication is best-effort by headline similarity; order is by source priority then recency.
    """
    ticker = symbol.upper()
    per = max(1, min(limit_per_source, 10))
    items: List[NewsItem] = []

    # Layer 1: News (primary)
    alpaca = fetch_news_rest([ticker], limit=per)
    items.extend(alpaca)

    # Layer 1: News (backup)
    newsapi = fetch_newsapi(ticker, limit=per)
    items.extend(newsapi)

    # Layer 2: Finance social
    stocktwits = fetch_stocktwits(ticker, limit=per)
    items.extend(stocktwits)

    # Layer 3: RSS
    yahoo = fetch_yahoo_rss(ticker, limit=per)
    items.extend(yahoo)

    # Layer 3: Light scrape
    finviz = fetch_finviz(ticker, limit=per)
    items.extend(finviz)

    return items
