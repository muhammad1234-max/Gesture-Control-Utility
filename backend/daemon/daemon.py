import sys
import cv2
import mediapipe as mp
import threading
import os
import time
import ctypes
import json
import math
import psutil

from mouse_controller import MouseController
from interaction_manager import PriorityManager
from input_injector import InputInjector

from modules.cursor_module import CursorModule
from modules.click_module import ClickModule
from modules.continuous_module import ContinuousModule

def get_screen_size():
    return ctypes.windll.user32.GetSystemMetrics(0), ctypes.windll.user32.GetSystemMetrics(1)

def dist(lm1, lm2):
    return math.sqrt((lm1.x - lm2.x)**2 + (lm1.y - lm2.y)**2)

class CameraStream:
    def __init__(self):
        self.cap = None
        
    def open(self, index):
        if self.cap is not None:
            self.cap.release()
        self.cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        return self.cap.isOpened()
        
    def read(self):
        if self.cap is None: return False, None
        success, frame = self.cap.read()
        if success:
            return True, cv2.cvtColor(cv2.flip(frame, 1), cv2.COLOR_BGR2RGB)
        return False, None
        
    def close(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

def main():
    stream = CameraStream()
    mp_hands = mp.solutions.hands
    hands = None
    
    state = {
        "running": True,
        "tracking": False,
        "sensitivity": 0.5,
        "smoothing": 0.5,
        "pinch_threshold": 0.05,
        "camera_id": 0,
        "calibration": {},
        "calibration_mode": False,
        "hand_detected": False,
        "recording": False,
        "recorded_frames": [],
        "replaying": False,
        "replay_frames": [],
        "replay_idx": 0
    }
    
    def listen_for_commands():
        while state["running"]:
            line = sys.stdin.readline()
            if not line:
                state["running"] = False
                break
                
            if "SHUTDOWN" in line:
                state["running"] = False
                break
                
            try:
                cmd = json.loads(line)
                action = cmd.get("action")
                
                print(json.dumps({"event": "INFO", "message": f"Executing: {action}"}), flush=True)
                
                if action == "CONFIG":
                    payload = cmd.get("payload", {})
                    if "sensitivity" in payload: state["sensitivity"] = payload["sensitivity"]
                    if "smoothing" in payload: state["smoothing"] = payload["smoothing"]
                    if "pinch_threshold" in payload: state["pinch_threshold"] = payload["pinch_threshold"]
                    if "camera_id" in payload: state["camera_id"] = payload["camera_id"]
                    if "calibration" in payload: state["calibration"] = payload["calibration"]
                    print(json.dumps({"event": "CONFIG_APPLIED"}), flush=True)
                    
                elif action == "CALIBRATION_MODE":
                    is_calibration = cmd.get("payload", False)
                    state["calibration_mode"] = is_calibration
                    print(json.dumps({"event": "CALIBRATION_MODE_ENABLED" if is_calibration else "CALIBRATION_MODE_DISABLED"}), flush=True)
                    
                elif action == "OPEN_CAMERA":
                    if not stream.open(state["camera_id"]):
                        print(json.dumps({"event": "ERROR", "payload": "Failed to open camera"}), flush=True)
                    else:
                        print(json.dumps({"event": "CAMERA_OPENED"}), flush=True)
                        
                elif action == "CLOSE_CAMERA":
                    stream.close()
                    print(json.dumps({"event": "CAMERA_CLOSED"}), flush=True)
                    
                elif action == "START_TRACKING":
                    state["tracking"] = True
                    print(json.dumps({"event": "TRACKING_STARTED"}), flush=True)
                    
                elif action == "STOP_TRACKING":
                    state["tracking"] = False
                    print(json.dumps({"event": "TRACKING_STOPPED"}), flush=True)
                    
                elif action == "GET_STATUS":
                    print(json.dumps({
                        "event": "ENGINE_STATUS",
                        "payload": {
                            "pid": os.getpid(),
                            "camera_open": stream.cap is not None,
                            "tracking": state["tracking"]
                        }
                    }), flush=True)

                elif action == "START_RECORDING":
                    state["recording"] = True
                    state["recorded_frames"] = []
                    print(json.dumps({"event": "RECORDING_STARTED"}), flush=True)

                elif action == "STOP_RECORDING":
                    state["recording"] = False
                    path = cmd.get("payload", "replay.json")
                    with open(path, "w") as f:
                        json.dump(state["recorded_frames"], f)
                    print(json.dumps({"event": "RECORDING_SAVED", "payload": path}), flush=True)

                elif action == "START_REPLAY":
                    path = cmd.get("payload", "replay.json")
                    if os.path.exists(path):
                        with open(path, "r") as f:
                            state["replay_frames"] = json.load(f)
                        state["replay_idx"] = 0
                        state["replaying"] = True
                        state["tracking"] = True
                        print(json.dumps({"event": "REPLAY_STARTED"}), flush=True)
                    else:
                        print(json.dumps({"event": "ERROR", "payload": "Replay file not found"}), flush=True)

            except Exception as e:
                pass

    t = threading.Thread(target=listen_for_commands, daemon=True)
    t.start()
    
    print("SUCCESS", flush=True)
    
    fps_start_time = time.time()
    fps_frames = 0
    fps = 0
    
    # Phase 3.5 Setup
    mouse = MouseController()
    injector = InputInjector(mouse)
    manager = PriorityManager()
    
    cursor_mod = CursorModule(manager, mouse, state, get_screen_size)
    left_mod = ClickModule("LEFT_CLICK", 50, manager, mouse.left_down, mouse.left_up)
    right_mod = ClickModule("RIGHT_CLICK", 50, manager, mouse.right_down, mouse.right_up)
    scroll_mod = ContinuousModule("SCROLL", 70, manager, injector, is_zoom=False)
    zoom_mod = ContinuousModule("ZOOM", 80, manager, injector, is_zoom=True)
    
    manager.register_module(cursor_mod)
    manager.register_module(left_mod)
    manager.register_module(right_mod)
    manager.register_module(scroll_mod)
    manager.register_module(zoom_mod)

    conf_hist = []
    
    try:
        last_t = time.perf_counter()
        
        while state["running"]:
            t_start = time.perf_counter()
            t_curr = t_start
            dt = t_curr - last_t
            if dt <= 0: dt = 0.001
            last_t = t_curr
            
            if not state["tracking"]:
                if hands is not None:
                    hands.close()
                    hands = None
                time.sleep(0.05)
                continue
                
            has_hand = False
            index_x, index_y = 0, 0
            dist_i, dist_m, dist_r = 0, 0, 0
            closing_i, closing_m, closing_r = 0, 0, 0
            hand_scale = 0.1
            landmarks = []
            confidence = 0.0
            
            t_inference_start = time.perf_counter()
            
            if state["replaying"]:
                if state["replay_idx"] < len(state["replay_frames"]):
                    frame_data = state["replay_frames"][state["replay_idx"]]
                    state["replay_idx"] += 1
                    index_x = frame_data["x"]
                    index_y = frame_data["y"]
                    dist_i = frame_data["dist_l"]
                    dist_m = frame_data["dist_r"]
                    dist_r = frame_data["dist_s"]
                    landmarks = frame_data.get("landmarks", [])
                    confidence = 1.0
                    has_hand = True
                    time.sleep(1/30.0)
                else:
                    state["replaying"] = False
                    print(json.dumps({"event": "REPLAY_STOPPED"}), flush=True)
                    manager.emergency_recover()
                    continue
            else:
                if hands is None:
                    hands = mp_hands.Hands(
                        static_image_mode=False,
                        max_num_hands=1,
                        model_complexity=0,
                        min_detection_confidence=0.7,
                        min_tracking_confidence=0.7
                    )
                
                success, rgb = stream.read()
                t_cam = time.perf_counter()
                
                if not success or rgb is None:
                    time.sleep(0.01)
                    continue
                
                fps_frames += 1
                if time.time() - fps_start_time >= 1.0:
                    fps = fps_frames
                    fps_frames = 0
                    fps_start_time = time.time()
                
                results = hands.process(rgb)
            
                if results.multi_hand_landmarks:
                    has_hand = True
                    # Pseudo-confidence for python implementation
                    confidence = 0.9 
                    
                    hand = results.multi_hand_landmarks[0].landmark
                    wrist = hand[mp_hands.HandLandmark.WRIST]
                    mcp = hand[mp_hands.HandLandmark.MIDDLE_FINGER_MCP]
                    
                    thumb = hand[mp_hands.HandLandmark.THUMB_TIP]
                    index = hand[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                    middle = hand[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
                    ring = hand[mp_hands.HandLandmark.RING_FINGER_TIP]
                    
                    hand_scale = dist(wrist, mcp)
                
                    dist_i = dist(index, thumb)
                    dist_m = dist(middle, thumb)
                    dist_r = dist(ring, thumb)
                    
                    index_x = index.x
                    index_y = index.y
                    landmarks = [{"x": lm.x, "y": lm.y} for lm in hand]
                    
                    if state["recording"]:
                        state["recorded_frames"].append({
                            "x": index_x,
                            "y": index_y,
                            "dist_l": dist_i,
                            "dist_r": dist_m,
                            "dist_s": dist_r,
                            "landmarks": landmarks
                        })

            t_inference_end = time.perf_counter()

            if has_hand:
                conf_hist.append(confidence)
                if len(conf_hist) > 5:
                    conf_hist.pop(0)
            else:
                conf_hist = []
                
            manager.update_hand_presence(has_hand, t_curr)

            t_filter_start = time.perf_counter()
            if has_hand:
                if not state.get("hand_detected", False):
                    state["hand_detected"] = True
                    print(json.dumps({"event": "HAND_DETECTED", "payload": True}), flush=True)
                
                if state.get("calibration_mode", False):
                    continue
                
                # We need closing velocity for Intent-Based recognition
                # Not fully tracking previous distances here, simplified closing_vel = 0 for now.
                
                cursor_mod.process(index_x, index_y, dt, confidence)
                left_mod.process(hand_scale, dist_i, 0.0, conf_hist, t_curr, dt)
                right_mod.process(hand_scale, dist_m, 0.0, conf_hist, t_curr, dt)
                
                # Check 600ms hold for zoom transition
                if scroll_mod.is_active and (t_curr - scroll_mod.state_enter_time) >= 0.6:
                    scroll_mod.is_active = False
                    zoom_mod.is_active = True
                    zoom_mod.state_enter_time = t_curr
                    zoom_mod.anchor = dist_r
                    injector.velocity_callback(None, is_zoom=False) # kill scroll
                
                scroll_mod.process(hand_scale, dist_r, index_x, index_y, 0.0, conf_hist, t_curr, dt)
                zoom_mod.process(hand_scale, dist_r, index_x, index_y, 0.0, conf_hist, t_curr, dt)
                
                # Manager arbitrates and executes winner
                manager.arbitrate_and_execute(t_curr, dt)

            else:
                if state.get("hand_detected", False):
                    state["hand_detected"] = False
                    print(json.dumps({"event": "HAND_DETECTED", "payload": False}), flush=True)

            t_end = time.perf_counter()
            
            if has_hand:
                try:
                    cpu = psutil.cpu_percent(interval=None)
                    ram = psutil.Process().memory_info().rss / 1024 / 1024
                except:
                    cpu, ram = 0, 0
                    
                active_name = manager.active_module.name if manager.active_module else "NONE"
                
                print(json.dumps({
                    "event": "TELEMETRY",
                    "payload": {
                        "x": index_x,
                        "y": index_y,
                        "dist_l": dist_i,
                        "dist_r": dist_m,
                        "dist_s": dist_r,
                        "fps": fps,
                        "landmarks": landmarks,
                        "metrics": {
                            "t_inference_ms": (t_inference_end - t_inference_start) * 1000,
                            "t_filter_ms": (t_end - t_filter_start) * 1000,
                            "total_ms": (t_end - t_start) * 1000,
                            "cpu": cpu,
                            "ram_mb": ram
                        },
                        "gesture_stats": {
                            "left": left_mod.stats,
                            "right": right_mod.stats,
                            "mode": active_name
                        }
                    }
                }), flush=True)

    finally:
        print("Cleaning up daemon resources...", flush=True)
        injector.stop()

if __name__ == "__main__":
    main()
