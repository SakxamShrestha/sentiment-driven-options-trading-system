# TradeSent.AI

**AI-Powered Paper Trading Simulator with Real-Time Sentiment Analysis**

TradeSent.AI is a full-stack paper trading simulator that combines multi-source financial news ingestion, AI sentiment scoring (FinBERT / Llama 3), and Alpaca's paper trading API into a single interactive dashboard. Think of it as a Bloomberg Terminal lite — but for learning and strategy testing.

---

## What It Does

- **Paper trade** stocks using Alpaca's paper environment ($100,000 virtual USD)
- **Search any ticker** for a live candlestick chart (1m / 5m / 1H / 1D), price, and daily change
- **AI sentiment scoring** on recent news per ticker using FinBERT or Llama 3 (via Groq)
- **LunarCrush social buzz** — Galaxy Score and social volume per ticker
- **Risk circuit breaker** — one-click toggle to pause all automated signals
- **Backtester** — simulate a momentum strategy on historical OHLCV bars
- **Realized P&L tracker** — computed from fill activity history
- **Portfolio equity chart** — live area chart of your paper portfolio over time
- **Trade log** — every order placed through the dashboard is persisted to SQLite

---

## System Architecture

```
┌─ Ingestion ──────────────────────────────────────────────┐
│  Alpaca News WebSocket · NewsAPI · StockTwits             │
│  Yahoo Finance RSS · Finviz scraper                       │
└──────────────────────┬───────────────────────────────────┘
                       │
┌─ Intelligence ────────▼──────────────────────────────────┐
│  NewsPipeline → SentimentEngine (FinBERT / Llama 3)      │
│  TradeSignalService · Risk Circuit Breaker                │
└──────────────────────┬───────────────────────────────────┘
                       │
┌─ Data ────────────────▼──────────────────────────────────┐
│  Redis (live state)  ·  SQLite (trade log, sentiment)    │
└──────────────────────────────────────────────────────────┘
                       │
┌─ Backend API ─────────▼──────────────────────────────────┐
│  Flask · api/routes/dashboard.py · api/routes/trading.py │
└──────────────────────┬───────────────────────────────────┘
                       │
┌─ Frontend ────────────▼──────────────────────────────────┐
│  HTML/CSS/JS SPA · TradingView Lightweight Charts        │
│  http://localhost:5001                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.10+, Flask |
| Frontend | HTML / CSS / JavaScript (SPA-lite) |
| Charts | TradingView Lightweight Charts v4 |
| Database | Redis (live state), SQLite (history) |
| Broker API | Alpaca Paper Trading API |
| News | Alpaca News WebSocket + REST, NewsAPI.org, StockTwits, Yahoo RSS, Finviz |
| AI | FinBERT (`ProsusAI/finbert` via HuggingFace), Llama 3 via Groq API |
| Social | LunarCrush API v4 |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Redis server (`brew install redis` on macOS, then `redis-server`)
- Alpaca account at [alpaca.markets](https://alpaca.markets/) with **Paper Trading** keys

### Installation

```bash
git clone https://github.com/SakxamShrestha/sentiment-driven-options-trading-system.git
cd Stock-Tracker-by-Sakxam

python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
```

### Connecting Alpaca

1. Sign up at [alpaca.markets](https://alpaca.markets/) and select **Paper Trading**
2. Go to **Paper Trading → API Keys** → Generate a new key pair
3. Set in `.env`:
   ```
   ALPACA_API_KEY=your_key_id
   ALPACA_SECRET_KEY=your_secret_key
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ```

### Optional API Keys (in `.env`)

| Key | Feature it unlocks |
|-----|--------------------|
| `NEWSAPI_API_KEY` | More news articles in sentiment lookup |
| `LUNARCRUSH_API_KEY` | Social buzz card (Galaxy Score, social volume) on Sentiment page |
| `GROQ_API_KEY` | Llama 3 model toggle on Sentiment page |

### Run

```bash
redis-server &          # start Redis in background
python main.py          # start Flask on port 5001
```

Open **http://localhost:5001** in your browser.

> Set `FLASK_PORT=5002` in `.env` if port 5001 is in use.

---

## Dashboard Features

| Page | What you see |
|------|-------------|
| **Home** | Portfolio equity chart, balances, top positions, quick Buy/Sell panel |
| **Account → Positions** | All open positions with unrealized P&L |
| **Account → Orders** | Order history with cancel button for open orders |
| **Account → Activities** | Fill history + Realized P&L table (FIFO-computed) |
| **Account → Balances** | Full account balance breakdown |
| **Sentiment** | Circuit breaker toggle · FinBERT / Llama 3 model toggle · per-ticker analysis · LunarCrush social buzz |
| **Backtest** | Momentum-proxy backtest over 1W / 1M / 3M / 6M / 1Y history |
| **Learn** | How TradeSent.AI works — all features explained |

---

## API Routes

### Dashboard (`/api/...`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/trades` | Recent trade log (SQLite) |
| GET | `/api/sentiment` | Recent sentiment metadata |
| GET | `/api/alerts` | High-impact alerts |
| GET | `/api/live/sentiment` | Latest sentiment from Redis |
| GET | `/api/circuit-breaker` | Circuit breaker state |
| POST | `/api/circuit-breaker` | Set circuit breaker `{ tripped: bool }` |
| POST | `/api/log-trade` | Log a trade to SQLite |
| GET | `/api/sentiment/by_ticker` | On-demand FinBERT scoring |
| GET | `/api/sentiment/by_ticker_llama` | On-demand Llama 3 scoring |
| GET | `/api/lunarcrush/<symbol>` | LunarCrush social buzz |

