import time
from interaction_manager import InteractionModule

class ClickState:
    IDLE = 0
    ENGAGING = 1
    PRESSED = 2
    RELEASING = 3
    COOLDOWN = 4

class ClickModule(InteractionModule):
    def __init__(self, name, priority, manager, on_press_cb, on_release_cb):
        super().__init__(name, priority, manager)
        self.on_press_cb = on_press_cb
        self.on_release_cb = on_release_cb
        
        self.state = ClickState.IDLE
        self.state_enter_time = 0.0
        
        # Scale-normalized Base Thresholds
        self.base_on = 0.04
        self.base_off = 0.06
        
        # Timings
        self.CONFIRM_MS = 60.0
        self.DEBOUNCE_MS = 80.0
        self.COOLDOWN_MS = 100.0
        self.GRACE_MS = 150.0
        
        self.last_seen_valid_time = 0.0
        
        self.stats = {
            "attempts": 0,
            "successes": 0,
            "cancelled": 0,
            "false_starts": 0,
            "cooldown_rejections": 0,
            "recoveries": 0
        }

    def _change_state(self, new_state, t_curr):
        self.state = new_state
        self.state_enter_time = t_curr

    def process(self, hand_scale, distance, closing_vel, confidence_history, t_curr, dt):
        avg_conf = sum(confidence_history) / len(confidence_history) if confidence_history else 0.0
        
        # Scale Mult (assume nominal hand is 0.1)
        scale_mult = hand_scale / 0.1 if hand_scale > 0.01 else 1.0
        on_thresh = self.base_on * scale_mult
        off_thresh = self.base_off * scale_mult
        
        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0
        
        # Intent Check: Distance < thresh + confidence
        intent_met = distance < on_thresh and avg_conf > 0.65
        
        if self.state == ClickState.IDLE:
            if intent_met:
                self.stats["attempts"] += 1
                self._change_state(ClickState.ENGAGING, t_curr)
                self.last_seen_valid_time = t_curr

        elif self.state == ClickState.ENGAGING:
            if not intent_met:
                if (t_curr - self.last_seen_valid_time) * 1000.0 > self.GRACE_MS:
                    self.stats["cancelled"] += 1
                    self._change_state(ClickState.IDLE, t_curr)
            else:
                self.last_seen_valid_time = t_curr
                if elapsed_ms >= self.CONFIRM_MS:
                    self._change_state(ClickState.PRESSED, t_curr)
                    self.is_active = True # Signal manager we want to run

        elif self.state == ClickState.PRESSED:
            if distance > off_thresh:
                if (t_curr - self.last_seen_valid_time) * 1000.0 > self.GRACE_MS:
                    self._change_state(ClickState.RELEASING, t_curr)
            else:
                self.last_seen_valid_time = t_curr

        elif self.state == ClickState.RELEASING:
            if distance < off_thresh:
                self.stats["false_starts"] += 1
                self._change_state(ClickState.PRESSED, t_curr)
                self.last_seen_valid_time = t_curr
            elif elapsed_ms >= self.DEBOUNCE_MS:
                self._change_state(ClickState.COOLDOWN, t_curr)
                self.is_active = False

        elif self.state == ClickState.COOLDOWN:
            if elapsed_ms >= self.COOLDOWN_MS:
                if distance < on_thresh:
                    self.stats["cooldown_rejections"] += 1
                self._change_state(ClickState.IDLE, t_curr)

    def execute(self, t_curr, dt):
        if self.state == ClickState.PRESSED and self.is_active:
            if not hasattr(self, '_sent_down') or not self._sent_down:
                self.on_press_cb()
                self._sent_down = True
                self.stats["successes"] += 1
        elif not self.is_active:
            if hasattr(self, '_sent_down') and self._sent_down:
                self.on_release_cb()
                self._sent_down = False

    def recover(self):
        super().recover()
        if hasattr(self, '_sent_down') and self._sent_down:
            self.on_release_cb()
            self._sent_down = False
        self.state = ClickState.IDLE
        self.stats["recoveries"] += 1
