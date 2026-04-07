#!/usr/bin/env python3
"""
Seed the SQLite DB with all Learn platform content from quiz_cache.json.
Safe to re-run — uses INSERT OR IGNORE / skip-if-exists logic.

Usage:
    python scripts/seed_learn_db.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from db.sqlite_repository import SQLiteRepository

CACHE_FILE = Path(__file__).parent / "quiz_cache.json"

# Lesson metadata — mirrors the LESSONS array in Learn.tsx
LESSONS = [
    {"id": 101, "title": "Asset Classes Explained",        "emoji": "🗂️",  "icon_bg": "#4299E1", "duration": "2 min", "quiz_count": 10},
    {"id": 102, "title": "Annual Returns: What They Mean", "emoji": "📅",  "icon_bg": "#805AD5", "duration": "1 min", "quiz_count": 8},
    {"id": 103, "title": "Bull vs. Bear Markets",          "emoji": "🐂",  "icon_bg": "#68D391", "duration": "2 min", "quiz_count": 12},
    {"id": 104, "title": "Bonds 101",                      "emoji": "📜",  "icon_bg": "#ED8936", "duration": "3 min", "quiz_count": 9},
    {"id": 105, "title": "2 Ways To Pay Off Debt",         "emoji": "💳",  "icon_bg": "#F687B3", "duration": "3 min", "quiz_count": 5},
    {"id": 106, "title": "Candlestick Charts Deep Dive",   "emoji": "🕯️",  "icon_bg": "#ED8936", "duration": "4 min", "quiz_count": 14},
    {"id": 107, "title": "Compound Interest Over Time",    "emoji": "📈",  "icon_bg": "#4FD1C5", "duration": "2 min", "quiz_count": 11},
    {"id": 108, "title": "Circuit Breakers in Trading",    "emoji": "🔌",  "icon_bg": "#805AD5", "duration": "1 min", "quiz_count": 6},
    {"id": 109, "title": "Diversification Strategies",    "emoji": "🥧",  "icon_bg": "#68D391", "duration": "3 min", "quiz_count": 13},
    {"id": 110, "title": "Dividends & Yield",              "emoji": "🍃",  "icon_bg": "#4299E1", "duration": "2 min", "quiz_count": 10},
    {"id": 111, "title": "Day Trading Fundamentals",       "emoji": "⚡",  "icon_bg": "#ED8936", "duration": "5 min", "quiz_count": 18},
    {"id": 112, "title": "Earnings Per Share (EPS)",       "emoji": "💵",  "icon_bg": "#805AD5", "duration": "1 min", "quiz_count": 16},
    {"id": 113, "title": "ETFs vs. Mutual Funds",          "emoji": "🗂️",  "icon_bg": "#68D391", "duration": "3 min", "quiz_count": 12},
    {"id": 114, "title": "FinBERT: AI for Finance",        "emoji": "🤖",  "icon_bg": "#4FD1C5", "duration": "2 min", "quiz_count": 8},
    {"id": 115, "title": "Fixed Income Investing",         "emoji": "🏦",  "icon_bg": "#ED8936", "duration": "3 min", "quiz_count": 10},
    {"id": 116, "title": "Index Funds Explained",          "emoji": "🏛️",  "icon_bg": "#4299E1", "duration": "2 min", "quiz_count": 9},
    {"id": 117, "title": "IPOs: Going Public",             "emoji": "🚀",  "icon_bg": "#F687B3", "duration": "4 min", "quiz_count": 15},
    {"id": 118, "title": "Liquidity & Market Depth",       "emoji": "💧",  "icon_bg": "#68D391", "duration": "2 min", "quiz_count": 7},
    {"id": 119, "title": "Limit Orders vs. Market Orders", "emoji": "🎯",  "icon_bg": "#805AD5", "duration": "1 min", "quiz_count": 8},
    {"id": 120, "title": "Market Capitalization",          "emoji": "🏢",  "icon_bg": "#4FD1C5", "duration": "1 min", "quiz_count": 10},
    {"id": 121, "title": "Momentum Trading",               "emoji": "🌊",  "icon_bg": "#ED8936", "duration": "3 min", "quiz_count": 11},
    {"id": 122, "title": "Options: Calls & Puts",          "emoji": "📋",  "icon_bg": "#F687B3", "duration": "5 min", "quiz_count": 20},
    {"id": 123, "title": "Order Types Explained",          "emoji": "📤",  "icon_bg": "#4299E1", "duration": "2 min", "quiz_count": 9},
    {"id": 124, "title": "P/E Ratio",                      "emoji": "📐",  "icon_bg": "#805AD5", "duration": "2 min", "quiz_count": 12},
    {"id": 125, "title": "Portfolio Rebalancing",          "emoji": "⚖️",  "icon_bg": "#68D391", "duration": "3 min", "quiz_count": 11},
    {"id": 126, "title": "Paper Trading Strategies",       "emoji": "📝",  "icon_bg": "#ED8936", "duration": "2 min", "quiz_count": 8},
    {"id": 127, "title": "Risk-Reward Ratio",              "emoji": "🎲",  "icon_bg": "#4FD1C5", "duration": "2 min", "quiz_count": 9},
    {"id": 128, "title": "RSI: Relative Strength Index",   "emoji": "📊",  "icon_bg": "#4299E1", "duration": "3 min", "quiz_count": 13},
    {"id": 129, "title": "Sentiment Analysis in Trading",  "emoji": "🧠",  "icon_bg": "#805AD5", "duration": "3 min", "quiz_count": 14},
    {"id": 130, "title": "Short Selling 101",              "emoji": "🔽",  "icon_bg": "#F687B3", "duration": "4 min", "quiz_count": 16},
    {"id": 131, "title": "Stop Loss Orders",               "emoji": "🛑",  "icon_bg": "#ED8936", "duration": "1 min", "quiz_count": 7},
    {"id": 132, "title": "Volatility & VIX",               "emoji": "🌪️",  "icon_bg": "#4FD1C5", "duration": "3 min", "quiz_count": 12},
    {"id": 133, "title": "Volume Analysis",                "emoji": "📊",  "icon_bg": "#68D391", "duration": "2 min", "quiz_count": 8},
    {"id": 134, "title": "Watchlists & Screening",        "emoji": "🔍",  "icon_bg": "#4299E1", "duration": "1 min", "quiz_count": 6},
]


def main():
    if not CACHE_FILE.exists():
        print(f"ERROR: {CACHE_FILE} not found. Run scripts/generate_quizzes.py first.")
        sys.exit(1)

    with open(CACHE_FILE) as f:
        cache = json.load(f)

    # Convert string keys → int keys
    questions = {int(k): v for k, v in cache.items()}

    missing = [l["id"] for l in LESSONS if l["id"] not in questions]
    if missing:
        print(f"Warning: {len(missing)} lesson(s) missing from cache: {missing}")

    repo = SQLiteRepository()
    repo.seed_learn_content(LESSONS, questions)

    # Verify
    db_lessons = repo.get_lessons()
    total_q = sum(len(repo.get_quiz_questions(l["id"])) for l in db_lessons)
    print(f"Seeded {len(db_lessons)} lessons, {total_q} total questions into SQLite.")


if __name__ == "__main__":
    main()
