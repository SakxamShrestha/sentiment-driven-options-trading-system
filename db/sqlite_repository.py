"""
SQLite persistence for trade history, sentiment metadata, and system state.
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)


class SQLiteRepository:
    """SQLite repository for trade logs and sentiment metadata."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or (settings.BASE_DIR / "data" / "tradesent.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _connection(self):
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        """Create tables for trades, sentiment metadata, and alerts if not exist."""
        with self._connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS trade_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    side TEXT NOT NULL,
                    qty REAL NOT NULL,
                    price REAL,
                    order_id TEXT,
                    sentiment_score REAL,
                    signal_source TEXT,
                    created_at TEXT NOT NULL,
                    raw_response TEXT
                );
                CREATE TABLE IF NOT EXISTS sentiment_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    source_id TEXT,
                    content_hash TEXT,
                    score REAL NOT NULL,
                    model_used TEXT,
                    created_at TEXT NOT NULL,
                    raw_payload TEXT
                );
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    headline TEXT,
                    summary TEXT,
                    impact_level TEXT,
                    tickers TEXT,
                    created_at TEXT NOT NULL,
                    raw_payload TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_trade_created ON trade_log(created_at);
                CREATE INDEX IF NOT EXISTS idx_sentiment_created ON sentiment_metadata(created_at);
                CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
            """)
        logger.info("SQLite schema initialized at %s", self.db_path)

    def insert_trade(
        self,
        ticker: str,
        side: str,
        qty: float,
        price: Optional[float] = None,
        order_id: Optional[str] = None,
        sentiment_score: Optional[float] = None,
        signal_source: Optional[str] = None,
        raw_response: Optional[str] = None,
    ) -> int:
        """Insert a trade record. Returns row id."""
        from datetime import datetime
        with self._connection() as conn:
            cur = conn.execute(
                """INSERT INTO trade_log
                   (ticker, side, qty, price, order_id, sentiment_score, signal_source, created_at, raw_response)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ticker,
                    side,
                    qty,
                    price,
                    order_id,
                    sentiment_score,
                    signal_source,
                    datetime.utcnow().isoformat(),
                    raw_response,
                ),
            )
            return cur.lastrowid

    def insert_sentiment(
        self,
        source: str,
        score: float,
        source_id: Optional[str] = None,
        content_hash: Optional[str] = None,
        model_used: Optional[str] = None,
        raw_payload: Optional[str] = None,
    ) -> int:
        """Insert sentiment metadata. Returns row id."""
        from datetime import datetime
        with self._connection() as conn:
            cur = conn.execute(
                """INSERT INTO sentiment_metadata
                   (source, source_id, content_hash, score, model_used, created_at, raw_payload)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    source,
                    source_id,
                    content_hash,
                    score,
                    model_used,
                    datetime.utcnow().isoformat(),
                    raw_payload,
                ),
            )
            return cur.lastrowid

    def insert_alert(
        self,
        headline: Optional[str] = None,
        summary: Optional[str] = None,
        impact_level: Optional[str] = None,
        tickers: Optional[str] = None,
        raw_payload: Optional[str] = None,
    ) -> int:
        """Insert a high-impact news alert. Returns row id."""
        from datetime import datetime
        with self._connection() as conn:
            cur = conn.execute(
                """INSERT INTO alerts (headline, summary, impact_level, tickers, created_at, raw_payload)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (headline, summary, impact_level, tickers, datetime.utcnow().isoformat(), raw_payload),
            )
            return cur.lastrowid

    def get_recent_trades(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch most recent trades for dashboard."""
        with self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM trade_log ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_recent_sentiment(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Fetch recent sentiment records for dashboard."""
        with self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM sentiment_metadata ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch recent alerts for dashboard."""
        with self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]
