"""
Alpaca paper trading routes: account, positions, orders, and order placement.
"""

import json
from typing import Optional

import requests as req
from flask import Blueprint, jsonify, request

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

trading_bp = Blueprint("trading", __name__, url_prefix="/api/alpaca")

_HEADERS = {
    "APCA-API-KEY-ID": settings.ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": settings.ALPACA_SECRET_KEY,
    "Content-Type": "application/json",
}
_BASE = settings.ALPACA_BASE_URL.rstrip("/")
_DATA = "https://data.alpaca.markets"


def _get(path: str, params: Optional[dict] = None):
    try:
        r = req.get(f"{_BASE}{path}", headers=_HEADERS, params=params, timeout=10)
        r.raise_for_status()
        return r.json(), None
    except req.HTTPError as e:
        return None, f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as e:
        return None, str(e)


def _post(path: str, body: dict):
    try:
        r = req.post(f"{_BASE}{path}", headers=_HEADERS, json=body, timeout=10)
        r.raise_for_status()
        return r.json(), None
    except req.HTTPError as e:
        return None, f"HTTP {r.status_code}: {r.text[:400]}"
    except Exception as e:
        return None, str(e)


def _delete(path: str):
    try:
        r = req.delete(f"{_BASE}{path}", headers=_HEADERS, timeout=10)
        r.raise_for_status()
        return True, None
    except req.HTTPError as e:
        return None, f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as e:
        return None, str(e)


@trading_bp.route("/account", methods=["GET"])
def get_account():
    """Return Alpaca paper account details."""
    data, err = _get("/v2/account")
    if err:
        logger.warning("Account fetch failed: %s", err)
        return jsonify({"error": err}), 502
    return jsonify(data)


@trading_bp.route("/positions", methods=["GET"])
def get_positions():
    """Return all open positions."""
    data, err = _get("/v2/positions")
    if err:
        logger.warning("Positions fetch failed: %s", err)
        return jsonify({"error": err}), 502
    return jsonify(data or [])


@trading_bp.route("/orders", methods=["GET"])
def get_orders():
    """Return recent orders. Query params: status (open|closed|all), limit."""
    status = request.args.get("status", "all")
    limit = min(int(request.args.get("limit", 50)), 200)
    data, err = _get("/v2/orders", params={"status": status, "limit": limit, "direction": "desc"})
    if err:
        logger.warning("Orders fetch failed: %s", err)
        return jsonify({"error": err}), 502
    return jsonify(data or [])


@trading_bp.route("/activities", methods=["GET"])
def get_activities():
    """Return account activities (fills, dividends, etc.)."""
    activity_type = request.args.get("type", "FILL")
    data, err = _get("/v2/account/activities", params={"activity_type": activity_type, "page_size": 50})
    if err:
        logger.warning("Activities fetch failed: %s", err)
        return jsonify({"error": err}), 502
    return jsonify(data or [])


@trading_bp.route("/order", methods=["POST"])
def place_order():
    """
    Place a paper trade order.
    Body: { symbol, qty, side (buy|sell), type (market|limit), time_in_force, limit_price? }
    """
    body = request.get_json(silent=True) or {}
    symbol = (body.get("symbol") or "").strip().upper()
    side = (body.get("side") or "buy").lower()
    order_type = (body.get("type") or "market").lower()
    time_in_force = (body.get("time_in_force") or "day").lower()

    if not symbol:
        return jsonify({"error": "symbol is required"}), 400
    if side not in ("buy", "sell"):
        return jsonify({"error": "side must be buy or sell"}), 400

    qty = body.get("qty")
    notional = body.get("notional")
    if not qty and not notional:
        return jsonify({"error": "qty or notional is required"}), 400

    order_body: dict = {
        "symbol": symbol,
        "side": side,
        "type": order_type,
        "time_in_force": time_in_force,
    }
    if qty:
        order_body["qty"] = str(qty)
    else:
        order_body["notional"] = str(notional)

    if order_type == "limit":
        limit_price = body.get("limit_price")
        if not limit_price:
            return jsonify({"error": "limit_price required for limit orders"}), 400
        order_body["limit_price"] = str(limit_price)

    data, err = _post("/v2/orders", order_body)
    if err:
        logger.warning("Order placement failed: %s", err)
        return jsonify({"error": err}), 502
    return jsonify(data), 201


@trading_bp.route("/order/<order_id>", methods=["DELETE"])
def cancel_order(order_id: str):
    """Cancel an open order by ID."""
    ok, err = _delete(f"/v2/orders/{order_id}")
    if err:
        return jsonify({"error": err}), 502
    return jsonify({"cancelled": order_id})


@trading_bp.route("/quote/<symbol>", methods=["GET"])
def get_quote(symbol: str):
    """Return latest quote (bid/ask/price) for a symbol via Alpaca data API."""
    symbol = symbol.upper()
    try:
        r = req.get(
            f"{_DATA}/v2/stocks/{symbol}/quotes/latest",
            headers=_HEADERS,
            timeout=8,
        )
        r.raise_for_status()
        data = r.json()
        quote = data.get("quote", {})
        return jsonify({
            "symbol": symbol,
            "bid": quote.get("bp"),
            "ask": quote.get("ap"),
            "bid_size": quote.get("bs"),
            "ask_size": quote.get("as"),
            "timestamp": quote.get("t"),
        })
    except Exception as e:
        logger.debug("Quote fetch failed for %s: %s", symbol, e)
        return jsonify({"symbol": symbol, "bid": None, "ask": None, "error": str(e)}), 200
