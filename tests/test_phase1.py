"""
Comprehensive test suite for Phase 1: Project Setup & Infrastructure
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import settings
from utils.logger import setup_logger
from utils.metrics import metrics, MetricsCollector
from utils.latency_tracker import track_latency, measure_latency, LatencyTracker


class Phase1Tester:
    """Test suite for Phase 1 components."""
    
    def __init__(self):
        self.logger = setup_logger(__name__)
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def test(self, name: str, func):
        """Run a test and track results."""
        try:
            self.logger.info(f"Testing: {name}")
            result = func()
            if result:
                self.passed += 1
                self.tests.append((name, "PASSED", None))
                self.logger.info(f"✓ {name} - PASSED")
            else:
                self.failed += 1
                self.tests.append((name, "FAILED", "Test returned False"))
                self.logger.error(f"✗ {name} - FAILED")
        except Exception as e:
            self.failed += 1
            self.tests.append((name, "FAILED", str(e)))
            self.logger.error(f"✗ {name} - FAILED: {str(e)}")
    
    def test_configuration(self):
        """Test configuration management."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Configuration Management")
        self.logger.info("=" * 60)
        
        # Test settings loading
        self.test("Settings class exists", lambda: hasattr(settings, 'DEFAULT_TICKER'))
        self.test("Default ticker is SPY", lambda: settings.DEFAULT_TICKER == 'SPY')
        self.test("Target latency is set", lambda: settings.TARGET_LATENCY_MS == 200)
        self.test("Live trading is disabled by default", 
                 lambda: settings.ENABLE_LIVE_TRADING == False)
        self.test("Redis host is set", lambda: settings.REDIS_HOST == 'localhost')
        self.test("Log level is set", lambda: settings.LOG_LEVEL in ['DEBUG', 'INFO', 'WARNING', 'ERROR'])
        
        # Test path configurations
        self.test("Base directory exists", lambda: settings.BASE_DIR.exists())
        self.test("Data directory path configured", lambda: hasattr(settings, 'DATA_DIR'))
        self.test("Streams directory path configured", lambda: hasattr(settings, 'STREAMS_DIR'))
        self.test("Historical directory path configured", lambda: hasattr(settings, 'HISTORICAL_DIR'))
    
    def test_logging(self):
        """Test logging system."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Logging System")
        self.logger.info("=" * 60)
        
        # Test logger creation
        test_logger = setup_logger('test_module')
        self.test("Logger can be created", lambda: test_logger is not None)
        self.test("Logger has handlers", lambda: len(test_logger.handlers) > 0)
        
        # Test log levels
        try:
            test_logger.debug("Debug message")
            test_logger.info("Info message")
            test_logger.warning("Warning message")
            test_logger.error("Error message")
            self.test("All log levels work", lambda: True)
        except Exception as e:
            self.test("All log levels work", lambda: False)
        
        # Test log file creation
        from utils.logger import LOG_DIR, LOG_FILE
        self.test("Log directory exists", lambda: LOG_DIR.exists())
        self.test("Log file path is configured", lambda: LOG_FILE is not None)
    
    def test_metrics(self):
        """Test metrics collection."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Metrics Collection")
        self.logger.info("=" * 60)
        
        # Reset metrics for clean test
        metrics.reset_metrics()
        
        # Test counter
        initial_count = metrics.get_metrics().get('test_counter', 0)
        metrics.increment_counter('test_counter')
        metrics.increment_counter('test_counter', 2)
        final_count = metrics.get_metrics().get('test_counter', 0)
        self.test("Counter increment works", 
                 lambda: final_count == initial_count + 3)
        
        # Test gauge
        metrics.set_gauge('test_gauge', 42.5)
        gauge_value = metrics.get_metrics().get('test_gauge', 0)
        self.test("Gauge set works", lambda: gauge_value == 42.5)
        
        # Test latency recording
        metrics.record_latency('test_operation', 100.0)
        metrics.record_latency('test_operation', 200.0)
        stats = metrics.get_latency_stats('test_operation')
        self.test("Latency recording works", lambda: stats is not None)
        self.test("Average latency calculated", 
                 lambda: stats['avg_latency_ms'] == 150.0)
        self.test("Min latency tracked", lambda: stats['min_latency_ms'] == 100.0)
        self.test("Max latency tracked", lambda: stats['max_latency_ms'] == 200.0)
        
        # Test uptime
        uptime = metrics.get_system_uptime()
        self.test("System uptime tracked", lambda: uptime.total_seconds() >= 0)
    
    def test_latency_tracking(self):
        """Test latency tracking utilities."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Latency Tracking")
        self.logger.info("=" * 60)
        
        # Test context manager
        try:
            with track_latency('test_context_operation'):
                time.sleep(0.1)  # Simulate 100ms operation
            stats = metrics.get_latency_stats('test_context_operation')
            self.test("Context manager tracks latency", 
                     lambda: stats is not None and stats['count'] > 0)
        except Exception as e:
            self.test("Context manager tracks latency", lambda: False)
        
        # Test decorator
        @measure_latency
        def test_function():
            time.sleep(0.05)  # Simulate 50ms operation
            return "success"
        
        try:
            result = test_function()
            # Check if latency was recorded (function name will be in metrics)
            all_metrics = metrics.get_metrics()
            has_latency = any('test_function' in key for key in all_metrics.keys())
            self.test("Decorator tracks latency", lambda: result == "success" and has_latency)
        except Exception as e:
            self.test("Decorator tracks latency", lambda: False)
        
        # Test LatencyTracker class
        try:
            tracker = LatencyTracker('test_pipeline')
            tracker.start('step1')
            time.sleep(0.02)
            latency1 = tracker.stop('step1')
            
            tracker.start('step2')
            time.sleep(0.03)
            latency2 = tracker.stop('step2')
            
            total = tracker.get_total_latency()
            summary = tracker.get_summary()
            
            self.test("LatencyTracker tracks steps", 
                     lambda: latency1 > 0 and latency2 > 0)
            self.test("LatencyTracker calculates total", lambda: total > 0)
            self.test("LatencyTracker provides summary", 
                     lambda: 'steps' in summary and 'total_ms' in summary)
        except Exception as e:
            self.test("LatencyTracker class works", lambda: False)
    
    def test_flask_app(self):
        """Test Flask application setup."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Flask Application")
        self.logger.info("=" * 60)
        
        try:
            from main import app, socketio
            
            # Test app creation
            self.test("Flask app exists", lambda: app is not None)
            self.test("SocketIO exists", lambda: socketio is not None)
            
            # Test app configuration
            with app.app_context():
                self.test("App has secret key", lambda: app.config.get('SECRET_KEY') is not None)
            
            # Test routes exist
            with app.test_client() as client:
                response = client.get('/')
                self.test("Root route works", lambda: response.status_code == 200)
                
                response = client.get('/api/status')
                self.test("Status route works", lambda: response.status_code == 200)
                self.test("Status returns JSON", 
                         lambda: response.is_json)
        
        except Exception as e:
            self.logger.error(f"Flask app test error: {e}")
            self.test("Flask app setup", lambda: False)
    
    def test_project_structure(self):
        """Test project directory structure."""
        self.logger.info("=" * 60)
        self.logger.info("Testing Project Structure")
        self.logger.info("=" * 60)
        
        base_dir = settings.BASE_DIR
        
        required_dirs = [
            'config',
            'data/streams',
            'data/historical',
            'models/sentiment',
            'models/trading',
            'services/data_ingestion',
            'services/sentiment',
            'services/trading',
            'services/backtesting',
            'api/routes',
            'api/websocket',
            'utils',
            'tests'
        ]
        
        required_files = [
            'main.py',
            'requirements.txt',
            'README.md',
            'config/settings.py',
            'utils/logger.py',
            'utils/metrics.py',
            'utils/latency_tracker.py'
        ]
        
        for dir_path in required_dirs:
            full_path = base_dir / dir_path
            self.test(f"Directory exists: {dir_path}", 
                     lambda p=full_path: p.exists() and p.is_dir())
        
        for file_path in required_files:
            full_path = base_dir / file_path
            self.test(f"File exists: {file_path}", 
                     lambda p=full_path: p.exists() and p.is_file())
    
    def run_all_tests(self):
        """Run all Phase 1 tests."""
        self.logger.info("\n" + "=" * 60)
        self.logger.info("PHASE 1 TEST SUITE")
        self.logger.info("=" * 60 + "\n")
        
        # Run all test suites
        self.test_project_structure()
        self.test_configuration()
        self.test_logging()
        self.test_metrics()
        self.test_latency_tracking()
        self.test_flask_app()
        
        # Print summary
        self.logger.info("\n" + "=" * 60)
        self.logger.info("TEST SUMMARY")
        self.logger.info("=" * 60)
        self.logger.info(f"Total Tests: {self.passed + self.failed}")
        self.logger.info(f"Passed: {self.passed}")
        self.logger.info(f"Failed: {self.failed}")
        self.logger.info(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        
        if self.failed > 0:
            self.logger.warning("\nFailed Tests:")
            for name, status, error in self.tests:
                if status == "FAILED":
                    self.logger.warning(f"  - {name}: {error}")
        
        self.logger.info("=" * 60 + "\n")
        
        return self.failed == 0


if __name__ == '__main__':
    tester = Phase1Tester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ All Phase 1 tests PASSED!")
        sys.exit(0)
    else:
        print("\n❌ Some Phase 1 tests FAILED. Check logs for details.")
        sys.exit(1)