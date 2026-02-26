"""
TradeSent.AI - Main entry point.
Real-time sentiment-driven analysis for automated (paper) trading.
"""

from flask import Flask
from flask_socketio import SocketIO

from config.settings import settings
from utils.logger import setup_logger
from api.routes.dashboard import dashboard_bp
from services.pipeline import NewsPipeline
from services.data_ingestion import AlpacaNewsStreamService

# Configure logging
logger = setup_logger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = settings.SECRET_KEY
app.register_blueprint(dashboard_bp)

# Initialize SocketIO for real-time dashboard updates
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
)


@app.route("/")
def index():
    """Health check endpoint."""
    return {
        "status": "running",
        "message": "TradeSent.AI: Real-Time Sentiment-Driven Analysis for Automated Trading",
        "version": "1.0.0",
    }


@app.route("/api/status")
def status():
    """System status endpoint."""
    return {
        "status": "operational",
        "trading_enabled": settings.ENABLE_LIVE_TRADING,
        "default_ticker": settings.DEFAULT_TICKER,
        "target_latency_ms": settings.TARGET_LATENCY_MS,
    }


@socketio.on("connect")
def handle_connect():
    """Handle WebSocket connection for dashboard."""
    logger.info("Client connected")
    socketio.emit("system_status", {"status": "connected"})


@socketio.on("disconnect")
def handle_disconnect():
    """Handle WebSocket disconnection."""
    logger.info("Client disconnected")


if __name__ == "__main__":
    logger.info("Starting TradeSent.AI...")
    logger.info(f'Environment: {settings.FLASK_ENV}')
    logger.info(f'Debug Mode: {settings.FLASK_DEBUG}')
    logger.info(f'Default Ticker: {settings.DEFAULT_TICKER}')
    logger.info(f'Live Trading: {settings.ENABLE_LIVE_TRADING}')

    # Setting up the news ingestion pipeline (Alpaca → sentiment → signal → persistence)
    pipeline = NewsPipeline()

    news_stream = AlpacaNewsStreamService(on_news=pipeline.process)
    started = news_stream.start()
    if started:
        logger.info("Alpaca news stream started")
    else:
        logger.warning(
            "Alpaca news stream not started "
            "(check API keys and websocket-client installation)"
        )

    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=settings.FLASK_DEBUG,
        allow_unsafe_werkzeug=True
    )
