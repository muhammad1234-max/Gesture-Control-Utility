import json
import time
import sys
import os

# Add backend/daemon to sys.path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'daemon'))

from interaction_manager import PriorityManager
from modules.cursor_module import CursorModule
from modules.click_module import ClickModule
from modules.continuous_module import ContinuousModule

class MockInputInjector:
    def __init__(self):
        self.events = []
        
    def execute_event(self, event):
        self.events.append(event)
        
    def set_cursor_pos(self, x, y):
        self.events.append({"action": "SET_CURSOR", "x": x, "y": y})
        
    def velocity_callback(self, speed, is_zoom=False):
        if speed is not None:
            self.events.append({"action": "ZOOM" if is_zoom else "SCROLL", "speed": speed})
        
    def get_events(self):
        return self.events

def run_replay(filepath, playback_speed=1.0):
    with open(filepath, "r") as f:
        data = json.load(f)
        
    print(f"--- Replaying: {data['name']} at {playback_speed}x ---")
    
    # Initialize Engine
    injector = MockInputInjector()
    manager = PriorityManager()
    
    config = data.get("config", {})
    state = {"smoothing": config.get("smoothing", 0.5), "prediction": config.get("prediction", 0.0)}
    def get_screen_size(): return (1920, 1080)
    
    def ldown(): injector.execute_event({"action": "MOUSE_DOWN", "button": "left"})
    def lup(): injector.execute_event({"action": "MOUSE_UP", "button": "left"})
    def rdown(): injector.execute_event({"action": "MOUSE_DOWN", "button": "right"})
    def rup(): injector.execute_event({"action": "MOUSE_UP", "button": "right"})
    
    cursor_mod = CursorModule(manager, injector, state, get_screen_size) # Mock mouse as injector
    left_mod = ClickModule("LEFT_CLICK", 50, manager, ldown, lup)
    right_mod = ClickModule("RIGHT_CLICK", 50, manager, rdown, rup)
    scroll_mod = ContinuousModule("SCROLL", 70, manager, injector, is_zoom=False)
    zoom_mod = ContinuousModule("ZOOM", 80, manager, injector, is_zoom=True)
    
    manager.register_module(cursor_mod)
    manager.register_module(left_mod)
    manager.register_module(right_mod)
    manager.register_module(scroll_mod)
    manager.register_module(zoom_mod)
    
    # Apply Config
    config = data.get("config", {})
    # For now, we simulate config application manually, or pass config to modules
    
    # Metrics
    total_frames = len(data["frames"])
    cursor_jitter = []
    latencies = []
    
    start_wall_time = time.time()
    
    for i, frame in enumerate(data["frames"]):
        t_curr = frame["timestamp"] / 1000.0
        confidence = frame["confidence"]
        
        # In a real replay, if playback_speed != 0 (e.g. not ASAP), we'd sleep.
        # For CI testing, we usually want ASAP, so we ignore sleep unless requested.
        
        # Extract features (Normally MediaPipe)
        # Thumb tip = 4, Index tip = 8, Middle tip = 12
        lm = frame["landmarks"]
        index_x, index_y = lm[8]["x"], lm[8]["y"]
        thumb_x, thumb_y = lm[4]["x"], lm[4]["y"]
        mid_x, mid_y = lm[12]["x"], lm[12]["y"]
        
        # Simple distance
        dist_l = ((index_x - thumb_x)**2 + (index_y - thumb_y)**2)**0.5
        dist_r = ((mid_x - thumb_x)**2 + (mid_y - thumb_y)**2)**0.5
        hand_scale = 1.0 # Mocked
        
        # Simulated Latency Waterfall tracking
        t_start = time.perf_counter()
        dt = 1.0 / data["camera_fps"]
        
        manager.update_hand_presence(confidence > 0.5, t_curr)
        
        cursor_mod.process(index_x, index_y, dt, confidence, 0.0)
        left_mod.process(hand_scale, dist_l, 0.0, [confidence]*5, t_curr, dt, 0.0)
        right_mod.process(hand_scale, dist_r, 0.0, [confidence]*5, t_curr, dt, 0.0)
        
        conf_hist = [confidence]*5
        scroll_mod.process(hand_scale, dist_r, index_x, index_y, 0.0, conf_hist, t_curr, dt)
        zoom_mod.process(hand_scale, dist_l, index_x, index_y, 0.0, conf_hist, t_curr, dt)
        
        manager.arbitrate_and_execute(t_curr, dt)
        
        t_end = time.perf_counter()
        latencies.append((t_end - t_start) * 1000.0)
        
        # Jitter calculation (only when hand isn't meant to move)
        if "idle" in data["name"]:
            # Jitter = distance between consecutive smoothed cursor outputs
            pass
            
    # Calculate Evaluation Score
    avg_lat = sum(latencies)/len(latencies) if latencies else 0
    p95_lat = sorted(latencies)[int(len(latencies)*0.95)] if latencies else 0
    
    score = 100.0
    if avg_lat > 10.0:
        score -= (avg_lat - 10.0) * 2 # Penalty for latency > 10ms
        
    # Example assertions based on file intent
    events = injector.get_events()
    if data["name"] == "perfect_click":
        clicks = [e for e in events if e["action"] == "MOUSE_DOWN"]
        if not clicks:
            score -= 50
            print("FAILED: No click detected in perfect_click")
            
    print(f"Quality Score: {max(0.0, score):.1f} / 100")
    print(f"Avg Processing Latency: {avg_lat:.2f} ms")
    print(f"P95 Processing Latency: {p95_lat:.2f} ms")
    print(f"Total Events Emitted: {len(events)}")
    print("-" * 40)
    
if __name__ == "__main__":
    fixtures_dir = "tests/fixtures"
    for file in os.listdir(fixtures_dir):
        if file.endswith(".json"):
            run_replay(os.path.join(fixtures_dir, file))
