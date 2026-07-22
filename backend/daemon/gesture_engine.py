import math
from pipeline_types import IntentType, UserIntent

# =============================================================================
# MockMouse — Intercept layer for legacy modules (Step 05 compatibility)
# =============================================================================
class MockMouse:
    def __init__(self):
        self.cursor_x = 0
        self.cursor_y = 0
        self.left_down_flag = False
        self.right_down_flag = False
        self.scroll_delta = 0
        
    def set_cursor_pos(self, x, y):
        self.cursor_x = x
        self.cursor_y = y
        
    def left_down(self):
        self.left_down_flag = True
        
    def left_up(self):
        self.left_down_flag = False

    def right_down(self):
        self.right_down_flag = True
        
    def right_up(self):
        self.right_down_flag = False
        
    def scroll(self, delta):
        self.scroll_delta = delta

    def ctrl_down(self):
        pass

    def ctrl_up(self):
        pass
        
    def release_all(self):
        self.left_down_flag = False
        self.right_down_flag = False
        self.scroll_delta = 0


# =============================================================================
# ClickStateMachine — Standalone replication of ClickModule state machine
# Extracted rules from modules/click_module.py, preserving every constant.
# =============================================================================
class ClickState:
    IDLE = 0
    ENGAGING = 1
    PRESSED = 2
    RELEASING = 3
    COOLDOWN = 4

class ClickStateMachine:
    """
    Independent replication of the ClickModule state machine.
    
    Rules extracted from click_module.py:
    - base_on threshold: 0.04 (scale-normalized)
    - base_off threshold: 0.06 (scale-normalized)
    - scale_mult = hand_scale / 0.1
    - CONFIRM_MS: 60ms (scaled by 1/env_penalty)
    - DEBOUNCE_MS: 80ms (scaled by 1/env_penalty)
    - COOLDOWN_MS: 100ms (not env-scaled)
    - GRACE_MS: 150ms
    - Intent check: distance < on_thresh AND avg_conf > 0.65
    - Session adaptation: base_on = 0.95*base_on + 0.05*max(0.01, min_dist+0.01)
    """
    def __init__(self, name):
        self.name = name
        self.state = ClickState.IDLE
        self.state_enter_time = 0.0
        
        # Scale-normalized Base Thresholds (from click_module.py L21-22)
        self.base_on = 0.04
        self.base_off = 0.06
        
        # Timings (from click_module.py L25-29)
        self.CONFIRM_MS = 60.0
        self.DEBOUNCE_MS = 80.0
        self.COOLDOWN_MS = 100.0
        self.GRACE_MS = 150.0
        self.min_dist_during_press = 1.0
        
        self.last_seen_valid_time = 0.0
        self.is_pressed = False

    def _change_state(self, new_state, t_curr):
        self.state = new_state
        self.state_enter_time = t_curr
        
        if new_state == ClickState.PRESSED and not self.is_pressed:
            self.is_pressed = True
        elif new_state in (ClickState.RELEASING, ClickState.COOLDOWN, ClickState.IDLE) and self.is_pressed:
            self.is_pressed = False

    def process(self, hand_scale, distance, confidence_history, t_curr, env_penalty=1.0):
        avg_conf = sum(confidence_history) / len(confidence_history) if confidence_history else 0.0
        
        # Scale Mult (from click_module.py L87-89)
        scale_mult = hand_scale / 0.1 if hand_scale > 0.01 else 1.0
        on_thresh = self.base_on * scale_mult
        off_thresh = self.base_off * scale_mult
        
        # Scale timings by env_penalty (from click_module.py L92-94)
        penalty_factor = 1.0 / max(0.2, env_penalty)
        dynamic_confirm = self.CONFIRM_MS * penalty_factor
        dynamic_debounce = self.DEBOUNCE_MS * penalty_factor
        
        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0
        
        # Intent Check (from click_module.py L99)
        intent_met = distance < on_thresh and avg_conf > 0.65
        
        if self.state == ClickState.IDLE:
            if intent_met:
                self._change_state(ClickState.ENGAGING, t_curr)
                self.last_seen_valid_time = t_curr

        elif self.state == ClickState.ENGAGING:
            if not intent_met:
                if (t_curr - self.last_seen_valid_time) * 1000.0 > self.GRACE_MS:
                    self._change_state(ClickState.IDLE, t_curr)
            else:
                self.last_seen_valid_time = t_curr
                if elapsed_ms >= dynamic_confirm:
                    self._change_state(ClickState.PRESSED, t_curr)
                    self.min_dist_during_press = distance

        elif self.state == ClickState.PRESSED:
            self.min_dist_during_press = min(self.min_dist_during_press, distance)
            if distance > off_thresh:
                if (t_curr - self.last_seen_valid_time) * 1000.0 > self.GRACE_MS:
                    # Session Adaptation (from click_module.py L124)
                    self.base_on = (0.95 * self.base_on) + (0.05 * max(0.01, self.min_dist_during_press + 0.01))
                    self._change_state(ClickState.RELEASING, t_curr)
            else:
                self.last_seen_valid_time = t_curr

        elif self.state == ClickState.RELEASING:
            if distance < off_thresh:
                self._change_state(ClickState.PRESSED, t_curr)
                self.last_seen_valid_time = t_curr
            elif elapsed_ms >= dynamic_debounce:
                self._change_state(ClickState.COOLDOWN, t_curr)

        elif self.state == ClickState.COOLDOWN:
            if elapsed_ms >= self.COOLDOWN_MS:
                self._change_state(ClickState.IDLE, t_curr)


