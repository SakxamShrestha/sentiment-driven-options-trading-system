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

    # Filter: keep only articles where the ticker appears in headline, summary,
    # or symbols list. This removes off-topic results from generic news sources.
    def _is_relevant(item) -> bool:
        if ticker in [s.upper() for s in (item.symbols or [])]:
            return True
        combined = ((item.headline or "") + " " + (item.summary or "")).upper()
        return ticker in combined

    news_items = [item for item in news_items if _is_relevant(item)]

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

    repo = get_repo()
    row_id = repo.insert_trade(
        ticker=symbol,
        side=side,
        qty=qty,
        price=price,
        order_id=body.get("order_id"),
        sentiment_score=body.get("sentiment_score"),
        signal_source="manual_dashboard",
    )

    price_str = f" at ${price:.2f}" if price else ""
    verb = "Bought" if side == "buy" else "Sold"
    message = f"{verb} {qty:.4g} shares of {symbol}{price_str}"
    notif_id = repo.insert_notification(
        notif_type=side,
        message=message,
        symbol=symbol,
        side=side,
        qty=qty,
        price=price,
    )

    try:
        from flask import current_app
        sio = current_app.extensions.get("socketio")
        if sio:
            sio.emit("notification", {
                "id": notif_id, "type": side, "symbol": symbol,
                "side": side, "qty": qty, "price": price,
                "message": message, "read": 0,
            })
    except Exception:
        pass

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


