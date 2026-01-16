"""
Performance metrics collection and tracking.
"""

import time
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
from config.settings import settings

# In-memory metrics storage (can be replaced with Redis/DB later)
_metrics: Dict[str, Any] = defaultdict(dict)
_latency_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))


class MetricsCollector:
    """Collects and tracks system performance metrics."""
    
    def __init__(self, enabled: bool = None):
        self.enabled = enabled if enabled is not None else settings.METRICS_ENABLED
        self.start_time = datetime.now()
    
    def record_latency(self, operation: str, latency_ms: float):
        """
        Record latency for an operation.
        
        Args:
            operation: Name of the operation (e.g., 'sentiment_analysis', 'trade_execution')
            latency_ms: Latency in milliseconds
        """
        if not self.enabled:
            return
        
        _latency_history[operation].append({
            'timestamp': datetime.now(),
            'latency_ms': latency_ms
        })
        
        # Update statistics
        if operation not in _metrics:
            _metrics[operation] = {
                'count': 0,
                'total_latency_ms': 0,
                'min_latency_ms': float('inf'),
                'max_latency_ms': 0,
                'avg_latency_ms': 0
            }
        
        stats = _metrics[operation]
        stats['count'] += 1
        stats['total_latency_ms'] += latency_ms
        stats['min_latency_ms'] = min(stats['min_latency_ms'], latency_ms)
        stats['max_latency_ms'] = max(stats['max_latency_ms'], latency_ms)
        stats['avg_latency_ms'] = stats['total_latency_ms'] / stats['count']
    
    def increment_counter(self, metric_name: str, value: int = 1):
        """
        Increment a counter metric.
        
        Args:
            metric_name: Name of the counter
            value: Value to increment by
        """
        if not self.enabled:
            return
        
        if metric_name not in _metrics:
            _metrics[metric_name] = 0
        
        _metrics[metric_name] += value
    
    def set_gauge(self, metric_name: str, value: float):
        """
        Set a gauge metric (current value).
        
        Args:
            metric_name: Name of the gauge
            value: Current value
        """
        if not self.enabled:
            return
        
        _metrics[metric_name] = value
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        return dict(_metrics)
    
    def get_latency_stats(self, operation: str) -> Optional[Dict[str, float]]:
        """
        Get latency statistics for an operation.
        
        Args:
            operation: Name of the operation
            
        Returns:
            Dictionary with latency statistics or None if no data
        """
        if operation not in _metrics:
            return None
        
        stats = _metrics[operation].copy()
        
        # Calculate percentiles if we have history
        if operation in _latency_history and _latency_history[operation]:
            latencies = [h['latency_ms'] for h in _latency_history[operation]]
            latencies.sort()
            n = len(latencies)
            
            if n > 0:
                stats['p50_latency_ms'] = latencies[n // 2]
                stats['p95_latency_ms'] = latencies[int(n * 0.95)] if n > 1 else latencies[-1]
                stats['p99_latency_ms'] = latencies[int(n * 0.99)] if n > 1 else latencies[-1]
        
        return stats
    
    def get_system_uptime(self) -> timedelta:
        """Get system uptime."""
        return datetime.now() - self.start_time
    
    def reset_metrics(self):
        """Reset all metrics (useful for testing)."""
        _metrics.clear()
        _latency_history.clear()


# Global metrics collector instance
metrics = MetricsCollector()