# =============================================================================
# ContinuousStateMachine — Standalone replication of ContinuousModule
# Extracted rules from modules/continuous_module.py.
# =============================================================================
class ContinuousStateMachine:
    """
    Independent replication of ContinuousModule state machine.
    
    Rules extracted from continuous_module.py:
    - INTENT_MS: 150ms dwell time before activation
    - GRACE_MS: 180ms grace period after pose lost
    - Activation: pose_detected AND confidence > 0.6 for INTENT_MS
    - Deactivation: pose lost for GRACE_MS
    - While active and confidence > 0.5: last_seen_valid refreshed
    """
    def __init__(self, name):
        self.name = name
        self.INTENT_MS = 150.0
        self.GRACE_MS = 180.0
        
        self.is_active = False
        self.state_enter_time = 0.0
        self.last_seen_valid_time = 0.0

    def process_pose(self, pose_detected, confidence, t_curr):
        if not self.is_active:
            if pose_detected and confidence > 0.6:
                if self.state_enter_time == 0.0:
                    self.state_enter_time = t_curr
                elif (t_curr - self.state_enter_time) * 1000.0 >= self.INTENT_MS:
                    self.is_active = True
                    self.last_seen_valid_time = t_curr
            else:
                self.state_enter_time = 0.0
        else:
            if pose_detected and confidence > 0.5:
                self.last_seen_valid_time = t_curr

            elapsed_since_valid = (t_curr - self.last_seen_valid_time) * 1000.0
            if elapsed_since_valid > self.GRACE_MS:
                self.is_active = False
                self.state_enter_time = 0.0


