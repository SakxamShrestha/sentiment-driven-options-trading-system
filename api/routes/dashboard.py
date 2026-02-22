"""
Dashboard API routes: trades, sentiment, alerts, live state.
"""

from typing import Optional

from flask import Blueprint, jsonify, request

from db import RedisState, SQLiteRepository

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")

_repo: Optional[SQLiteRepository] = None
_redis: Optional[RedisState] = None


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
