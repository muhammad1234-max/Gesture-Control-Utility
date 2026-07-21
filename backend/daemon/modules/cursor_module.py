import math
import time
from interaction_manager import InteractionModule

class CursorModule(InteractionModule):
    def __init__(self, manager, mouse_controller, state_ref, get_screen_size_func):
        super().__init__("CURSOR", 10, manager)
        self.mouse = mouse_controller
        self.state = state_ref
        self.get_screen_size = get_screen_size_func
        
        self.deadzone_px = 2.5
        self.min_cutoff = 0.5
        self.beta = 0.1
        self.dcutoff = 2.0
        
        self.smoothed_x = None
        self.smoothed_y = None
        self.last_x = None
        self.last_y = None
        self.dx_ema = 0.0
        self.dy_ema = 0.0
        
        # We are always active at priority 10
        self.is_active = True

    def get_alpha(self, cutoff, dt):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)
        
    def process(self, landmarks, confidence, t_curr, dt):
        # We just read the index finger
        if not landmarks: return
        
        # We need confidence history, but for cursor, let's just do blending
        # Blend cursor movement based on confidence square
        # We will do this during execute? No, we filter it here.
        # But we need screen size.
        pass # Actually we will do the heavy lifting in execute because we need state

    def update_filter(self, raw_x, raw_y, dt, confidence):
        if self.smoothed_x is None:
            self.smoothed_x, self.smoothed_y = raw_x, raw_y
            self.last_x, self.last_y = raw_x, raw_y
            return raw_x, raw_y
            
        dx = (raw_x - self.last_x) / dt
        dy = (raw_y - self.last_y) / dt
        self.last_x, self.last_y = raw_x, raw_y

        alpha_d = self.get_alpha(self.dcutoff, dt)
        self.dx_ema = alpha_d * dx + (1 - alpha_d) * self.dx_ema
        self.dy_ema = alpha_d * dy + (1 - alpha_d) * self.dy_ema
        vel = math.sqrt(self.dx_ema**2 + self.dy_ema**2)

        cutoff = self.min_cutoff + self.beta * vel
        alpha = self.get_alpha(cutoff, dt)

        user_alpha = min(max(alpha * (self.state.get("smoothing", 0.5) * 2.0), 0.01), 1.0)
        
        # Motion Confidence Blending: Scale alpha by confidence^2 to slow down under poor tracking
        blended_alpha = user_alpha * (confidence ** 2)

        target_x = blended_alpha * raw_x + (1 - blended_alpha) * self.smoothed_x
        target_y = blended_alpha * raw_y + (1 - blended_alpha) * self.smoothed_y

        dist_px = math.sqrt((target_x - self.smoothed_x)**2 + (target_y - self.smoothed_y)**2)
        if dist_px >= self.deadzone_px:
            self.smoothed_x = target_x
            self.smoothed_y = target_y
            
        return self.smoothed_x, self.smoothed_y

    def get_prediction(self, vel):
        # Adaptive prediction window
        if vel < 100:
            return 0.0
        elif vel < 500:
            return 0.008
        elif vel < 1500:
            return 0.015
        else:
            return 0.020

    def process(self, index_x, index_y, dt, confidence):
        self.current_x = index_x
        self.current_y = index_y
        self.current_dt = dt
        self.current_conf = confidence
        self.is_active = True # Always active, but low priority

    def execute(self, t_curr, dt):
        calib = self.state.get("calibration", {})
        wa = calib.get("workingArea", {"minX": 0.2, "maxX": 0.8, "minY": 0.2, "maxY": 0.8})
        
        nx = max(wa["minX"], min(self.current_x, wa["maxX"]))
        ny = max(wa["minY"], min(self.current_y, wa["maxY"]))
        
        norm_x = (nx - wa["minX"]) / (wa["maxX"] - wa["minX"])
        norm_y = (ny - wa["minY"]) / (wa["maxY"] - wa["minY"])
        
        screen_w, screen_h = self.get_screen_size()
        raw_x = norm_x * screen_w
        raw_y = norm_y * screen_h
        
        self.update_filter(raw_x, raw_y, self.current_dt, self.current_conf)
        
        vel = math.sqrt(self.dx_ema**2 + self.dy_ema**2)
        
        # Adaptive Prediction
        pred_sec = self.get_prediction(vel)
        pred_x = self.smoothed_x + (self.dx_ema * pred_sec)
        pred_y = self.smoothed_y + (self.dy_ema * pred_sec)
        
        # Clamp to screen
        pred_x = max(0, min(pred_x, screen_w - 1))
        pred_y = max(0, min(pred_y, screen_h - 1))
        
        self.mouse.set_cursor_pos(pred_x, pred_y)

    def recover(self):
        super().recover()
        self.is_active = True
