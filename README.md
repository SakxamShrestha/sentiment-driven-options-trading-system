# TradeSent.AI

**Real-Time Sentiment-Driven Analysis for Automated Trading**

An automated trading system that listens to real-time financial news and social sentiment, reduces "news-to-trade" latency for retail users, and provides a data-driven overview of market sentiment. The system supports paper trading (with user-approved settings) and a web-based monitoring dashboard.

---

## Problem Description and Motivation

Retail traders often struggle to react to market-moving news as quickly as institutional high-frequency trading (HFT) systems. Standard finance news consumption is fragmented and manual, leading to delayed decision-making and missed opportunities in volatile markets. Existing retail trading platforms like Robinhood and Webull are typically designed for manual entry rather than automated, sentiment-driven workflows.

**Goal:** Design and implement an automated trading system (with user-approved settings) that listens to real-time financial news and social sentiment, reduces news-to-trade latency, and provides a clear, data-driven overview of market sentiment.

---

## Final Product

- **Automated trading engine** – Executes paper trades based on sentiment thresholds and user rules
- **Web-based monitoring dashboard** – Live sentiment trends, trade history, and high-impact alerts
- **Persistent storage** – Trade logs and sentiment metadata across sessions
- **Secure API authentication** – Environment-based credentials
- **Responsive interface** – Real-time updates via WebSocket
- **Live demo** – Paper trading performance demonstration

---

## System Architecture (Three-Tier)

| Layer | Role |
|-------|------|
| **Ingestion** | Alpaca News WebSocket, LunarCrush API; optional Twitter/Reddit |
| **Intelligence** | Sentiment scoring (FinBERT / Llama 3), trade signals, risk circuit breaker |
| **Data** | Redis (live state), SQLite (trade logs, sentiment metadata, alerts) |

Ingestion pushes data to the intelligence layer. The intelligence layer enforces trading rules and interacts with the database and Alpaca trading API to execute and record orders.

---

## Platform and Technologies

| Component | Technology |
|-----------|------------|
| Platform | Web-based dashboard + automated backend engine |
| Backend | Python, Flask, Flask-SocketIO |
| Frontend | React or Streamlit |
| Database | Redis (live state), SQLite (historical trades) |
| APIs | Alpaca (trading + news), LunarCrush (social sentiment) |
| AI | FinBERT, Llama 3 (e.g. via Groq) |
| Deployment | Render, AWS, or similar |
| Version Control | Git, GitHub |

---

## Core Functionalities

- **Real-Time Data Ingestion** – News streaming via Alpaca News WebSocket, social data via LunarCrush
- **Sentiment Analysis** – Automated scoring using FinBERT and Llama 3
- **Automated Trade Execution** – Paper trading orders based on sentiment thresholds
- **Visual Dashboard**
  - Live sentiment scores and social "buzz" metrics
  - Successful vs. unsuccessful sentiment-driven trades
  - Active alerts for high-impact news events
- **Persistent Data Storage** – Sentiment scores and trade history across sessions
- **Responsive Design** – Desktop-accessible during trading hours

---

## Project Structure

```
Stock-Tracker-by-Sakxam/
├── config/                 # Configuration
│   └── settings.py
├── db/                     # Data layer
│   ├── redis_state.py      # Live state (Redis)
│   └── sqlite_repository.py # Trade history, sentiment, alerts (SQLite)
├── models/                 # Data models
│   ├── news_item.py
│   ├── social_post.py
│   └── trade_log.py
├── services/
│   ├── data_ingestion/     # Ingestion layer
│   │   ├── alpaca_news_service.py
│   │   ├── lunarcrush_service.py
│   │   ├── twitter_service.py
│   │   └── reddit_service.py
│   ├── intelligence/       # Intelligence layer
│   │   ├── sentiment_engine.py  # FinBERT / Llama 3
│   │   └── trade_signal.py      # Buy/sell/hold
│   ├── sentiment/
│   └── trading/
├── api/
│   ├── routes/
│   │   └── dashboard.py    # /api/trades, /api/sentiment, /api/alerts, /api/live/*
│   └── websocket/
├── utils/
├── data/                   # SQLite DB, streams, historical
├── logs/
├── tests/
├── docs/                   # Project proposal, architecture details
├── main.py                 # Flask + SocketIO entry
├── requirements.txt
├── .env.example
├── ARCHITECTURE.md
└── IMPLEMENTATION_PLAN.md
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Redis server
- API keys: Alpaca (paper), LunarCrush; optional: Twitter, Reddit, Groq, Anthropic

### Installation

```bash
git clone https://github.com/SakxamShrestha/sentiment-driven-options-trading-system.git
cd Stock-Tracker-by-Sakxam

