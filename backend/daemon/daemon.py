import sys
import cv2
import mediapipe as mp
import threading
import os
import time
import ctypes
import json
import math

# Win32 Mouse Constants
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_WHEEL = 0x0800
WHEEL_DELTA = 120

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

def get_screen_size():
    return ctypes.windll.user32.GetSystemMetrics(0), ctypes.windll.user32.GetSystemMetrics(1)

def set_cursor_pos(x, y):
    ctypes.windll.user32.SetCursorPos(int(x), int(y))

def mouse_click(down=True, right=False):
    if right:
        flags = MOUSEEVENTF_RIGHTDOWN if down else MOUSEEVENTF_RIGHTUP
    else:
        flags = MOUSEEVENTF_LEFTDOWN if down else MOUSEEVENTF_LEFTUP
    ctypes.windll.user32.mouse_event(flags, 0, 0, 0, 0)

def mouse_scroll(delta):
    ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, int(delta), 0)

def dist(lm1, lm2):
    return math.sqrt((lm1.x - lm2.x)**2 + (lm1.y - lm2.y)**2)

# Global State
state = {
    "running": True,
    "tracking": False,
    "sensitivity": 1.5,
    "smoothing": 0.3,
    "pinch_threshold": 0.05,
    "camera_id": 0,
    "calibration_mode": False
}

class CameraStream:
    def __init__(self):
        self.cap = None
        self.frame = None
        self.success = False
        self.lock = threading.Lock()
        self.active = False
        self.t = threading.Thread(target=self._update, daemon=True)
        self.t.start()
        
    def open(self, camera_id):
        with self.lock:
            if self.cap is not None:
                self.cap.release()
            self.cap = cv2.VideoCapture(camera_id, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap = None
                return False
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 540)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            self.active = True
            return True
            
    def close(self):
        with self.lock:
            self.active = False
            if self.cap:
                self.cap.release()
                self.cap = None
            self.frame = None
            self.success = False
            
    def _update(self):
        while state["running"]:
            cap_ref = None
            is_active = False
            with self.lock:
                cap_ref = self.cap
                is_active = self.active
                
            if is_active and cap_ref is not None:
                s, f = cap_ref.read()
                if s:
                    f = cv2.flip(f, 1)
                    rgb = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
                    with self.lock:
                        self.success = True
                        self.frame = rgb
                else:
                    time.sleep(0.01)
            else:
                time.sleep(0.01)
                
    def read(self):
        with self.lock:
            return self.success, self.frame

stream = CameraStream()

