import json
import time
import sys
import os

# Add backend/daemon to sys.path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'daemon'))

from pipeline_types import IntentType, CommandType
from gesture_engine import GestureEngine
from motion_engine import MotionEngine

class MockMouseController:
    def __init__(self):
        self.events = []
    
    def move_to(self, x, y):
        self.events.append({"action": "SET_CURSOR", "x": x, "y": y})
    
    def mouse_down(self, button):
        self.events.append({"action": "MOUSE_DOWN", "button": button})
        
    def mouse_up(self, button):
        self.events.append({"action": "MOUSE_UP", "button": button})
        
    def scroll(self, amount):
        self.events.append({"action": "SCROLL", "speed": amount})

class MockActionExecutor:
    def __init__(self, mouse):
        self.mouse = mouse
        self.is_left_down = False
        
    def execute(self, cmd):
        if cmd.type == CommandType.MOVE_CURSOR:
            self.mouse.move_to(cmd.x, cmd.y)
        elif cmd.type == CommandType.LEFT_DOWN:
            if not self.is_left_down:
                self.mouse.mouse_down("left")
                self.is_left_down = True
            self.mouse.move_to(cmd.x, cmd.y)
        elif cmd.type == CommandType.LEFT_UP:
            if self.is_left_down:
                self.mouse.mouse_up("left")
                self.is_left_down = False
            self.mouse.move_to(cmd.x, cmd.y)

class MockConfig:
    def __init__(self, state):
        self.state = state

def run_replay(filepath, playback_speed=1.0):
    with open(filepath, "r") as f:
        data = json.load(f)
        
    print(f"--- Replaying: {data['name']} at {playback_speed}x ---")
    
    # Initialize Engine
    mouse = MockMouseController()
    executor = MockActionExecutor(mouse)
    gesture_engine = GestureEngine()
    
    def get_screen_size(): return (1920, 1080)
    motion_engine = MotionEngine(get_screen_size)
    
    config_dict = data.get("config", {})
    state = {"smoothing": config_dict.get("smoothing", 0.5), "prediction": config_dict.get("prediction", 0.0)}
    config = MockConfig(state)
    
    # Metrics
    total_frames = len(data["frames"])
    latencies = []
    
    start_wall_time = time.time()
    
    for i, frame in enumerate(data["frames"]):
        t_curr = frame["timestamp"] / 1000.0
        confidence = frame["confidence"]
        
        lm = frame["landmarks"]
        index_x, index_y = lm[8]["x"], lm[8]["y"]
        thumb_x, thumb_y = lm[4]["x"], lm[4]["y"]
        mid_x, mid_y = lm[12]["x"], lm[12]["y"]
        
        # Simple distance
        dist_i = ((index_x - thumb_x)**2 + (index_y - thumb_y)**2)**0.5
        dist_m = ((mid_x - thumb_x)**2 + (mid_y - thumb_y)**2)**0.5
        hand_scale = 1.0 
        
        t_start = time.perf_counter()
        dt = 1.0 / data["camera_fps"]
        
        tracking_data = {
            "has_hand": confidence > 0.5,
            "tracking_state": "TRACKING",
            "raw_x": index_x,
            "raw_y": index_y,
            "dist_i": dist_i,
            "dist_m": dist_m,
            "hand_scale": hand_scale,
            "confidence": confidence,
            "t_curr": t_curr,
            "zoom_pose": False,
            "scroll_pose": False,
            "conf_hist": [confidence]*5,
            "env_penalty": 1.0
        }
        
        intent = gesture_engine.detect_intent(tracking_data)
        cmd = motion_engine.process(intent, config, 1.0, dt)
        executor.execute(cmd)
        
        t_end = time.perf_counter()
        latencies.append((t_end - t_start) * 1000.0)
            
    # Calculate Evaluation Score
    avg_lat = sum(latencies)/len(latencies) if latencies else 0
    p95_lat = sorted(latencies)[int(len(latencies)*0.95)] if latencies else 0
    
    score = 100.0
    if avg_lat > 10.0:
        score -= (avg_lat - 10.0) * 2 
        
    events = mouse.events
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

