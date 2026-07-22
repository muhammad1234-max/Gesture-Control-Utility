# performance_monitor.py
from collections import deque
import statistics

class PerformanceMonitor:
    def __init__(self):
        self.pipeline_latencies = deque(maxlen=100)
        self.fps_history = deque(maxlen=10)
        self.dropped_frames = 0
        self.rejected_frames = 0
        self.camera_reconnect_count = 0
        
        self.tracking_uptime_sec = 0.0
        self.gesture_latencies = deque(maxlen=50)
        
    def add_latency(self, latency_ms):
        self.pipeline_latencies.append(latency_ms)
        
    def add_fps(self, fps):
        self.fps_history.append(fps)
        
    def add_gesture_latency(self, latency_ms):
        self.gesture_latencies.append(latency_ms)
        
    def record_drop(self):
        self.dropped_frames += 1
        
    def record_rejection(self):
        self.rejected_frames += 1
        
    def record_reconnect(self):
        self.camera_reconnect_count += 1
        
    def update_uptime(self, dt):
        self.tracking_uptime_sec += dt
        
    def get_stats(self):
        latencies = list(self.pipeline_latencies)
        g_latencies = list(self.gesture_latencies)
        
        avg_lat = sum(latencies)/len(latencies) if latencies else 0
        max_lat = max(latencies) if latencies else 0
        p95_lat = statistics.quantiles(latencies, n=100)[94] if len(latencies) > 1 else avg_lat
        
        avg_g_lat = sum(g_latencies)/len(g_latencies) if g_latencies else 0
        
        return {
            "avg_pipeline_latency_ms": round(avg_lat, 2),
            "p95_pipeline_latency_ms": round(p95_lat, 2),
            "max_pipeline_latency_ms": round(max_lat, 2),
            "avg_gesture_latency_ms": round(avg_g_lat, 2),
            "dropped_frames": self.dropped_frames,
            "rejected_frames": self.rejected_frames,
            "camera_reconnect_count": self.camera_reconnect_count,
            "tracking_uptime_sec": round(self.tracking_uptime_sec, 1)
        }
