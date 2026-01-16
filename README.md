# Sentiment-Driven Options Trading System

A fully automated sentiment-driven options trading system achieving sub-200ms news-to-trade execution using Python-Flask and Socket.IO, processing real-time streams from X (Twitter) and Reddit with FinBERT, fine-tuned Llama 70B via GroqCloud, and Anthropic Claude for multi-layer sentiment scoring, automatically executing 0DTE options trades through Alpaca API.

## 🎯 Key Features

- **Sub-200ms Execution**: Ultra-low latency from news ingestion to trade execution
- **Multi-Source Data**: Real-time streams from Twitter/X and Reddit
- **Advanced Sentiment Analysis**: Three-model ensemble (FinBERT, Llama 70B, Claude)
- **Automated Trading**: 0DTE options trading via Alpaca API
- **Real-time Dashboard**: Live updates via WebSocket
- **Backtesting**: Microsecond-precision historical analysis
- **Multi-Ticker Support**: Default SPY, extensible to other tickers

## ⚠️ Important Disclaimers

**This is a high-risk trading system. Options trading, especially 0DTE (same-day expiration) options, can result in significant financial losses. Always:**

- Start with paper trading
- Test extensively before live trading
- Implement proper risk management
- Monitor continuously
- Consult financial advisors
- Understand regulatory requirements

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Redis server
- API keys for:
  - Alpaca (paper trading account recommended)
  - Twitter/X API v2
  - Reddit API
  - Groq Cloud
  - Anthropic (Claude)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Stock-Tracker-by-Sakxam
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Start Redis server**
   ```bash
   redis-server
   ```

6. **Run the application**
   ```bash
   python main.py
   ```

## 📋 Implementation Plan

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed step-by-step implementation guide.

## 🏗️ Project Structure

```
stock-tracker/
├── config/              # Configuration management
├── data/                # Data storage
│   ├── streams/        # Real-time data
│   └── historical/     # Backtesting data
├── models/             # ML models and sentiment analysis
│   ├── sentiment/
│   └── trading/
├── services/           # Core business logic
│   ├── data_ingestion/
│   ├── sentiment/
│   ├── trading/
│   └── backtesting/
├── api/                # API routes and WebSocket
│   ├── routes/
│   └── websocket/
├── utils/              # Utility functions
├── tests/              # Test suite
├── requirements.txt    # Python dependencies
└── main.py            # Application entry point
```

## 🔧 Configuration

Key configuration options in `.env`:

- `DEFAULT_TICKER`: Default ticker symbol (default: SPY)
- `OPTIONS_EXPIRATION_TYPE`: Options expiration (default: 0DTE)
- `TARGET_LATENCY_MS`: Target latency in milliseconds (default: 200)
- `ENABLE_LIVE_TRADING`: Enable live trading (default: false)
- `MAX_POSITION_SIZE`: Maximum position size per trade
- `SENTIMENT_THRESHOLD_BULLISH/BEARISH`: Sentiment thresholds

## 📊 Performance Targets

- **Data Ingestion**: <20ms
- **Sentiment Analysis**: <100ms (parallel models)
- **Decision Making**: <30ms
- **Trade Execution**: <50ms
- **Total Pipeline**: <200ms

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_sentiment.py
```

## 📈 Monitoring

The system provides real-time monitoring via:
- WebSocket events for live updates
- REST API endpoints for status checks
- Performance metrics dashboard
- Latency tracking

## 🔐 Security

- Never commit `.env` file with real API keys
- Use environment variables for sensitive data
- Implement proper authentication for API endpoints
- Use paper trading accounts for development

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines]

## 📞 Support

[Add support contact information]

---

**Remember**: Trading involves risk. Always test thoroughly and trade responsibly.
