# TradeSent.AI – Implementation Plan

Incremental, iterative development aligned with the CSCI 411/412 Senior Seminar 14-week timeline. Progress tracked via GitHub commits and documentation updates.

**Repository:** [github.com/SakxamShrestha/sentiment-driven-options-trading-system](https://github.com/SakxamShrestha/sentiment-driven-options-trading-system/)

---

## Week 1–2: Finalizing project scope and API access

**Proposal milestone:** Finalizing project scope and setting up Alpaca/LunarCrush API access.

| Task | Status |
|------|--------|
| Project scope and repo setup (TradeSent.AI) | Done |
| Alpaca API access (paper trading + news) | Done |
| LunarCrush API key and basic REST client | Done |
| Config and `.env` (Alpaca, LunarCrush, Redis, SQLite, thresholds) | Done |
| Data layer: SQLite schema (`trade_log`, `sentiment_metadata`, `alerts`) | Done |
| Data layer: RedisState for live state | Done |
| Dashboard API routes: `/api/trades`, `/api/sentiment`, `/api/alerts`, `/api/live/*` | Done |

---

## Week 3–4: System architecture and ingestion pipeline

**Proposal milestone:** Designing system architecture and real-time data ingestion pipeline.

| Task | Status |
|------|--------|
| Alpaca News WebSocket client (`AlpacaNewsStreamService`) | Done |
| Alpaca News REST fallback (`fetch_news_rest`) | Done |
| LunarCrush service and optional polling loop | Done |
| Optional: Twitter/Reddit ingestion for social sentiment | Done |
| Wire ingestion callbacks to push news/social items into intelligence layer | Pending |
| Integration test: news item → pipeline → DB/Redis | Pending |

---

## Week 5–6: Backend sentiment engine

**Proposal milestone:** Implementing backend sentiment engine (FinBERT/Llama 3).

| Task | Status |
|------|--------|
| SentimentEngine with FinBERT | Done |
| Llama 3 integration (e.g. Groq) in `SentimentEngine` | Pending |
| TradeSignalService (thresholds, circuit breaker check) | Done |
| Pipeline: NewsItem → SentimentEngine → TradeSignalService → signal | Pending |
| Persist sentiment to SQLite and update Redis for dashboard | Pending |
| Unit tests: sentiment scoring, signal logic | Pending |

---

## Week 7–8: Frontend monitoring dashboard

**Proposal milestone:** Developing frontend monitoring dashboard.

| Task | Status |
|------|--------|
| Frontend: React or Streamlit | Pending |
| Live sentiment scores and buzz metrics (Redis + SocketIO) | Pending |
| Trade history (successful vs unsuccessful sentiment-driven trades) | Pending |
| Active alerts for high-impact news | Pending |
| Responsive layout for desktop trading hours | Pending |

---

## Week 9: Intelligence + Alpaca trading integration

**Proposal milestone:** Integrating the intelligence layer with the Alpaca trading API.

| Task | Status |
|------|--------|
| Alpaca order execution (paper): place/cancel orders from signals | Pending |
| Record every execution in `trade_log` via SQLiteRepository | Pending |
| Enforce user settings: max position size, max daily trades, thresholds | Pending |
| Integration test: news → sentiment → signal → paper order → DB | Pending |

---

## Week 10: Midterm demo and latency report

**Proposal milestone:** Midterm demo and latency progress report.

| Task | Status |
|------|--------|
| Midterm demo: end-to-end pipeline in paper mode | Pending |
| Latency report: measure news-to-trade and dashboard update latency | Pending |

---

## Week 11–12: Feature refinement and circuit breaker

**Proposal milestone:** Feature refinement and risk circuit-breaker implementation.

| Task | Status |
|------|--------|
| Risk circuit-breaker implementation (Redis + config) | Pending |
| Feature refinement: filters, symbol allowlist, alert rules | Pending |
| Logging and error handling across ingestion and intelligence | Pending |

---

## Week 13: Final validation and documentation

**Proposal milestone:** Final validation, backtesting, and documentation.

| Task | Status |
|------|--------|
| Final validation and backtesting on historical data | Pending |
| Documentation: README, ARCHITECTURE, code comments | Pending |
| Final report: design, AI logic, performance results | Pending |

---

## Week 14: Final report and live demonstration

**Proposal milestone:** Final report submission and live demonstration.

| Task | Status |
|------|--------|
| Final report submission | Pending |
| Live demonstration: bot trading in real-time paper environment | Pending |

---

## Deliverables Checklist

- [ ] Fully functional automated trading engine
- [ ] Fully functional web-based monitoring dashboard
- [ ] Complete GitHub repository (source code + documentation)
- [ ] Final written report (design, AI logic, performance results)
- [ ] Live demonstration in paper trading environment
