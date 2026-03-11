"""
Simple sentiment-driven backtester.

Strategy:
  - When a simulated sentiment signal crosses the bullish threshold → BUY at next bar open
  - When it crosses the bearish threshold (or a position is held for max_hold_bars) → SELL at next bar open
  - One position at a time; no fractional shares (uses fixed notional per trade)

Data source: Alpaca historical bars (/v2/stocks/{symbol}/bars).
Sentiment is simulated by computing a 3-bar rolling momentum proxy of close price
(since we don't have historical sentiment archives).
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from utils.logger import setup_logger

logger = setup_logger(__name__)

STARTING_CAPITAL = 100_000.0


class Backtester:
    """
    Runs a simple momentum/sentiment backtest over historical OHLCV bars.

    Parameters
    ----------
    symbol : str
    period : str  – one of '1W', '1M', '3M', '6M', '1Y'
    threshold_bullish : float  – momentum proxy score that triggers a buy  (default 0.01)
    threshold_bearish : float  – momentum proxy score that triggers a sell (default -0.01)
    trade_notional : float     – USD per trade (default $5,000)
    max_hold_bars : int        – force-exit after this many bars            (default 20)
    alpaca_headers : dict      – Alpaca API auth headers
    alpaca_data_url : str      – Alpaca data base URL
    """

    PERIOD_MAP = {
        "1W": (timedelta(weeks=1),  "1Hour"),
        "1M": (timedelta(days=30),  "1Day"),
        "3M": (timedelta(days=90),  "1Day"),
        "6M": (timedelta(days=180), "1Day"),
        "1Y": (timedelta(days=365), "1Day"),
    }

    def __init__(
        self,
        symbol: str,
        period: str = "1M",
        threshold_bullish: float = 0.01,
        threshold_bearish: float = -0.01,
        trade_notional: float = 5_000.0,
        max_hold_bars: int = 20,
        alpaca_headers: Optional[Dict] = None,
        alpaca_data_url: str = "https://data.alpaca.markets",
    ):
        self.symbol = symbol.upper()
        self.period = period.upper()
        self.threshold_bullish = threshold_bullish
        self.threshold_bearish = threshold_bearish
        self.trade_notional = trade_notional
        self.max_hold_bars = max_hold_bars
        self.alpaca_headers = alpaca_headers or {}
        self.alpaca_data_url = alpaca_data_url.rstrip("/")

    def _fetch_bars(self) -> List[Dict]:
        """Fetch historical bars from Alpaca data API."""
        import requests as req

        delta, timeframe = self.PERIOD_MAP.get(self.period, (timedelta(days=30), "1Day"))
        start = (datetime.now(timezone.utc) - delta).isoformat()

        try:
            r = req.get(
                f"{self.alpaca_data_url}/v2/stocks/{self.symbol}/bars",
                headers=self.alpaca_headers,
                params={
                    "timeframe": timeframe,
                    "start": start,
                    "limit": 1000,
                    "adjustment": "raw",
                    "feed": "iex",
                },
                timeout=15,
            )
            r.raise_for_status()
            return r.json().get("bars", [])
        except Exception as e:
            logger.warning("Backtester: bar fetch failed for %s: %s", self.symbol, e)
            return []

    @staticmethod
    def _momentum_signal(bars: List[Dict], i: int, window: int = 3) -> float:
        """
        Compute a simple normalized momentum proxy as a sentiment stand-in.
        Returns (close[i] - close[i-window]) / close[i-window], clamped to [-1, 1].
        """
        if i < window:
            return 0.0
        prev = bars[i - window]["c"]
        curr = bars[i]["c"]
        if prev == 0:
            return 0.0
        return max(-1.0, min(1.0, (curr - prev) / prev))

    def run(self) -> Dict[str, Any]:
        """
        Execute the backtest. Returns a result dict:
        {
          symbol, period, bars_count, trades: [...],
          total_return_pct, win_rate, max_drawdown_pct,
          final_equity, starting_equity
        }
        """
        bars = self._fetch_bars()
        if len(bars) < 5:
            return {
                "symbol": self.symbol, "period": self.period,
                "error": "Insufficient bar data (need at least 5 bars)",
                "bars_count": len(bars), "trades": [],
                "total_return_pct": 0.0, "win_rate": 0.0,
                "final_equity": STARTING_CAPITAL, "starting_equity": STARTING_CAPITAL,
            }

        equity = STARTING_CAPITAL
        position: Optional[Dict] = None  # { entry_price, shares, entry_idx, entry_time }
        trades: List[Dict] = []
        equity_curve = [equity]

        for i, bar in enumerate(bars):
            signal = self._momentum_signal(bars, i)

            # Check exit first (before entry on same bar)
            if position is not None:
                bars_held = i - position["entry_idx"]
                should_exit = (
                    signal <= self.threshold_bearish
                    or bars_held >= self.max_hold_bars
                )
                if should_exit:
                    exit_price = bar["o"]
                    pnl = (exit_price - position["entry_price"]) * position["shares"]
                    equity += pnl
                    trades.append({
                        "entry_time": position["entry_time"],
                        "exit_time": bar["t"],
                        "symbol": self.symbol,
                        "side": "buy",
                        "shares": round(position["shares"], 4),
                        "entry_price": round(position["entry_price"], 4),
                        "exit_price": round(exit_price, 4),
                        "pnl": round(pnl, 2),
                        "pnl_pct": round((exit_price / position["entry_price"] - 1) * 100, 3),
                        "bars_held": bars_held,
                        "exit_reason": "signal" if signal <= self.threshold_bearish else "max_hold",
                    })
                    position = None

            # Check entry
            if position is None and signal >= self.threshold_bullish and i + 1 < len(bars):
                entry_price = bars[i + 1]["o"]  # enter at next bar open
                if entry_price > 0 and equity > 0:
                    notional = min(self.trade_notional, equity)
                    shares = notional / entry_price
                    position = {
                        "entry_price": entry_price,
                        "shares": shares,
                        "entry_idx": i + 1,
                        "entry_time": bars[i + 1]["t"],
                    }

            equity_curve.append(equity)

        # Force-close any open position at last bar close
        if position is not None and bars:
            exit_price = bars[-1]["c"]
            pnl = (exit_price - position["entry_price"]) * position["shares"]
            equity += pnl
            trades.append({
                "entry_time": position["entry_time"],
                "exit_time": bars[-1]["t"],
                "symbol": self.symbol,
                "side": "buy",
                "shares": round(position["shares"], 4),
                "entry_price": round(position["entry_price"], 4),
                "exit_price": round(exit_price, 4),
                "pnl": round(pnl, 2),
                "pnl_pct": round((exit_price / position["entry_price"] - 1) * 100, 3),
                "bars_held": len(bars) - 1 - position["entry_idx"],
                "exit_reason": "end_of_data",
            })

        # Metrics
        total_return_pct = round((equity - STARTING_CAPITAL) / STARTING_CAPITAL * 100, 3)
        winning = [t for t in trades if t["pnl"] > 0]
        win_rate = round(len(winning) / len(trades) * 100, 1) if trades else 0.0

        # Max drawdown
        peak = STARTING_CAPITAL
        max_dd = 0.0
        running = STARTING_CAPITAL
        for t in trades:
            running += t["pnl"]
            peak = max(peak, running)
            dd = (peak - running) / peak * 100 if peak > 0 else 0.0
            max_dd = max(max_dd, dd)

        return {
            "symbol": self.symbol,
            "period": self.period,
            "bars_count": len(bars),
            "trades": trades,
            "trade_count": len(trades),
            "total_return_pct": total_return_pct,
            "win_rate": win_rate,
            "max_drawdown_pct": round(max_dd, 2),
            "final_equity": round(equity, 2),
            "starting_equity": STARTING_CAPITAL,
        }
