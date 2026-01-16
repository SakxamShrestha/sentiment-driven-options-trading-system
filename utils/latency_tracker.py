"""
Latency tracking utilities for performance monitoring.
"""

import time
from contextlib import contextmanager
from typing import Optional
from utils.metrics import metrics
from utils.logger import setup_logger

logger = setup_logger(__name__)


@contextmanager
def track_latency(operation: str, log_threshold_ms: Optional[float] = None):
    """
    Context manager to track operation latency.
    
    Usage:
        with track_latency('sentiment_analysis'):
            # Your code here
            result = analyze_sentiment(text)
    
    Args:
        operation: Name of the operation being tracked
        log_threshold_ms: Log warning if latency exceeds this (milliseconds)
    """
    start_time = time.perf_counter()
    
    try:
        yield
    finally:
        end_time = time.perf_counter()
        latency_ms = (end_time - start_time) * 1000
        
        # Record the metric
        metrics.record_latency(operation, latency_ms)
        
        # Log if threshold exceeded
        if log_threshold_ms and latency_ms > log_threshold_ms:
            logger.warning(
                f"High latency detected: {operation} took {latency_ms:.2f}ms "
                f"(threshold: {log_threshold_ms}ms)"
            )
        elif log_threshold_ms is None:
            # Default: log if exceeds target latency
            from config.settings import settings
            if latency_ms > settings.TARGET_LATENCY_MS:
                logger.warning(
                    f"Latency exceeds target: {operation} took {latency_ms:.2f}ms "
                    f"(target: {settings.TARGET_LATENCY_MS}ms)"
                )


def measure_latency(func):
    """
    Decorator to measure function execution latency.
    
    Usage:
        @measure_latency
        def my_function():
            # Your code here
            pass
    """
    def wrapper(*args, **kwargs):
        operation = f"{func.__module__}.{func.__name__}"
        with track_latency(operation):
            return func(*args, **kwargs)
    return wrapper


class LatencyTracker:
    """
    Class for tracking multiple operations with start/stop methods.
    
    Usage:
        tracker = LatencyTracker('pipeline')
        tracker.start('step1')
        # ... do work ...
        tracker.stop('step1')
        total = tracker.get_total_latency()
    """
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_times: dict = {}
        self.latencies: dict = {}
        self.overall_start = time.perf_counter()
    
    def start(self, step: str):
        """Start timing a step."""
        self.start_times[step] = time.perf_counter()
    
    def stop(self, step: str) -> float:
        """
        Stop timing a step and return latency in milliseconds.
        
        Args:
            step: Name of the step
            
        Returns:
            Latency in milliseconds
        """
        if step not in self.start_times:
            logger.warning(f"Step '{step}' was not started")
            return 0.0
        
        end_time = time.perf_counter()
        latency_ms = (end_time - self.start_times[step]) * 1000
        self.latencies[step] = latency_ms
        
        # Record individual step
        metrics.record_latency(f"{self.operation_name}.{step}", latency_ms)
        
        return latency_ms
    
    def get_total_latency(self) -> float:
        """Get total latency from overall start in milliseconds."""
        return (time.perf_counter() - self.overall_start) * 1000
    
    def get_summary(self) -> dict:
        """
        Get summary of all tracked steps.
        
        Returns:
            Dictionary with step latencies and total
        """
        return {
            'steps': dict(self.latencies),
            'total_ms': self.get_total_latency(),
            'step_count': len(self.latencies)
        }