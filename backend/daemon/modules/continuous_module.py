import math
from interaction_manager import InteractionModule

class ContinuousModule(InteractionModule):
    def __init__(self, name, priority, manager, injector, is_zoom=False):
        super().__init__(name, priority, manager)
        self.injector = injector
        self.is_zoom = is_zoom
        
        self.INTENT_MS = 50.0
        self.GRACE_MS = 200.0
        
        self.anchor = 0.0
        self.state_enter_time = 0.0
        
        self.last_seen_valid_time = 0.0
        
        self.sensitivity = 1.0
        self.deadzone = 0.02
        
        self.last_velocity = 0.0
        self.accel_cap = 1500.0 # units per second

        self.locked_axis = None
        self.start_x = 0.0
        self.start_y = 0.0
        
    def _change_state(self, active, t_curr):
        self.is_active = active
        self.state_enter_time = t_curr
        
    def process(self, hand_scale, distance, current_x, current_y, closing_vel, confidence_history, t_curr, dt):
        avg_conf = sum(confidence_history) / len(confidence_history) if confidence_history else 0.0
        
        # Adaptive Threshold based on hand_scale
        base_on = 0.05
        base_off = 0.07
        # Suppose a nominal hand scale is 0.1 normalized units
        scale_mult = hand_scale / 0.1 if hand_scale > 0.01 else 1.0
        on_thresh = base_on * scale_mult
        off_thresh = base_off * scale_mult

        if not self.is_active:
            # Check intent: Distance < thresh AND hand is stable (closing velocity is small, we arrived at the pinch)
            if distance < on_thresh and avg_conf > 0.7:
                if self.state_enter_time == 0.0:
                    self.state_enter_time = t_curr
                elif (t_curr - self.state_enter_time) * 1000.0 >= self.INTENT_MS:
                    self.is_active = True
                    self.last_seen_valid_time = t_curr
                    self.anchor = current_y if not self.is_zoom else distance
                    self.start_x = current_x
                    self.start_y = current_y
                    self.locked_axis = None
                    self.last_velocity = 0.0
            else:
                self.state_enter_time = 0.0
        else:
            if distance < off_thresh and avg_conf > 0.6:
                self.last_seen_valid_time = t_curr
                
            elapsed_since_valid = (t_curr - self.last_seen_valid_time) * 1000.0
            if elapsed_since_valid > self.GRACE_MS:
                self.is_active = False
                self.state_enter_time = 0.0
                self.injector.velocity_callback(None, is_zoom=self.is_zoom)

            if self.is_active and not self.is_zoom and self.locked_axis is None:
                # Early Directional Lock
                dx = abs(current_x - self.start_x)
                dy = abs(current_y - self.start_y)
                if dx > 0.015 or dy > 0.015: # approx 15-20px normalized
                    self.locked_axis = 'X' if dx > dy else 'Y'

        self.current_val = distance if self.is_zoom else current_y
        self.dt = dt

    def execute(self, t_curr, dt):
        if not self.is_active: return
        
        # Adaptive anchor drift
        self.anchor = 0.995 * self.anchor + 0.005 * self.current_val
        
        delta = self.current_val - self.anchor
        
        if abs(delta) < self.deadzone:
            target_velocity = 0.0
        else:
            effective_delta = (delta - math.copysign(self.deadzone, delta))
            target_velocity = math.tanh(effective_delta * self.sensitivity * 5.0) * 100.0 * self.sensitivity
            
        # Acceleration Capping
        max_dv = self.accel_cap * dt
        if target_velocity > self.last_velocity + max_dv:
            target_velocity = self.last_velocity + max_dv
        elif target_velocity < self.last_velocity - max_dv:
            target_velocity = self.last_velocity - max_dv
            
        self.last_velocity = target_velocity
        self.injector.velocity_callback(target_velocity, is_zoom=self.is_zoom)

    def recover(self):
        super().recover()
        self.state_enter_time = 0.0
        self.last_velocity = 0.0
        self.injector.velocity_callback(None, is_zoom=self.is_zoom)
