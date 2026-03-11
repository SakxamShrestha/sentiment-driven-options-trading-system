"""
Dashboard API routes: trades, sentiment, alerts, live state, circuit breaker.
"""

from typing import Optional

from flask import Blueprint, jsonify, request

from db import RedisState, SQLiteRepository
from services.data_ingestion import fetch_all_sources
from services.data_ingestion.lunarcrush_service import LunarCrushService
from services.intelligence.sentiment_engine import SentimentEngine

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")

_repo: Optional[SQLiteRepository] = None
_redis: Optional[RedisState] = None
_sentiment_engine: Optional[SentimentEngine] = None


def get_repo() -> SQLiteRepository:
    global _repo
    if _repo is None:
        _repo = SQLiteRepository()
    return _repo


def get_redis() -> RedisState:
    global _redis
    if _redis is None:
        _redis = RedisState()
    return _redis


def get_sentiment_engine() -> SentimentEngine:
    global _sentiment_engine
    if _sentiment_engine is None:
        _sentiment_engine = SentimentEngine(use_finbert=True, use_llama=False)
    return _sentiment_engine


@dashboard_bp.route("/trades", methods=["GET"])
def list_trades():
    """Recent trade history for dashboard."""
    limit = min(int(request.args.get("limit", 100)), 500)
    repo = get_repo()
    return jsonify(repo.get_recent_trades(limit=limit))


@dashboard_bp.route("/sentiment", methods=["GET"])
def list_sentiment():
    """Recent sentiment metadata for dashboard."""
    limit = min(int(request.args.get("limit", 200)), 500)
    repo = get_repo()
    return jsonify(repo.get_recent_sentiment(limit=limit))


