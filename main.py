"""
Main entry point for the sentiment-driven options trading system.
"""

from flask import Flask
from flask_socketio import SocketIO
from config.settings import settings
import logging

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = settings.SECRET_KEY

# Initialize SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading'
)


@app.route('/')
def index():
    """Health check endpoint."""
    return {
        'status': 'running',
        'message': 'Sentiment-Driven Options Trading System',
        'version': '1.0.0'
    }


@app.route('/api/status')
def status():
    """System status endpoint."""
    return {
        'status': 'operational',
        'trading_enabled': settings.ENABLE_LIVE_TRADING,
        'default_ticker': settings.DEFAULT_TICKER,
        'target_latency_ms': settings.TARGET_LATENCY_MS
    }


@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    logger.info('Client connected')
    socketio.emit('system_status', {'status': 'connected'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    logger.info('Client disconnected')


if __name__ == '__main__':
    logger.info('Starting Sentiment-Driven Options Trading System...')
    logger.info(f'Environment: {settings.FLASK_ENV}')
    logger.info(f'Debug Mode: {settings.FLASK_DEBUG}')
    logger.info(f'Default Ticker: {settings.DEFAULT_TICKER}')
    logger.info(f'Live Trading: {settings.ENABLE_LIVE_TRADING}')
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=settings.FLASK_DEBUG,
        allow_unsafe_werkzeug=True
    )
