"""
TradeSent.AI - Main entry point.
Real-time sentiment-driven analysis for automated (paper) trading.
"""

import os
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")  # Keras 3 → tf-keras compat for transformers because Apple silicon issue it cannot use any other Keras version

from flask import Flask, send_from_directory
from flask_socketio import SocketIO
from config.settings import settings
from utils.logger import setup_logger
from api.routes.dashboard import dashboard_bp
from api.routes.trading import trading_bp
from api.limiter import limiter
from services.pipeline import NewsPipeline
from services.data_ingestion import AlpacaNewsStreamService

# Configure logging
logger = setup_logger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder="static")
app.config["SECRET_KEY"] = settings.SECRET_KEY

# Rate limiter — backs off to in-memory if Redis is unavailable
limiter.init_app(app)
app.config["RATELIMIT_DEFAULT"] = ["200 per hour", "30 per minute"]
app.config["RATELIMIT_STORAGE_URI"] = (
    settings.REDIS_URL
    or (f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}" if settings.REDIS_HOST else "memory://")
)

app.register_blueprint(dashboard_bp)
app.register_blueprint(trading_bp)

# Initialize SocketIO for real-time dashboard updates
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
)


@app.route("/")
def index():
    """Serve the React SPA."""
    return send_from_directory(os.path.join(app.static_folder, "dist"), "index.html")


@app.route("/assets/<path:filename>")
def assets(filename):
    """Serve Vite-built assets."""
    return send_from_directory(os.path.join(app.static_folder, "dist", "assets"), filename)


# Catch-all for React Router client-side routes
@app.route("/<path:path>")
def catch_all(path):
    """Serve index.html for client-side routing (React Router)."""
    if path.startswith("api/") or path.startswith("static/") or path.startswith("socket.io"):
        from flask import abort
        abort(404)
    return send_from_directory(os.path.join(app.static_folder, "dist"), "index.html")


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
    pipeline = NewsPipeline(socketio=socketio)

    news_stream = AlpacaNewsStreamService(on_news=pipeline.process)
    started = news_stream.start()
    if started:
        logger.info("Alpaca news stream started")
    else:
        logger.warning(
            "Alpaca news stream not started "
            "(check API keys and websocket-client installation)"
        )

    port = settings.FLASK_PORT
    logger.info("Dashboard: http://0.0.0.0:%s", port)
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=settings.FLASK_DEBUG,
        allow_unsafe_werkzeug=settings.FLASK_DEBUG,
    )