### Trading (`/api/alpaca/...`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/alpaca/account` | Account details |
| GET | `/api/alpaca/positions` | Open positions |
| GET | `/api/alpaca/orders` | Orders |
| GET | `/api/alpaca/activities` | Fill history |
| POST | `/api/alpaca/order` | Place order |
| DELETE | `/api/alpaca/order/<id>` | Cancel order |
| GET | `/api/alpaca/snapshot/<symbol>` | Price + daily change |
| GET | `/api/alpaca/bars/<symbol>` | OHLCV bars for charting |
| GET | `/api/alpaca/portfolio-history` | Portfolio equity over time |
| GET | `/api/alpaca/backtest/<symbol>` | Run momentum backtest |

---

## Configuration (`.env`)

| Variable | Description |
|----------|-------------|
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | Alpaca paper trading keys |
| `ALPACA_BASE_URL` | Default: `https://paper-api.alpaca.markets` |
| `ALPACA_STREAM_NEWS_URL` | News WebSocket (default: sandbox stream) |
| `LUNARCRUSH_API_KEY` | LunarCrush social buzz |
| `NEWSAPI_API_KEY` | NewsAPI.org (additional news source) |
| `GROQ_API_KEY` | Groq API for Llama 3 scoring |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `FLASK_PORT` | Server port (default `5001`) |
| `SENTIMENT_THRESHOLD_BULLISH` | Bullish signal threshold (default `0.6`) |
| `SENTIMENT_THRESHOLD_BEARISH` | Bearish signal threshold (default `-0.6`) |

---

## Testing

```bash
pytest
pytest tests/test_phase1.py
pytest --cov=. --cov-report=html
```

---

## Project Structure

```
Stock-Tracker-by-Sakxam/
├── api/routes/
│   ├── dashboard.py        # /api/* — sentiment, circuit breaker, log-trade, LunarCrush
│   └── trading.py          # /api/alpaca/* — Alpaca paper trading + backtest
├── config/settings.py      # All env-based config
├── db/
│   ├── redis_state.py      # Live state (circuit breaker, sentiment, buzz)
│   └── sqlite_repository.py # Trade log, sentiment metadata, alerts
├── services/
│   ├── data_ingestion/     # Alpaca, NewsAPI, StockTwits, Yahoo RSS, Finviz, LunarCrush
│   ├── intelligence/       # SentimentEngine (FinBERT + Llama 3), TradeSignalService
│   ├── pipeline.py         # Orchestrates: NewsItem → score → signal → persist
│   └── backtesting/        # Backtester class (OHLCV momentum simulation)
├── static/dashboard.html   # Full SPA dashboard (HTML/CSS/JS)
├── main.py                 # Flask entry point
├── requirements.txt
├── .env.example
└── IMPLEMENTATION_PLAN.md
```

---

## Disclaimers

- **Paper only by default** — no real money. Set `ENABLE_LIVE_TRADING=true` only after thorough review.
- Past or simulated performance does not guarantee future results.
- Ensure compliance with your jurisdiction and broker terms.

---

## Repository

**GitHub:** [SakxamShrestha/sentiment-driven-options-trading-system](https://github.com/SakxamShrestha/sentiment-driven-options-trading-system/)
