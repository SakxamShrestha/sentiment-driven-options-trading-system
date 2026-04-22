# TradeSent.AI

**AI-Powered Paper Trading Simulator with Real-Time Sentiment Analysis**

TradeSent.AI lets you paper trade stocks with $100,000 virtual USD while an AI sentiment engine scores live financial news and social media to generate buy/sell signals. Built for CSCI 411/412 Senior Seminar.

---

## Features

| Page | What you get |
|------|-------------|
| **Home** | Portfolio equity chart, balances, top positions |
| **Stock Detail** | Live candlestick chart, order form, real-time price |
| **Positions / Orders** | Open positions, order history, cancel orders |
| **Activities** | Fill history + realized P&L (FIFO) |
| **Sentiment** | AI composite scorer, circuit breaker, LunarCrush social buzz |
| **Backtest** | Momentum strategy simulator over 1W–1Y history |
| **Learn** | In-app guide explaining every feature |
| **Notifications** | Live alerts for sentiment events and trade signals |
| **Profile** | Theme toggle (light/dark), sign out |

---

## Setup

### What you need before starting

- Python 3.10+
- Node.js 18+ and npm
- Redis — `brew install redis` (macOS) or `sudo apt install redis-server` (Linux)
- [Alpaca](https://alpaca.markets/) account — grab your **Paper Trading** API key and secret
- [Anthropic](https://console.anthropic.com/) API key — powers the sentiment engine (Claude Haiku)
- [Firebase](https://console.firebase.google.com/) project — enable **Authentication** with Google and Email/Password providers
- (Optional) [Groq](https://console.groq.com/), [LunarCrush](https://lunarcrush.com/), [NewsAPI](https://newsapi.org/) keys

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/SakxamShrestha/sentiment-driven-options-trading-system.git
cd sentiment-driven-options-trading-system
```

---

### Step 2 — Set up the backend

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy the environment template:

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

```
# Alpaca (required) — paper-api.alpaca.markets → Your API Keys
ALPACA_API_KEY=your_key_id
ALPACA_SECRET_KEY=your_secret_key
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# AI Sentiment (at least one required)
ANTHROPIC_API_KEY=your_claude_key       # primary scorer
GROQ_API_KEY=your_groq_key             # fallback if Claude is unavailable

# Social sentiment (optional but recommended)
LUNARCRUSH_API_KEY=your_lc_key

# Extra news source (optional)
NEWSAPI_API_KEY=your_newsapi_key

# Leave these as-is unless you changed Redis defaults
REDIS_HOST=localhost
REDIS_PORT=6379
FLASK_PORT=5001
```

---

### Step 3 — Set up the frontend

```bash
cd frontend
npm install
```

Create a file called `.env` inside the `frontend/` folder and paste in your Firebase project credentials (found in Firebase Console → Project Settings → Your Apps):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

---

### Step 4 — Run the app

You'll need three terminal windows:

**Terminal 1 — Redis**
```bash
redis-server
```

**Terminal 2 — Flask backend**
```bash
source venv/bin/activate        # Windows: venv\Scripts\activate
python main.py
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser and sign in with Google or email/password.

---

## Production build

To serve everything from a single Flask process on port 5001:

```bash
cd frontend
npm run build       # outputs to ../static/dist/
cd ..
python main.py      # visit http://localhost:5001
```

---

## Running tests

```bash
pytest
pytest tests/test_sentiment.py
```

---

## Disclaimers

- Paper trading only by default — no real money is involved.
- Past or simulated performance does not guarantee future results.

---

## Repository

**GitHub:** [SakxamShrestha/sentiment-driven-options-trading-system](https://github.com/SakxamShrestha/sentiment-driven-options-trading-system/)