def listen_for_commands():
    print(json.dumps({"event": "ENGINE_STARTED"}), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        if "SHUTDOWN" in line:
            state["running"] = False
            break
            
        try:
            cmd = json.loads(line)
            action = cmd.get("action")
            
            # Temporary command logging for traceability
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
        except Exception as e:
            pass
            
    # When sys.stdin closes (EOF) because parent died, loop exits
    print("EOF on stdin, triggering dead-man's switch shutdown", flush=True)
    state["running"] = False

def main():
    if len(sys.argv) > 1:
        pass
    print("1. Starting command listener...", flush=True)
    t = threading.Thread(target=listen_for_commands, daemon=True)
    t.start()
    
    mp_hands = mp.solutions.hands
    hands = None
    
    print("2. Getting Screen Size...", flush=True)
    screen_w, screen_h = get_screen_size()
    
    # Tracking State
    smoothed_x, smoothed_y = None, None
    last_raw_x, last_raw_y = None, None
    last_t = None
    
    gesture_states = {
        "left": {"frames": 0, "active": False},
        "right": {"frames": 0, "active": False},
        "scroll": {"frames": 0, "active": False}
    }
    REQUIRED_FRAMES = 2
    
    scroll_anchor_y = None
    
    print("SUCCESS", flush=True)
    
    fps_start_time = time.time()
    fps_frames = 0
    fps = 0
    
    try:
        while state["running"]:
            if not state["tracking"]:
                if hands is not None:
                    hands.close()
                    hands = None
                time.sleep(0.05)
                continue
                
            if hands is None:
                hands = mp_hands.Hands(
                    static_image_mode=False,
                    max_num_hands=1,
                    model_complexity=0,
                    min_detection_confidence=0.7,
                    min_tracking_confidence=0.7
                )
            
            success, rgb = stream.read()
            if not success or rgb is None:
                time.sleep(0.01)
                continue
            
            fps_frames += 1
            if time.time() - fps_start_time >= 1.0:
                fps = fps_frames
                fps_frames = 0
                fps_start_time = time.time()
                # We could send FPS periodically, but for now we only send telemetry.
            
            results = hands.process(rgb)
        
            if results.multi_hand_landmarks:
                if not state.get("hand_detected", False):
                    state["hand_detected"] = True
                    print(json.dumps({"event": "HAND_DETECTED", "payload": True}), flush=True)
                
                hand = results.multi_hand_landmarks[0].landmark
            
                # Key points
                thumb = hand[mp_hands.HandLandmark.THUMB_TIP]
                index = hand[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                middle = hand[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
                ring = hand[mp_hands.HandLandmark.RING_FINGER_TIP]
            
                # Hysteresis
                thresh_on = state.get("pinch_threshold", 0.05)
                thresh_off = thresh_on + 0.02
            
                dist_i = dist(index, thumb)
                dist_m = dist(middle, thumb)
                dist_r = dist(ring, thumb)
            
                # Fetch personalized pinch thresholds
                calib = state.get("calibration", {})
                thresh = calib.get("pinchThresholds", {"left": 0.05, "right": 0.05, "scroll": 0.05})
            
                # Overwrite thresholds dynamically
                thresh_l_on = thresh["left"]
                thresh_l_off = thresh_l_on + 0.02
                thresh_r_on = thresh["right"]
                thresh_r_off = thresh_r_on + 0.02
                thresh_s_on = thresh["scroll"]
                thresh_s_off = thresh_s_on + 0.02
            
                # State Machine Updates
                if dist_i < thresh_l_on: gesture_states["left"]["frames"] += 1
                elif dist_i > thresh_l_off: gesture_states["left"]["frames"] = 0
            
                if dist_m < thresh_r_on: gesture_states["right"]["frames"] += 1
                elif dist_m > thresh_r_off: gesture_states["right"]["frames"] = 0
            
                if dist_r < thresh_s_on: gesture_states["scroll"]["frames"] += 1
                elif dist_r > thresh_s_off: gesture_states["scroll"]["frames"] = 0
            
                # --- SCROLL MODE ---
                if gesture_states["scroll"]["frames"] >= REQUIRED_FRAMES:
                    if not gesture_states["scroll"]["active"]:
                        gesture_states["scroll"]["active"] = True
                        scroll_anchor_y = thumb.y
                    else:
                        dy = thumb.y - scroll_anchor_y
                        if abs(dy) > 0.01:
                            mouse_scroll(-dy * 5000 * state["sensitivity"])
                            scroll_anchor_y = thumb.y
                    # Disable cursor movement while scrolling
                    continue
                
                # Always send telemetry for Dashboard visualizer
                print(json.dumps({
                    "event": "TELEMETRY",
                    "payload": {
                        "x": index.x,
                        "y": index.y,
                        "dist_l": dist_i,
                        "dist_r": dist_m,
                        "dist_s": dist_r,
                        "fps": fps,
                        "landmarks": [{"x": lm.x, "y": lm.y} for lm in hand]
                    }
                }), flush=True)
            
                if state.get("calibration_mode", False):
                    # Skip standard cursor logic if in calibration mode
                    continue
                
                # --- CURSOR MOVEMENT ---
                t_curr = time.perf_counter()
                dt = t_curr - last_t if last_t else 1/30.0
                last_t = t_curr
            
                # Get user's calibrated working area bounds
                calib = state.get("calibration", {})
                wa = calib.get("workingArea", {"minX": 0.2, "maxX": 0.8, "minY": 0.2, "maxY": 0.8})
            
                # Clamp user movement to bounds
                nx = max(wa["minX"], min(index.x, wa["maxX"]))
                ny = max(wa["minY"], min(index.y, wa["maxY"]))
            
                # Normalize to 0..1 relative to the working area
                norm_x = (nx - wa["minX"]) / (wa["maxX"] - wa["minX"])
                norm_y = (ny - wa["minY"]) / (wa["maxY"] - wa["minY"])
            
                raw_x = norm_x * screen_w
                raw_y = norm_y * screen_h
            
                if last_raw_x is not None:
                    raw_vel = math.sqrt((raw_x - last_raw_x)**2 + (raw_y - last_raw_y)**2) / dt
                else:
                    raw_vel = 0
                last_raw_x, last_raw_y = raw_x, raw_y
            
                # Adaptive Smoothing (One-Euro style)
                min_alpha = 0.05
                max_alpha = 0.8
                vel_scale = 800.0
                dynamic_alpha = min_alpha + (max_alpha - min_alpha) * min(raw_vel / vel_scale, 1.0)
            
                # Blend with user slider
                final_alpha = dynamic_alpha * (state["smoothing"] * 2.5)
                final_alpha = min(max(final_alpha, 0.01), 1.0)
            
                if smoothed_x is None:
                    smoothed_x, smoothed_y = raw_x, raw_y
                else:
                    smoothed_x = final_alpha * raw_x + (1 - final_alpha) * smoothed_x
                    smoothed_y = final_alpha * raw_y + (1 - final_alpha) * smoothed_y
                
                set_cursor_pos(smoothed_x, smoothed_y)
            
                # --- LEFT CLICK / DRAG ---
                if not gesture_states["left"]["active"] and gesture_states["left"]["frames"] >= REQUIRED_FRAMES:
                    mouse_click(down=True, right=False)
                    gesture_states["left"]["active"] = True
                elif gesture_states["left"]["active"] and gesture_states["left"]["frames"] == 0:
                    mouse_click(down=False, right=False)
                    gesture_states["left"]["active"] = False
                
                # --- RIGHT CLICK ---
                if not gesture_states["right"]["active"] and gesture_states["right"]["frames"] >= REQUIRED_FRAMES:
                    mouse_click(down=True, right=True)
                    gesture_states["right"]["active"] = True
                elif gesture_states["right"]["active"] and gesture_states["right"]["frames"] == 0:
                    mouse_click(down=False, right=True)
                    gesture_states["right"]["active"] = False
            else:
                if state.get("hand_detected", False):
                    state["hand_detected"] = False
                    print(json.dumps({"event": "HAND_DETECTED", "payload": False}), flush=True)
                
    finally:
        print("Cleaning up daemon resources...", flush=True)
        if hands is not None:
            hands.close()
        stream.close()
        cv2.destroyAllWindows()
        sys.exit(0)

if __name__ == "__main__":
    main()