@dashboard_bp.route("/sentiment/composite", methods=["GET"])
def sentiment_composite():
    """
    Composite multi-signal sentiment for a ticker.
    Uses Claude (or Groq fallback) per article + LunarCrush social blend.
    Returns rich output: composite_score, news_score, social_score, confidence,
    all_catalysts, dominant_horizon, and per-article reasoning.
    """
    from services.intelligence.composite_sentiment import score_article, aggregate_composite
    from services.data_ingestion.lunarcrush_service import LunarCrushService

    ticker = (request.args.get("ticker") or request.args.get("symbol") or "").strip().upper()
    if not ticker:
        return jsonify({"error": "ticker parameter is required"}), 400
    try:
        limit = min(int(request.args.get("limit", 10)), 20)
    except ValueError:
        limit = 10

    limit_per_source = max(2, limit // 3)
    news_items = fetch_all_sources(ticker, limit_per_source=limit_per_source)

    def _relevant(item) -> bool:
        if ticker in [s.upper() for s in (item.symbols or [])]:
            return True
        return ticker in ((item.headline or "") + " " + (item.summary or "")).upper()

    news_items = [i for i in news_items if _relevant(i)]

    if not news_items:
        return jsonify({
            "ticker": ticker,
            "composite_score": None,
            "news_score": None,
            "social_score": None,
            "confidence": 0.0,
            "all_catalysts": [],
            "dominant_horizon": None,
            "article_count": 0,
            "articles": [],
            "model_used": "none",
            "lunarcrush_available": False,
        })

    # Score each article
    article_results = []
    for item in news_items:
        text = " ".join(p for p in [(item.headline or "").strip(), (item.summary or "").strip()] if p)
        if not text:
            continue
        scored = score_article(text, ticker)
        article_results.append({
            **scored,
            "article_id": item.article_id,
            "headline": item.headline,
            "summary": item.summary,
            "url": item.url,
            "source": item.source,
            "symbols": item.symbols,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })

    # LunarCrush social signal
    lc_sentiment = None
    lc_available = False
    try:
        buzz = LunarCrushService().get_social_buzz(ticker)
        if buzz and buzz.get("sentiment") is not None:
            raw = float(buzz["sentiment"])
            # LunarCrush sentiment is typically 0-5; normalize to [-1, 1]
            lc_sentiment = max(-1.0, min(1.0, (raw - 2.5) / 2.5))
            lc_available = True
    except Exception:
        pass

    composite = aggregate_composite(article_results, lc_sentiment)
    model_used = article_results[0]["model_used"] if article_results else "none"

    return jsonify({
        "ticker": ticker,
        **composite,
        "article_count": len(article_results),
        "articles": article_results,
        "model_used": model_used,
        "lunarcrush_available": lc_available,
    })


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

    def _relevant(item) -> bool:
        if ticker in [s.upper() for s in (item.symbols or [])]:
            return True
        return ticker in ((item.headline or "") + " " + (item.summary or "")).upper()

    news_items = [item for item in news_items if _relevant(item)]

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


# ── Learn platform ─────────────────────────────────────────────

@dashboard_bp.route("/learn/lessons", methods=["GET"])
def learn_lessons():
    """All lessons. Pass ?user_id=<uid> to include completion data."""
    user_id = request.args.get("user_id", "").strip()
    repo = get_repo()
    lessons = repo.get_lessons()
    if user_id:
        progress = {p["lesson_id"]: p for p in repo.get_user_progress(user_id)}
        for lesson in lessons:
            p = progress.get(lesson["id"])
            lesson["completed"]  = p is not None
            lesson["best_score"] = p["best_score"] if p else None
            lesson["attempts"]   = p["attempts"]   if p else 0
    return jsonify(lessons)


@dashboard_bp.route("/learn/lessons/<int:lesson_id>/questions", methods=["GET"])
def learn_questions(lesson_id: int):
    """Quiz questions for a lesson."""
    questions = get_repo().get_quiz_questions(lesson_id)
    if not questions:
        return jsonify({"error": "Lesson not found or has no questions"}), 404
    return jsonify(questions)


@dashboard_bp.route("/learn/progress", methods=["POST"])
def save_learn_progress():
    """
    Record a quiz attempt.
    Body: { user_id, lesson_id, score, total }
    """
    body = request.get_json(silent=True) or {}
    user_id   = str(body.get("user_id",   "")).strip()
    lesson_id = body.get("lesson_id")
    score     = body.get("score")
    total     = body.get("total")

    if not user_id or lesson_id is None or score is None or total is None:
        return jsonify({"error": "user_id, lesson_id, score, and total are required"}), 400

    row_id = get_repo().save_progress(
        user_id=user_id,
        lesson_id=int(lesson_id),
        score=int(score),
        total=int(total),
    )
    return jsonify({"ok": True, "id": row_id}), 201


@dashboard_bp.route("/learn/progress/<user_id>", methods=["GET"])
def get_learn_progress(user_id: str):
    """All lesson completions for a user (best score per lesson)."""
    progress = get_repo().get_user_progress(user_id.strip())
    return jsonify(progress)


# ── Learn: Tip of the Day ──────────────────────────────────────

_FALLBACK_TIP = {
    "quote": "The stock market is a device for transferring money from the impatient to the patient.",
    "author": "Warren Buffett",
}


@dashboard_bp.route("/learn/daily-trivia", methods=["GET"])
def daily_trivia_question():
    """Return one random quiz question for Daily Trivia."""
    question = get_repo().get_random_question()
    if not question:
        return jsonify({"error": "No questions available"}), 404
    return jsonify(question)


@dashboard_bp.route("/learn/tip", methods=["GET"])
def daily_tip():
    """
    Return today's investing tip of the day (UTC date).
    Checks Redis first; generates via Groq (Llama 3) on cache miss.
    TTL: 25 hours — one generation per calendar day.
    """
    from datetime import datetime, timezone
    import json, re, requests as req
    from config.settings import settings

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    redis = get_redis()

    cached = redis.get_daily_tip(today)
    if cached:
        return jsonify(cached)

    # Cache miss — generate via Groq
    tip = None
    if settings.GROQ_API_KEY:
        try:
            prompt = (
                "You are a knowledgeable investing educator. Generate a single, memorable, "
                "insightful quote or tip about investing, trading, or personal finance. "
                "It must be genuinely useful — not generic. It can be from a famous investor, "
                "economist, or trader, OR an original tip. "
                "Reply with ONLY a JSON object — no markdown, no extra text — in this exact shape:\n"
                '{"quote": "...", "author": "..."}\n'
                "If it is an original tip, set author to \"TradeSent.AI\"."
            )
            r = req.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.9,
                    "max_tokens": 128,
                },
                timeout=10,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"].strip()
            match = re.search(r'\{.*?\}', content, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
                quote = str(parsed.get("quote", "")).strip()
                author = str(parsed.get("author", "")).strip()
                if quote and author:
                    tip = {"quote": quote, "author": author}
        except Exception:
            pass  # fall through to fallback

    if tip is None:
        tip = _FALLBACK_TIP

    redis.set_daily_tip(today, tip)
    return jsonify(tip)


# ── Notifications ──────────────────────────────────────────────

@dashboard_bp.route("/notifications", methods=["GET"])
def get_notifications():
    """Return recent notifications with unread count."""
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    repo = get_repo()
    return jsonify({
        "notifications": repo.get_notifications(limit=limit, offset=offset),
        "unread_count": repo.get_unread_count(),
    })


@dashboard_bp.route("/notifications/read", methods=["POST"])
def mark_notifications_read():
    """Mark all notifications as read."""
    count = get_repo().mark_notifications_read()
    return jsonify({"ok": True, "marked": count})
