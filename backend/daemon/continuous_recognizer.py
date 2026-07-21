import time
import math
import json

class ContinuousState:
    IDLE = 0
    ENGAGING = 1
    ACTIVE = 2
    RELEASING = 3

class ContinuousRecognizer:
    def __init__(self, mode_name, on_thresh, off_thresh, manager, velocity_callback):
        self.mode_name = mode_name
        self.on_thresh = on_thresh
        self.off_thresh = off_thresh
        self.manager = manager
        self.velocity_callback = velocity_callback
        
        self.state = ContinuousState.IDLE
        self.state_enter_time = 0.0
        self.anchor = 0.0
        
        # Thresholds
        self.INTENT_MS = 50.0
        self.DEBOUNCE_MS = 60.0
        
        # Config
        self.sensitivity = 1.0
        self.deadzone = 0.02

    def _change_state(self, new_state, t_curr):
        self.state = new_state
        self.state_enter_time = t_curr

    def update(self, distance, current_val, confidence, t_curr):
        if confidence < 0.75:
            return

        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0

        if self.state == ContinuousState.IDLE:
            if distance < self.on_thresh:
                self._change_state(ContinuousState.ENGAGING, t_curr)

        elif self.state == ContinuousState.ENGAGING:
            if distance > self.on_thresh:
                self._change_state(ContinuousState.IDLE, t_curr)
            elif elapsed_ms >= self.INTENT_MS:
                # Ask manager if we can enter this mode
                if self.manager.request_mode(self.mode_name, self):
                    self._change_state(ContinuousState.ACTIVE, t_curr)
                    self.anchor = current_val
                else:
                    self._change_state(ContinuousState.IDLE, t_curr)

        elif self.state == ContinuousState.ACTIVE:
            if distance > self.off_thresh:
                self._change_state(ContinuousState.RELEASING, t_curr)
            else:
                # Mode Transition to Zoom
                if self.mode_name == "SCROLL" and elapsed_ms >= 600.0:
                    self.manager.release_mode("SCROLL")
                    if self.manager.request_mode("ZOOM", self):
                        self.mode_name = "ZOOM"
                        self.velocity_callback(None) # stop scroll momentum
                        
                # Continuous processing
                delta = current_val - self.anchor
                
                # Adaptive Anchor Drift (0.995 * anchor + 0.005 * current)
                self.anchor = 0.995 * self.anchor + 0.005 * current_val
                
                # Deadzone
                if abs(delta) < self.deadzone:
                    target_velocity = 0.0
                else:
                    # Non-linear velocity curve: bounded sigmoid
                    effective_delta = (delta - math.copysign(self.deadzone, delta))
                    target_velocity = math.tanh(effective_delta * self.sensitivity * 5.0) * 100.0 * self.sensitivity
                
                self.velocity_callback(target_velocity, is_zoom=(self.mode_name == "ZOOM"))

        elif self.state == ContinuousState.RELEASING:
            if distance < self.off_thresh:
                # Micro-release, go back to active
                self._change_state(ContinuousState.ACTIVE, t_curr)
            elif elapsed_ms >= self.DEBOUNCE_MS:
                self.manager.release_mode(self.mode_name)
                self._change_state(ContinuousState.IDLE, t_curr)
                # Signal momentum decay start
                self.velocity_callback(None, is_zoom=(self.mode_name == "ZOOM"))
                # Reset mode name back to SCROLL for next time
                if self.mode_name == "ZOOM":
                    self.mode_name = "SCROLL"

    def recover(self):
        self.state = ContinuousState.IDLE
        self.velocity_callback(0.0, is_zoom=(self.mode_name == "ZOOM")) # hard stop
        self.manager.release_mode(self.mode_name)
        if self.mode_name == "ZOOM":
            self.mode_name = "SCROLL"
