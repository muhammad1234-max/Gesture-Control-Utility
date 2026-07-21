import time
import json

class GestureState:
    IDLE = 0
    ENGAGING = 1
    PRESSED = 2
    RELEASING = 3
    COOLDOWN = 4

class GestureDetector:
    def __init__(self, name, on_thresh, off_thresh):
        self.name = name
        self.on_thresh = on_thresh
        self.off_thresh = off_thresh
        
        self.state = GestureState.IDLE
        self.state_enter_time = 0.0
        
        # Temporal Thresholds
        self.CONFIRMATION_MS = 60.0
        self.DEBOUNCE_MS = 80.0
        self.COOLDOWN_MS = 100.0
        
        # Callbacks
        self.on_press = None
        self.on_release = None
        
        # Statistics
        self.stats = {
            "attempts": 0,
            "successes": 0,
            "cancelled": 0,
            "false_starts": 0,
            "cooldown_rejections": 0,
            "recoveries": 0,
            "total_hold_time_ms": 0.0
        }
        
    def _change_state(self, new_state, t_curr):
        self.state = new_state
        self.state_enter_time = t_curr

    def update(self, distance, confidence, t_curr):
        # 1. Validate Tracking Confidence
        if confidence < 0.75:
            # Low confidence: Do not advance any states.
            # However, if we were PRESSED, we should probably trigger recovery if it stays low too long?
            # For immediate safety, we just ignore the frame and let the main loop handle complete lost hands.
            return

        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0

        if self.state == GestureState.IDLE:
            if distance < self.on_thresh:
                self._change_state(GestureState.ENGAGING, t_curr)
                self.stats["attempts"] += 1

        elif self.state == GestureState.ENGAGING:
            if distance > self.on_thresh:
                # False positive spike
                self._change_state(GestureState.IDLE, t_curr)
                self.stats["cancelled"] += 1
            elif elapsed_ms >= self.CONFIRMATION_MS:
                # Confirmed hold
                self._change_state(GestureState.PRESSED, t_curr)
                self.stats["successes"] += 1
                if self.on_press:
                    self.on_press()

        elif self.state == GestureState.PRESSED:
            if distance > self.off_thresh:
                self._change_state(GestureState.RELEASING, t_curr)

        elif self.state == GestureState.RELEASING:
            if distance < self.off_thresh:
                # Micro-release noise, go back to pressed
                self._change_state(GestureState.PRESSED, t_curr)
                self.stats["false_starts"] += 1
            elif elapsed_ms >= self.DEBOUNCE_MS:
                # Debounced release confirmed
                hold_duration_ms = (t_curr - self.state_enter_time) * 1000.0 # roughly
                self.stats["total_hold_time_ms"] += hold_duration_ms
                
                self._change_state(GestureState.COOLDOWN, t_curr)
                if self.on_release:
                    self.on_release()
                    
                # Log structured event
                print(json.dumps({
                    "event": "GESTURE",
                    "payload": {
                        "type": self.name,
                        "holdDuration_ms": hold_duration_ms,
                        "confidence": confidence
                    }
                }), flush=True)

        elif self.state == GestureState.COOLDOWN:
            if distance < self.on_thresh:
                self.stats["cooldown_rejections"] += 1
            if elapsed_ms >= self.COOLDOWN_MS:
                self._change_state(GestureState.IDLE, t_curr)

    def recover(self):
        if self.state in [GestureState.PRESSED, GestureState.RELEASING]:
            if self.on_release:
                self.on_release()
            self.stats["recoveries"] += 1
            print(json.dumps({"event": "GESTURE_RECOVERY", "payload": self.name}), flush=True)
        self.state = GestureState.IDLE