@dashboard_bp.route("/sentiment/by_ticker", methods=["GET"])
def sentiment_by_ticker():
    """
    On-demand sentiment snapshot for a specific ticker.
    Fetches recent Alpaca news for the symbol, scores each article,
    and returns per-article scores plus an average.
    """
    ticker = (request.args.get("ticker") or request.args.get("symbol") or "").strip()
    if not ticker:
        return jsonify({"error": "ticker parameter is required"}), 400
    ticker = ticker.upper()

    try:
        limit = min(int(request.args.get("limit", 8)), 30)
    except ValueError:
        limit = 8

    limit_per_source = max(2, limit // 3)
    news_items = fetch_all_sources(ticker, limit_per_source=limit_per_source)
    if not news_items:
        return jsonify(
            {
                "ticker": ticker,
                "count": 0,
                "average_score": None,
                "articles": [],
            }
        )

    engine = get_sentiment_engine()
    articles = []
    scores = []
    for item in news_items:
        text_parts = [
            (item.headline or "").strip(),
            (item.summary or "").strip(),
        ]
        text = " ".join([p for p in text_parts if p])
        if not text:
            continue
        sentiment = engine.score(text)
        score = float(sentiment.get("score", 0.0))
        scores.append(score)
        articles.append(
            {
                "article_id": item.article_id,
                "headline": item.headline,
                "summary": item.summary,
                "url": item.url,
                "symbols": item.symbols,
                "source": item.source,
                "score": score,
                "model_used": sentiment.get("model_used"),
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
        )

    average_score = sum(scores) / len(scores) if scores else None
    return jsonify(
        {
            "ticker": ticker,
            "count": len(articles),
            "average_score": average_score,
            "articles": articles,
        }
    )


@dashboard_bp.route("/alerts", methods=["GET"])
def list_alerts():
    """High-impact news alerts for dashboard."""
    limit = min(int(request.args.get("limit", 50)), 200)
    repo = get_repo()
    return jsonify(repo.get_recent_alerts(limit=limit))


@dashboard_bp.route("/live/sentiment", methods=["GET"])
def live_sentiment():
    """Latest aggregate sentiment from Redis (real-time)."""
    data = get_redis().get_latest_sentiment()
    return jsonify(data or {})


@dashboard_bp.route("/live/buzz", methods=["GET"])
def live_buzz():
    """Latest social buzz metrics from Redis (e.g. LunarCrush)."""
    data = get_redis().get_latest_buzz()
    return jsonify(data or {})


@dashboard_bp.route("/live/circuit_breaker", methods=["GET"])
def circuit_breaker_status():
    """Whether risk circuit breaker is active."""
    tripped = get_redis().circuit_breaker_tripped()
    return jsonify({"tripped": tripped})


@dashboard_bp.route("/circuit-breaker", methods=["GET"])
def get_circuit_breaker():
    """Get current circuit breaker state."""
    tripped = get_redis().circuit_breaker_tripped()
    return jsonify({"tripped": tripped})


@dashboard_bp.route("/circuit-breaker", methods=["POST"])
def set_circuit_breaker():
    """Set or clear the risk circuit breaker. Body: { tripped: bool }"""
    body = request.get_json(silent=True) or {}
    tripped = bool(body.get("tripped", False))
    get_redis().set_circuit_breaker(tripped)
    return jsonify({"tripped": tripped, "ok": True})


@dashboard_bp.route("/log-trade", methods=["POST"])
def log_trade():
    """
    Log a manually placed trade to the SQLite trade_log.
    Body: { symbol, side, qty, order_id, price, sentiment_score? }
    """
    body = request.get_json(silent=True) or {}
    symbol = (body.get("symbol") or "").strip().upper()
    side = (body.get("side") or "").strip().lower()
    if not symbol or side not in ("buy", "sell"):
        return jsonify({"error": "symbol and side (buy|sell) are required"}), 400
    try:
        qty = float(body.get("qty", 1))
        price = float(body["price"]) if body.get("price") else None
    except (ValueError, TypeError):
        return jsonify({"error": "invalid qty or price"}), 400

    row_id = get_repo().insert_trade(
        ticker=symbol,
        side=side,
        qty=qty,
        price=price,
        order_id=body.get("order_id"),
        sentiment_score=body.get("sentiment_score"),
        signal_source="manual_dashboard",
    )
    return jsonify({"ok": True, "row_id": row_id}), 201


@dashboard_bp.route("/lunarcrush/<symbol>", methods=["GET"])
def lunarcrush_buzz(symbol: str):
    """Return LunarCrush social buzz metrics for a symbol."""
    symbol = symbol.upper()
    svc = LunarCrushService()
    buzz = svc.get_social_buzz(symbol)
    if not buzz:
        return jsonify({"symbol": symbol, "available": False, "metrics": {}})
    return jsonify({"symbol": symbol, "available": True, **buzz})


@dashboard_bp.route("/sentiment/by_ticker_llama", methods=["GET"])
def sentiment_by_ticker_llama():
    """
    On-demand sentiment using Llama 3 (Groq) for a ticker.
    Same as /sentiment/by_ticker but uses use_llama=True engine.
    """
    ticker = (request.args.get("ticker") or request.args.get("symbol") or "").strip().upper()
    if not ticker:
        return jsonify({"error": "ticker parameter is required"}), 400
    try:
        limit = min(int(request.args.get("limit", 6)), 20)
    except ValueError:
        limit = 6

    news_items = fetch_all_sources(ticker, limit_per_source=max(2, limit // 3))
    if not news_items:
        return jsonify({"ticker": ticker, "count": 0, "average_score": None, "articles": [], "model": "llama3"})

    engine = SentimentEngine(use_finbert=False, use_llama=True)
    articles = []
    scores = []
    for item in news_items:
        text = " ".join(p for p in [(item.headline or "").strip(), (item.summary or "").strip()] if p)
        if not text:
            continue
        sentiment = engine.score(text)
        score = float(sentiment.get("score", 0.0))
        scores.append(score)
        articles.append({
            "article_id": item.article_id,
            "headline": item.headline,
            "url": item.url,
            "source": item.source,
            "score": score,
            "model_used": sentiment.get("model_used"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })

    average_score = sum(scores) / len(scores) if scores else None
    return jsonify({"ticker": ticker, "count": len(articles), "average_score": average_score,
                    "articles": articles, "model": "llama3"})