# =============================================================================
# GestureEngine — Independent intent detection with all rules internalized
# =============================================================================
class GestureEngine:
    def __init__(self):
        self.left_click = ClickStateMachine("LEFT_CLICK")
        self.right_click = ClickStateMachine("RIGHT_CLICK")
        self.scroll = ContinuousStateMachine("SCROLL")
        self.zoom = ContinuousStateMachine("ZOOM")
        self.is_dragging = False
        self.last_hand_time = 0.0

    def detect_intent(self, tracking_data, legacy_manager=None, mock_mouse=None) -> UserIntent:
        """
        When mock_mouse is provided: LEGACY MODE — reads MockMouse side-effects.
        When mock_mouse is None: INDEPENDENT MODE — uses internal state machines only.
        """
        t_curr = tracking_data.get("t_curr", 0.0)
        confidence = tracking_data.get("confidence", 0.0)
        raw_x = tracking_data.get("raw_x", 0.0)
        raw_y = tracking_data.get("raw_y", 0.0)
        dist_i = tracking_data.get("dist_i", 0.0)
        dist_m = tracking_data.get("dist_m", 0.0)
        hand_scale = tracking_data.get("hand_scale", 0.1)
        has_hand = tracking_data.get("has_hand", False)
        tracking_state = tracking_data.get("tracking_state", "IDLE")
        zoom_pose = tracking_data.get("zoom_pose", False)
        scroll_pose = tracking_data.get("scroll_pose", False)
        conf_hist = tracking_data.get("conf_hist", [])
        env_penalty = tracking_data.get("env_penalty", 1.0)
        
        if has_hand:
            self.last_hand_time = t_curr
        else:
            time_since_hand = (t_curr - self.last_hand_time) * 1000.0
            if time_since_hand <= 300.0 and (self.is_dragging or self.scroll.is_active or self.zoom.is_active):
                # Extrapolate: prevent clicks from triggering due to 0 distance
                dist_i = 1.0
                dist_m = 1.0
                scroll_pose = False
                zoom_pose = False
                confidence = 0.0
            else:
                self.left_click._change_state(ClickState.IDLE, t_curr)
                self.left_click.is_pressed = False
                self.right_click._change_state(ClickState.IDLE, t_curr)
                self.right_click.is_pressed = False
                self.scroll.is_active = False
                self.scroll.state_enter_time = 0.0
                self.zoom.is_active = False
                self.zoom.state_enter_time = 0.0
                self.is_dragging = False
                return UserIntent(IntentType.NO_HAND, raw_x, raw_y, dist_i, confidence, t_curr)
        if tracking_state == "WARMING_UP":
            return UserIntent(IntentType.IDLE, raw_x, raw_y, dist_i, confidence, t_curr)

        # =====================================================================
        # LEGACY MODE: Read MockMouse side-effects from PriorityManager
        # =====================================================================
        if mock_mouse is not None:
            intent_type = IntentType.MOVE_CURSOR
            
            if zoom_pose:
                intent_type = IntentType.ZOOM
            elif scroll_pose:
                intent_type = IntentType.SCROLL
            elif mock_mouse.right_down_flag:
                intent_type = IntentType.RIGHT_CLICK
            elif mock_mouse.left_down_flag:
                if not self.is_dragging:
                    self.is_dragging = True
                    intent_type = IntentType.LEFT_CLICK
                else:
                    intent_type = IntentType.DRAG
            else:
                self.is_dragging = False
                intent_type = IntentType.MOVE_CURSOR
                
            mock_mouse.scroll_delta = 0
            return UserIntent(intent_type, raw_x, raw_y, dist_i, confidence, t_curr)

        # =====================================================================
        # INDEPENDENT MODE: Use internal state machines only
        # =====================================================================

        # Block right click if peace sign is active or engaging to prevent accidental clicks
        if scroll_pose or self.scroll.is_active:
            self.right_click._change_state(ClickState.IDLE, t_curr)
            self.right_click.is_pressed = False
            dist_m = 1.0

        # Step 1: Feed all state machines (mirrors daemon.py processing order)
        self.left_click.process(hand_scale, dist_i, conf_hist, t_curr, env_penalty)
        self.right_click.process(hand_scale, dist_m, conf_hist, t_curr, env_penalty)
        
        # Extend grace period for ZOOM if confidence drops (e.g., due to fist obscuring landmarks)
        if self.zoom.is_active and confidence < 0.7:
            self.zoom.GRACE_MS = 300.0
        else:
            self.zoom.GRACE_MS = 180.0
            
        self.scroll.process_pose(scroll_pose, confidence, t_curr)
        self.zoom.process_pose(zoom_pose, confidence, t_curr)
        
        # Step 2: Priority Arbitration
        # Replicate PriorityManager from interaction_manager.py L102-136
        # Priority: ZOOM(80) > SCROLL(70) > LEFT_CLICK(50) = RIGHT_CLICK(50) > CURSOR(10)
        
        intent_type = IntentType.MOVE_CURSOR
        
        if self.zoom.is_active:
            intent_type = IntentType.ZOOM
        elif self.scroll.is_active:
            intent_type = IntentType.SCROLL
        elif self.right_click.is_pressed:
            intent_type = IntentType.RIGHT_CLICK
        elif self.left_click.is_pressed:
            if not self.is_dragging:
                self.is_dragging = True
                intent_type = IntentType.LEFT_CLICK
            else:
                intent_type = IntentType.DRAG
        else:
            self.is_dragging = False
            intent_type = IntentType.MOVE_CURSOR

        is_engaging = (self.left_click.state == ClickState.ENGAGING)
        return UserIntent(intent_type, raw_x, raw_y, dist_i, confidence, t_curr, is_engaging=is_engaging)


# =============================================================================
# IntentValidator — Dual-execution comparison engine
# =============================================================================
class IntentValidator:
    def __init__(self):
        self.frame_count = 0
        self.match_count = 0
        self.mismatch_count = 0
        self.mismatches = []  # List of dicts with mismatch details
        self.MAX_STORED_MISMATCHES = 200

    def compare(self, legacy_intent: UserIntent, new_intent: UserIntent, tracking_data: dict):
        self.frame_count += 1
        
        if legacy_intent.type == new_intent.type:
            self.match_count += 1
        else:
            self.mismatch_count += 1
            if len(self.mismatches) < self.MAX_STORED_MISMATCHES:
                self.mismatches.append({
                    "frame": self.frame_count,
                    "legacy": legacy_intent.type.name,
                    "new": new_intent.type.name,
                    "raw_x": tracking_data.get("raw_x", 0.0),
                    "raw_y": tracking_data.get("raw_y", 0.0),
                    "dist_i": tracking_data.get("dist_i", 0.0),
                    "dist_m": tracking_data.get("dist_m", 0.0),
                    "has_hand": tracking_data.get("has_hand", False),
                    "scroll_pose": tracking_data.get("scroll_pose", False),
                    "zoom_pose": tracking_data.get("zoom_pose", False),
                })

    def get_agreement_pct(self):
        if self.frame_count == 0:
            return 100.0
        return round((self.match_count / self.frame_count) * 100.0, 2)

    def get_report(self):
        return {
            "total_frames": self.frame_count,
            "matches": self.match_count,
            "mismatches": self.mismatch_count,
            "agreement_pct": self.get_agreement_pct(),
            "sample_mismatches": self.mismatches[:20]
        }
