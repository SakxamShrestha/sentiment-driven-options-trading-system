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
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    symbol TEXT,
                    side TEXT,
                    qty REAL,
                    price REAL,
                    message TEXT NOT NULL,
                    read INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_trade_created ON trade_log(created_at);
                CREATE INDEX IF NOT EXISTS idx_sentiment_created ON sentiment_metadata(created_at);
                CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
                CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);

                CREATE TABLE IF NOT EXISTS learn_lessons (
                    id          INTEGER PRIMARY KEY,
                    title       TEXT NOT NULL,
                    emoji       TEXT NOT NULL,
                    icon_bg     TEXT NOT NULL,
                    duration    TEXT NOT NULL,
                    quiz_count  INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS learn_quiz_questions (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    lesson_id     INTEGER NOT NULL REFERENCES learn_lessons(id),
                    question_order INTEGER NOT NULL,
                    question      TEXT NOT NULL,
                    options       TEXT NOT NULL,
                    correct_index INTEGER NOT NULL,
                    explanation   TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_quiz_lesson ON learn_quiz_questions(lesson_id);

                CREATE TABLE IF NOT EXISTS learn_user_progress (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id      TEXT NOT NULL,
                    lesson_id    INTEGER NOT NULL,
                    score        INTEGER NOT NULL,
                    total        INTEGER NOT NULL,
                    completed_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_progress_user ON learn_user_progress(user_id);
                CREATE INDEX IF NOT EXISTS idx_progress_lesson ON learn_user_progress(user_id, lesson_id);
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

    def insert_notification(
        self,
        notif_type: str,
        message: str,
        symbol: Optional[str] = None,
        side: Optional[str] = None,
        qty: Optional[float] = None,
        price: Optional[float] = None,
    ) -> int:
        """Insert a notification. Returns row id."""
        from datetime import datetime
        with self._connection() as conn:
            cur = conn.execute(
                """INSERT INTO notifications
                   (type, symbol, side, qty, price, message, read, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 0, ?)""",
                (notif_type, symbol, side, qty, price, message, datetime.utcnow().isoformat()),
            )
            return cur.lastrowid

    def get_notifications(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch notifications ordered by most recent."""
        with self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_unread_count(self) -> int:
        """Count unread notifications."""
        with self._connection() as conn:
            row = conn.execute("SELECT COUNT(*) as cnt FROM notifications WHERE read = 0").fetchone()
            return row["cnt"] if row else 0

    def mark_notifications_read(self) -> int:
        """Mark all notifications as read. Returns rows affected."""
        with self._connection() as conn:
            cur = conn.execute("UPDATE notifications SET read = 1 WHERE read = 0")
            return cur.rowcount

    # ── Learn platform ─────────────────────────────────────────────────────────

    def seed_learn_content(self, lessons: list, questions: dict) -> None:
        """
        Populate learn_lessons and learn_quiz_questions.
        lessons: list of dicts with keys id, title, emoji, icon_bg, duration, quiz_count
        questions: dict mapping lesson_id (int) → list of question dicts
        Skips lessons/questions that already exist (idempotent).
        """
        import json as _json
        with self._connection() as conn:
            for lesson in lessons:
                conn.execute(
                    """INSERT OR IGNORE INTO learn_lessons
                       (id, title, emoji, icon_bg, duration, quiz_count)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (lesson["id"], lesson["title"], lesson["emoji"],
                     lesson["icon_bg"], lesson["duration"], lesson["quiz_count"]),
                )
            for lesson_id, qs in questions.items():
                existing = conn.execute(
                    "SELECT COUNT(*) FROM learn_quiz_questions WHERE lesson_id = ?",
                    (lesson_id,),
                ).fetchone()[0]
                if existing:
                    continue  # already seeded
                for q in qs:
                    conn.execute(
                        """INSERT INTO learn_quiz_questions
                           (lesson_id, question_order, question, options, correct_index, explanation)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (lesson_id, q["id"], q["question"],
                         _json.dumps(q["options"]), q["correctIndex"], q["explanation"]),
                    )
        logger.info("Learn content seeded: %d lessons, %d question sets",
                    len(lessons), len(questions))

    def get_lessons(self) -> List[Dict[str, Any]]:
        """Return all lessons ordered by id."""
        with self._connection() as conn:
            rows = conn.execute(
                "SELECT * FROM learn_lessons ORDER BY id"
            ).fetchall()
            return [dict(r) for r in rows]

    def get_quiz_questions(self, lesson_id: int) -> List[Dict[str, Any]]:
        """Return questions for a lesson ordered by question_order."""
        import json as _json
        with self._connection() as conn:
            rows = conn.execute(
                """SELECT id, lesson_id, question_order, question,
                          options, correct_index, explanation
                   FROM learn_quiz_questions
                   WHERE lesson_id = ?
                   ORDER BY question_order""",
                (lesson_id,),
            ).fetchall()
            result = []
            for r in rows:
                d = dict(r)
                d["options"] = _json.loads(d["options"])
                result.append(d)
            return result

    def save_progress(self, user_id: str, lesson_id: int, score: int, total: int) -> int:
        """Record a quiz attempt. Returns row id."""
        from datetime import datetime
        with self._connection() as conn:
            cur = conn.execute(
                """INSERT INTO learn_user_progress
                   (user_id, lesson_id, score, total, completed_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (user_id, lesson_id, score, total, datetime.utcnow().isoformat()),
            )
            return cur.lastrowid

    def get_user_progress(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Return latest attempt per lesson for a user.
        Each row: { lesson_id, score, total, completed_at, best_score, attempts }
        """
        with self._connection() as conn:
            rows = conn.execute(
                """SELECT
                       lesson_id,
                       MAX(score) AS best_score,
                       total,
                       COUNT(*) AS attempts,
                       MAX(completed_at) AS completed_at
                   FROM learn_user_progress
                   WHERE user_id = ?
                   GROUP BY lesson_id""",
                (user_id,),
            ).fetchall()
            return [dict(r) for r in rows]
