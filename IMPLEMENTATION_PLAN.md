# TradeSent.AI – Implementation Plan

Incremental, iterative development aligned with the CSCI 411/412 Senior Seminar 14-week timeline.

**Repository:** [github.com/SakxamShrestha/sentiment-driven-options-trading-system](https://github.com/SakxamShrestha/sentiment-driven-options-trading-system/)

> **Note:** The project pivoted in Week 7 from a pure sentiment analysis tool to a **paper trading simulator** with AI sentiment as a feature. The frontend was rebuilt as a custom HTML/CSS/JS SPA (not React or Streamlit).

---

## Week 1–2: Project scope, API access, data layer

| Task | Status |
|------|--------|
| Project scope and repo setup (TradeSent.AI) | ✅ Done |
| Alpaca API access (paper trading + news WebSocket) | ✅ Done |
| LunarCrush API key and basic REST client | ✅ Done |
| Config and `.env` (Alpaca, LunarCrush, Redis, SQLite, thresholds) | ✅ Done |
| Data layer: SQLite schema (`trade_log`, `sentiment_metadata`, `alerts`) | ✅ Done |
| Data layer: RedisState for live state and circuit breaker | ✅ Done |
| Dashboard API routes: `/api/trades`, `/api/sentiment`, `/api/alerts`, `/api/live/*` | ✅ Done |

---

## Week 3–4: Ingestion pipeline

| Task | Status |
|------|--------|
| Alpaca News WebSocket client (`AlpacaNewsStreamService`) | ✅ Done |
| Alpaca News REST fallback (`fetch_news_rest`) | ✅ Done |
| LunarCrush service and polling loop | ✅ Done |
| NewsAPI.org source | ✅ Done |
| StockTwits source | ✅ Done |
| Yahoo Finance RSS source | ✅ Done |
| Finviz scraper source | ✅ Done |
| `multi_source_service.fetch_all_sources()` aggregator | ✅ Done |
| `NewsPipeline` orchestrator wiring ingestion → intelligence | ✅ Done |

---

## Week 5–6: Intelligence layer

| Task | Status |
|------|--------|
| `SentimentEngine` with FinBERT (`ProsusAI/finbert`) | ✅ Done |
| `SentimentEngine.score_llama()` via Groq API (`llama3-8b-8192`) | ✅ Done |
| `TradeSignalService` (thresholds, circuit breaker check) | ✅ Done |
| `NewsPipeline`: NewsItem → SentimentEngine → signal → persist to SQLite + Redis | ✅ Done |

---

## Week 7–8: Frontend dashboard (SPA pivot)

| Task | Status |
|------|--------|
| ~~React or Streamlit~~ → Full HTML/CSS/JS SPA (`static/dashboard.html`) | ✅ Done |
| Sidebar navigation: Home, Account (Positions/Orders/Activities/Balances), Sentiment, Backtest, Learn | ✅ Done |
| Home page: portfolio value, equity chart, balances, top positions, quick Buy/Sell panel | ✅ Done |
| Portfolio equity chart (TradingView Lightweight Charts, area series, period selector) | ✅ Done |
| Global ticker search with live dropdown | ✅ Done |
| Stock detail page: live candlestick chart (1m/5m/1H/1D), price, change, inline buy/sell | ✅ Done |
| Positions, Orders, Activities, Balances pages | ✅ Done |
| Realized P&L table on Activities page (FIFO computation from fill history) | ✅ Done |
| Sentiment page: circuit breaker banner/toggle | ✅ Done |
| Sentiment page: FinBERT / Llama 3 model toggle | ✅ Done |
| Sentiment page: LunarCrush social buzz card | ✅ Done |
| Backtest page: symbol + period + threshold inputs, stats grid, trade log table | ✅ Done |
| Paper trading banner | ✅ Done |
| Toast notifications, spinners, empty states | ✅ Done |
| Buy/sell panel visible only on Home page | ✅ Done |

---

## Week 9: Alpaca trading integration

| Task | Status |
|------|--------|
| `api/routes/trading.py` blueprint: account, positions, orders, activities, quote | ✅ Done |
| Place / cancel orders from Buy/Sell panel | ✅ Done |
| Record every execution in `trade_log` via `/api/log-trade` → `SQLiteRepository.insert_trade()` | ✅ Done |
| Snapshot endpoint: latest price + daily change | ✅ Done |
| OHLCV bars endpoint for candlestick chart | ✅ Done |
| Portfolio history endpoint for equity chart | ✅ Done |
| Backtest endpoint (`/api/alpaca/backtest/<symbol>`) | ✅ Done |

---

## Week 10: Midterm demo

| Task | Status |
|------|--------|
| End-to-end pipeline in paper mode | ✅ Done |
| Live dashboard at `http://localhost:5001` | ✅ Done |

---

## Week 11–12: Risk features and intelligence enhancements

| Task | Status |
|------|--------|
| Risk circuit breaker: Redis storage + `GET/POST /api/circuit-breaker` | ✅ Done |
| Circuit breaker UI: toggle banner on Sentiment page | ✅ Done |
| LunarCrush social buzz integrated in Sentiment page | ✅ Done |
| Llama 3 via Groq API in SentimentEngine + model toggle on Sentiment page | ✅ Done |

---

## Week 13: Backtesting and documentation

| Task | Status |
|------|--------|
| `Backtester` class in `services/backtesting/` (momentum-proxy, FIFO P&L, max drawdown) | ✅ Done |
| Backtest page in dashboard | ✅ Done |
| README.md updated (paper trading pivot, full API docs, feature table) | ✅ Done |
| IMPLEMENTATION_PLAN.md updated to reflect actual progress | ✅ Done |

---

## Week 14: Final report and live demo

| Task | Status |
|------|--------|
| Final report: design, AI logic, performance results | Pending |
| Live demonstration: paper trading environment | Pending |

---

## Deliverables Checklist

- [x] Fully functional paper trading simulator and dashboard
- [x] Multi-source news ingestion (5 sources)
- [x] AI sentiment scoring (FinBERT + Llama 3 / Groq)
- [x] LunarCrush social buzz integration
- [x] Interactive backtester (momentum-proxy strategy)
- [x] Risk circuit breaker (Redis-backed, dashboard toggle)
- [x] Realized P&L tracker (FIFO from Alpaca fill history)
- [x] TradingView candlestick and portfolio equity charts
- [x] Trade logging to SQLite via dashboard
- [x] Complete GitHub repository (source code + documentation)
- [ ] Final written report
- [ ] Live demonstration recording
