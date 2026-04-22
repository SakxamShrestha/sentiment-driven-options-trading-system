"""
Alpaca paper trading routes: account, positions, orders, and order placement.
"""

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


@trading_bp.route("/snapshot/<symbol>", methods=["GET"])
def get_snapshot(symbol: str):
    """Return latest trade price + daily open for computing change."""
    symbol = symbol.upper()
    try:
        r_trade = req.get(
            f"{_DATA}/v2/stocks/{symbol}/trades/latest",
            headers=_HEADERS,
            timeout=8,
        )
        r_trade.raise_for_status()
        trade = r_trade.json().get("trade", {})
        last_price = trade.get("p")

        r_bar = req.get(
            f"{_DATA}/v2/stocks/{symbol}/bars/latest",
            headers=_HEADERS,
            timeout=8,
        )
        r_bar.raise_for_status()
        bar = r_bar.json().get("bar", {})
        open_price = bar.get("o")

        change = None
        change_pct = None
        if last_price is not None and open_price:
            change = float(last_price) - float(open_price)
            change_pct = (change / float(open_price)) * 100

        return jsonify({
            "symbol": symbol,
            "price": last_price,
            "open": open_price,
            "high": bar.get("h"),
            "low": bar.get("l"),
            "volume": bar.get("v"),
            "change": change,
            "change_pct": change_pct,
            "timestamp": trade.get("t"),
        })
    except Exception as e:
        logger.debug("Snapshot fetch failed for %s: %s", symbol, e)
        return jsonify({"symbol": symbol, "price": None, "error": str(e)}), 200


@trading_bp.route("/bars/<symbol>", methods=["GET"])
def get_bars(symbol: str):
    """
    Return OHLCV bars for charting.
    Query params: timeframe (1Min|5Min|1Hour|1Day), limit (max 1000).
    """
    from datetime import datetime, timezone, timedelta

    symbol = symbol.upper()
    timeframe = request.args.get("timeframe", "5Min")
    try:
        limit = min(int(request.args.get("limit", 120)), 1000)
    except ValueError:
        limit = 120

    now = datetime.now(timezone.utc)
    lookbacks = {
        "1Min": timedelta(hours=6),
        "5Min": timedelta(days=2),
        "1Hour": timedelta(days=14),
        "1Day": timedelta(days=365),
    }
    start = (now - lookbacks.get(timeframe, timedelta(days=2))).isoformat()

    try:
        r = req.get(
            f"{_DATA}/v2/stocks/{symbol}/bars",
            headers=_HEADERS,
            params={
                "timeframe": timeframe,
                "start": start,
                "limit": limit,
                "adjustment": "raw",
                "feed": "iex",
            },
            timeout=12,
        )
        r.raise_for_status()
        raw_bars = r.json().get("bars", [])
        bars = [
            {"t": b["t"], "o": b["o"], "h": b["h"], "l": b["l"], "c": b["c"], "v": b["v"]}
            for b in raw_bars
        ]
        return jsonify({"symbol": symbol, "timeframe": timeframe, "bars": bars})
    except Exception as e:
        logger.debug("Bars fetch failed for %s: %s", symbol, e)
        return jsonify({"symbol": symbol, "timeframe": timeframe, "bars": [], "error": str(e)}), 200


@trading_bp.route("/portfolio-history", methods=["GET"])
def get_portfolio_history():
    """
    Return account portfolio equity history for charting.
    Query param: period (1D | 1W | 1M | 3M | 1Y | all). Default 1D.
    Returns: { timestamps: [...], equity: [...], base_value, profit_loss_pct: [...] }
    """
    period = request.args.get("period", "1D").upper()

    # Alpaca expects period like "1D", "1W", "1M", "3M", "6M", "1A" (note: 1Y = 1A in their API)
    period_map = {
        "1D": ("1D", "5Min"),
        "1W": ("1W", "1H"),
        "1M": ("1M", "1D"),
        "3M": ("3M", "1D"),
        "1Y": ("1A", "1D"),
        "ALL": ("all", "1D"),
    }
    alpaca_period, timeframe = period_map.get(period, ("1D", "5Min"))

    params = {
        "timeframe": timeframe,
        "intraday_reporting": "market_hours",
        "extended_hours": "false",
    }
    if alpaca_period != "all":
        params["period"] = alpaca_period

    data, err = _get("/v2/account/portfolio/history", params=params)
    if err:
        logger.warning("Portfolio history fetch failed: %s", err)
        return jsonify({"error": err, "timestamps": [], "equity": []}), 502

    timestamps = data.get("timestamp") or []
    equity = data.get("equity") or []
    pl_pct = data.get("profit_loss_pct") or []
    base_value = data.get("base_value", 0)

    # Zip and filter out null equity points
    points = [
        {"t": t, "v": e, "pct": p}
        for t, e, p in zip(timestamps, equity, pl_pct)
        if e is not None
    ]

    return jsonify({
        "period": period,
        "base_value": base_value,
        "points": points,
    })


@trading_bp.route("/most-actives", methods=["GET"])
def get_most_actives():
    """
    Return today's most actively traded stocks by volume from Alpaca screener.
    Query param: top (default 8, max 20).
    """
    try:
        top = min(int(request.args.get("top", 8)), 20)
    except ValueError:
        top = 8

    try:
        r = req.get(
            f"{_DATA}/v1beta1/screener/stocks/most-actives",
            headers=_HEADERS,
            params={"by": "volume", "top": top},
            timeout=8,
        )
        r.raise_for_status()
        data = r.json()
        symbols = [item["symbol"] for item in data.get("most_actives", []) if item.get("symbol")]
        return jsonify({"symbols": symbols})
    except Exception as e:
        logger.warning("Most-actives fetch failed: %s", e)
        # Fallback to market bellwethers if Alpaca screener is unavailable
        return jsonify({"symbols": ["SPY", "AAPL", "TSLA", "NVDA", "MSFT", "AMZN"], "fallback": True})


@trading_bp.route("/backtest/<symbol>", methods=["GET"])
def run_backtest(symbol: str):
    """
    Run a backtest for a symbol over a historical period.
    Query params:
      period    – 1W | 1M | 3M | 6M | 1Y  (default 1M)
      threshold – bullish momentum threshold  (default 0.01)
      notional  – USD per trade               (default 5000)
    """
    from services.backtesting import Backtester

    period = request.args.get("period", "1M").upper()
    try:
        threshold = float(request.args.get("threshold", 0.01))
        notional = float(request.args.get("notional", 5000))
    except ValueError:
        threshold, notional = 0.01, 5000.0

    bt = Backtester(
        symbol=symbol.upper(),
        period=period,
        threshold_bullish=threshold,
        threshold_bearish=-threshold,
        trade_notional=notional,
        alpaca_headers=_HEADERS,
        alpaca_data_url=_DATA,
    )
    result = bt.run()
    return jsonify(result)