python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys (see "Connecting Alpaca" below)
```

### Connecting Alpaca (news + paper trading)

1. **Sign up for paper trading** at [alpaca.markets](https://alpaca.markets/) and create an account.
2. **Get API keys**: In the Alpaca dashboard, open "Paper Trading" → "API Keys" and create a key pair.
3. **Put keys in `.env`** (create from `.env.example` if needed):
   ```bash
   ALPACA_API_KEY=your_key_here
   ALPACA_SECRET_KEY=your_secret_here
   ```
4. **News stream**: The app uses Alpaca’s **sandbox** news WebSocket by default (`ALPACA_STREAM_NEWS_URL` in `.env`). No change needed unless you switch to live.
5. **Verify**: Run `python main.py`. You should see `Alpaca news stream started`. When news arrives, the pipeline will process it and you’ll see logs and data in SQLite/Redis.

### Run

```bash
redis-server   # In a separate terminal
python main.py
```

- Dashboard: `http://localhost:5001` (default; set `FLASK_PORT` in `.env` if 5001 is in use).
- Dashboard endpoints: `GET /api/trades`, `/api/sentiment`, `/api/alerts`, `/api/live/sentiment`, `/api/live/buzz`, `/api/live/circuit_breaker`

---

## Configuration (.env)

| Variable | Description |
|----------|-------------|
| `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` | Alpaca paper/live keys |
| `ALPACA_STREAM_NEWS_URL` | News WebSocket (default: sandbox) |
| `LUNARCRUSH_API_KEY` | LunarCrush API key |
| `REDIS_HOST`, `REDIS_PORT` | Redis for live state |
| `DEFAULT_TICKER` | Default symbol (e.g. SPY) |
| `SENTIMENT_THRESHOLD_BULLISH` / `SENTIMENT_THRESHOLD_BEARISH` | Signal thresholds |
| `ENABLE_LIVE_TRADING` | Set `true` only after thorough testing |
| `FLASK_PORT` | Server port (default `5001`; use when 5000 is taken, e.g. by AirPlay) |

---

## Methodology and Development Plan

The project uses an **incremental, iterative approach**:

1. Core connectivity and trading logic first
2. AI refinement (FinBERT, Llama 3)
3. Dashboard development
4. Latency testing and optimization

Progress is tracked via GitHub commits and documentation updates. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the detailed 14-week timeline.

---

## Testing and Validation

- **Unit Testing** – Sentiment scoring functions, API order handlers
- **Integration Testing** – Sub-second interaction between news stream and trading engine
- **Backtesting / User Testing** – Historical data to verify trade accuracy and dashboard responsiveness

```bash
pytest
pytest --cov=. --cov-report=html
pytest tests/test_phase1.py
```

---

## Expected Deliverables

- Fully functional automated trading engine and dashboard
- Complete GitHub repository with source code and documentation
- Final written report (design, AI logic, performance results)
- Live demonstration of the bot trading in a real-time paper environment

---

## Use of AI Tools and External Resources

AI tools are used primarily for debugging and documentation assistance. All AI-generated output is reviewed and modified before submission. Open-source libraries (e.g. Lumibot, Alpaca) are cited in the report and repository.

---

## Disclaimers

- **High risk:** Automated and sentiment-based trading can lead to significant losses
- **Paper first:** Use paper trading and backtesting before any live capital
- **No guarantee:** Past or simulated performance does not guarantee future results
- **Compliance:** Ensure compliance with your jurisdiction and broker terms

---

## Repository

- **GitHub:** [SakxamShrestha/sentiment-driven-options-trading-system](https://github.com/SakxamShrestha/sentiment-driven-options-trading-system/)
