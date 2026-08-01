import math
from pipeline_types import IntentType, UserIntent, ClickEvent, InteractionSession, LockReason

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
import uuid
from diagnostic_buffer import diag_buffer

class ClickState:
    IDLE = 0
    PINCH_STARTED = 1
    CONFIRMING = 2
    CLICK_DOWN = 3
    HELD = 4
    LOST_TRACKING = 5
    RELEASE = 6
    COOLDOWN = 7

class ClickStateMachine:
    """
    Production Event-Driven Click State Machine.
    
    Features:
    - Fused Dual-Confidence Model (Geometry Score x MediaPipe Tracking Confidence)
    - Schmitt Trigger Hysteresis (0.60 ON / 0.30 OFF)
    - Dual-Path Drag Activation (350ms Hold Time OR 0.06 Spatial Displacement)
    - 200ms LOST_TRACKING Grace Recovery Window
    - Unique Interaction UUIDs (clk_xxxx) and structured lifecycle transition logging
    """
    def __init__(self, name, lock_manager=None):
        self.name = name
        self.lock_manager = lock_manager
        self.state = ClickState.IDLE
        self.state_enter_time = 0.0
        
        self.threshold_on = 0.60
        self.threshold_off = 0.30
        self.pre_engage_threshold = 0.40
        
        self.confidence_accumulator = 0.0
        self.HOLD_TIME_MS = 350.0
        self.DRAG_DIST_THRESHOLD = 0.12
        self.LOST_TRACKING_GRACE_MS = 200.0
        self.COOLDOWN_MS = 80.0
        self.STABILIZATION_DELAY_S = 0.040  # 40ms configurable post-click delay
        
        self.interaction_id = ""
        self.press_start_time = 0.0
        self.press_anchor_x = 0.0
        self.press_anchor_y = 0.0
        self.is_pressed = False
        self.is_dragging = False
        self.lost_tracking_time = 0.0
        self.pre_click_anchor_x = 0.0
        self.pre_click_anchor_y = 0.0
        self.pre_click_anchor_screen_x = 0.0
        self.pre_click_anchor_screen_y = 0.0
        self.pre_click_drift = 0.0
        self.locked_palm_x = 0.0
        self.locked_palm_y = 0.0
        self.drag_frames = 0
        self.low_confidence_frames = 0
        
        self.session = None

    def _push_event(self, event: ClickEvent):
        if self.session and self.session.is_active:
            # Guarantee Idempotency: Do not push duplicate sequential events
            if not self.session.pending_events or self.session.pending_events[-1] != event:
                self.session.pending_events.append(event)

    def _change_state(self, new_state, t_curr, reason=""):
        state_names = {
            0: 'IDLE', 1: 'PINCH_STARTED', 2: 'CONFIRMING',
            3: 'CLICK_DOWN', 4: 'HELD', 5: 'LOST_TRACKING',
            6: 'RELEASE', 7: 'COOLDOWN'
        }
        old_state = self.state
        old_name = state_names.get(self.state, str(self.state))
        new_name = state_names.get(new_state, str(new_state))
        
        if new_state == ClickState.PINCH_STARTED and not self.interaction_id:
            self.interaction_id = f"clk_{uuid.uuid4().hex[:6]}"
            
        # =========================================================
        # InteractionSession Lifecycle & Event Queue Logic
        # =========================================================
        if new_state == ClickState.PINCH_STARTED and old_state == ClickState.IDLE:
            self.session = InteractionSession(interaction_id=self.interaction_id)
            if self.lock_manager:
                self.lock_manager.acquire(LockReason.CLICK, self.pre_click_anchor_screen_x, self.pre_click_anchor_screen_y)
            
        if new_state == ClickState.CLICK_DOWN and not self.is_pressed:
            self._push_event(ClickEvent.DOWN)
            
        if new_state == ClickState.RELEASE and old_state in (ClickState.CLICK_DOWN, ClickState.HELD, ClickState.LOST_TRACKING):
            self._push_event(ClickEvent.UP)
            if self.session:
                self.session.unlock_time = t_curr + self.STABILIZATION_DELAY_S

        if new_state == ClickState.IDLE:
            if self.is_pressed:
                # Catch hard-resets that bypass RELEASE to prevent stuck clicks
                self._push_event(ClickEvent.UP)
            if self.session:
                self.session.is_active = False
            if self.lock_manager:
                self.lock_manager.release(LockReason.CLICK)
                
        # Handle Session Expiry (Delayed destruction for stabilization)
        if self.session and not self.session.is_active and t_curr > self.session.unlock_time:
            if not self.session.pending_events:
                # Stage 6B: Enforce active cleanup before destruction
                self.session.destroy()
                self.session = None

        try:
            from logger import system_logger
            cursor_locked_status = self.lock_manager.locked if self.lock_manager else False
            system_logger.info(
                f"[ClickPipeline] ID:{self.interaction_id} {self.name} {old_name} -> {new_name} "
                f"at {t_curr:.3f}s | Reason: {reason} | Acc:{self.confidence_accumulator:.2f} | Locked:{cursor_locked_status}"
            )
            semantic_event = "TRANSITION"
            if new_state == ClickState.PINCH_STARTED: semantic_event = "LOCK_ACQUIRED"
            elif old_state in (ClickState.PINCH_STARTED, ClickState.CONFIRMING) and new_state == ClickState.IDLE: 
                semantic_event = "MOVEMENT_CANCELLED" if "Drift exceeded" in reason else "LOCK_RELEASED"
            elif old_state in (ClickState.PINCH_STARTED, ClickState.CONFIRMING) and new_state == ClickState.CLICK_DOWN:
                semantic_event = "CLICK_CONFIRMED"
            elif new_state == ClickState.HELD: semantic_event = "DRAG_STARTED"
            elif old_state == ClickState.CLICK_DOWN and new_state == ClickState.RELEASE: semantic_event = "LOCK_RELEASED"

            diag_buffer.append("ClickPipeline", "STATE_TRANSITION", {
                "interaction_id": self.interaction_id,
                "name": self.name,
                "semantic_event": semantic_event,
                "old_state": old_name,
                "new_state": new_name,
                "reason": reason,
                "accumulator": round(self.confidence_accumulator, 2),
                "suppressed_drift": round(getattr(self, 'pre_click_drift', 0.0) * 1000, 2),
                "lock_duration_ms": round((t_curr - self.state_enter_time) * 1000, 2),
                "locked_position": {"x": round(self.pre_click_anchor_x, 3), "y": round(self.pre_click_anchor_y, 3)},
                "timestamp": round(t_curr, 3)
            })
        except Exception:
            pass

        self.state = new_state
        self.state_enter_time = t_curr
        
        if new_state == ClickState.HELD and self.lock_manager:
            self.lock_manager.release(LockReason.CLICK)
        
        if new_state in (ClickState.CLICK_DOWN, ClickState.HELD):
            self.is_pressed = True
        elif new_state in (ClickState.RELEASE, ClickState.COOLDOWN, ClickState.IDLE):
            self.is_pressed = False
            self.is_dragging = False
            if new_state == ClickState.IDLE:
                self.interaction_id = ""

    def process(self, click_score, confidence_history, t_curr, env_penalty=1.0, raw_x=0.0, raw_y=0.0, has_hand=True, config=None, palm_x=0.0, palm_y=0.0, screen_x=0.0, screen_y=0.0):
        if config and hasattr(config, "state"):
            self.threshold_on = config.state.get("pinch_sensitivity_on", 0.60)
            self.threshold_off = config.state.get("pinch_sensitivity_off", 0.30)
            self.HOLD_TIME_MS = config.state.get("hold_delay_ms", 350.0)
            self.DRAG_DIST_THRESHOLD = config.state.get("drag_distance", 0.12)
            self.COOLDOWN_MS = config.state.get("debounce_ms", 80.0)
            self.STABILIZATION_DELAY_S = config.state.get("stabilization_delay_ms", 40.0) / 1000.0
            
        avg_conf = sum(confidence_history) / len(confidence_history) if (confidence_history and len(confidence_history) > 0) else (1.0 if has_hand else 0.0)
        # Fused Dual-Confidence Model
        fused_conf = click_score * avg_conf if has_hand else 0.0
        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0
        
        # Check active session lock expiry
        if self.session and not self.session.is_active:
            if t_curr >= self.session.unlock_time:
                if self.lock_manager:
                    self.lock_manager.release(LockReason.CLICK)
                if not self.session.pending_events:
                    self.session = None

        if self.state != ClickState.IDLE:
            state_names = {
                0: 'IDLE', 1: 'PINCH_STARTED', 2: 'CONFIRMING',
                3: 'CLICK_DOWN', 4: 'HELD', 5: 'LOST_TRACKING',
                6: 'RELEASE', 7: 'COOLDOWN'
            }
            st_name = state_names.get(self.state, str(self.state))
            anchor_x = self.press_anchor_x if self.state in (ClickState.CLICK_DOWN, ClickState.HELD) else self.pre_click_anchor_x
            anchor_y = self.press_anchor_y if self.state in (ClickState.CLICK_DOWN, ClickState.HELD) else self.pre_click_anchor_y
            curr_dist = math.sqrt((raw_x - anchor_x)**2 + (raw_y - anchor_y)**2)
            try:
                from logger import system_logger
                system_logger.info(
                    f"[ClickTrace] State={st_name} | Distance={curr_dist:.4f} | "
                    f"Threshold={self.DRAG_DIST_THRESHOLD:.4f} | HoldTimer={elapsed_ms:.1f}ms | Score={click_score:.3f}"
                )
            except Exception:
                pass

        if self.state == ClickState.IDLE:
            if has_hand and click_score > self.pre_engage_threshold:
                self.confidence_accumulator = 0.35
                self.pre_click_anchor_x = raw_x
                self.pre_click_anchor_y = raw_y
                self.pre_click_anchor_screen_x = screen_x
                self.pre_click_anchor_screen_y = screen_y
                self.locked_palm_x = palm_x
                self.locked_palm_y = palm_y
                self.pre_click_drift = 0.0
                self.low_confidence_frames = 0
                self._change_state(ClickState.PINCH_STARTED, t_curr, "Geometry score > 0.40")
                
        elif self.state in (ClickState.PINCH_STARTED, ClickState.CONFIRMING):
            if self.state == ClickState.PINCH_STARTED:
                if not has_hand:
                    self._change_state(ClickState.IDLE, t_curr, "Hand tracking lost")
                elif click_score > self.threshold_on:
                    self.low_confidence_frames = 0
                    self.confidence_accumulator += 0.35
                    if self.confidence_accumulator >= 1.0:
                        self.press_start_time = t_curr
                        self.press_anchor_x = raw_x
                        self.press_anchor_y = raw_y
                        self._change_state(ClickState.CLICK_DOWN, t_curr, "Fused confidence >= 1.0")
                    else:
                        self._change_state(ClickState.CONFIRMING, t_curr, "Accumulating confidence")
                elif click_score < self.threshold_off:
                    self.low_confidence_frames += 1
                    if self.low_confidence_frames >= 3:
                        self._change_state(ClickState.IDLE, t_curr, "REJECTED: CONFIDENCE_DECAY")
                else:
                    self.low_confidence_frames = 0

            elif self.state == ClickState.CONFIRMING:
                if not has_hand:
                    self._change_state(ClickState.IDLE, t_curr, "Hand tracking lost")
                elif click_score > self.threshold_on:
                    self.low_confidence_frames = 0
                    self.confidence_accumulator += 0.35
                    if self.confidence_accumulator >= 1.0:
                        self.press_start_time = t_curr
                        self.press_anchor_x = raw_x
                        self.press_anchor_y = raw_y
                        self._change_state(ClickState.CLICK_DOWN, t_curr, "Fused confidence confirmed")
                elif click_score < self.threshold_off:
                    self.low_confidence_frames += 1
                    self.confidence_accumulator = max(0.0, self.confidence_accumulator - 0.30)
                    if self.confidence_accumulator <= 0.0 or self.low_confidence_frames >= 3:
                        self._change_state(ClickState.IDLE, t_curr, "REJECTED: CONFIDENCE_DECAY")
                else:
                    self.low_confidence_frames = 0

        elif self.state == ClickState.CLICK_DOWN:
            dist_moved = math.sqrt((raw_x - self.press_anchor_x)**2 + (raw_y - self.press_anchor_y)**2)
            if not has_hand:
                self.drag_frames = 0
                self.lost_tracking_time = t_curr
                self._change_state(ClickState.LOST_TRACKING, t_curr, "Landmark drop during click")
            elif click_score < self.threshold_off:
                self.drag_frames = 0
                self._change_state(ClickState.RELEASE, t_curr, f"Tap completed (< 350ms, elapsed={elapsed_ms:.0f}ms)")
            else:
                if dist_moved > self.DRAG_DIST_THRESHOLD:
                    self.drag_frames += 1
                else:
                    self.drag_frames = 0
                
                if self.drag_frames >= 2:
                    self.is_dragging = True
                    self._change_state(ClickState.HELD, t_curr, f"Exceeded drag distance for 2 frames (dist={dist_moved:.4f} > threshold={self.DRAG_DIST_THRESHOLD:.4f}, elapsed={elapsed_ms:.0f}ms)")
                elif elapsed_ms >= self.HOLD_TIME_MS:
                    self.drag_frames = 0
                    self.is_dragging = True
                    self._change_state(ClickState.HELD, t_curr, f"Hold timer expired (elapsed={elapsed_ms:.0f}ms >= hold={self.HOLD_TIME_MS:.0f}ms, dist={dist_moved:.4f})")

        elif self.state == ClickState.HELD:
            if not has_hand:
                self.lost_tracking_time = t_curr
                self._change_state(ClickState.LOST_TRACKING, t_curr, "Landmark drop during drag")
            elif click_score < self.threshold_off:
                self._change_state(ClickState.RELEASE, t_curr, "Pinch released during drag")

        elif self.state == ClickState.LOST_TRACKING:
            lost_elapsed_ms = (t_curr - self.lost_tracking_time) * 1000.0
            if has_hand and click_score > self.threshold_off:
                self._change_state(ClickState.HELD if self.is_dragging else ClickState.CLICK_DOWN, t_curr, "Tracking recovered within 200ms grace window")
            elif lost_elapsed_ms > self.LOST_TRACKING_GRACE_MS:
                self._change_state(ClickState.RELEASE, t_curr, "REJECTED: LOST_TRACKING grace window expired (> 200ms)")

        elif self.state == ClickState.RELEASE:
            self._change_state(ClickState.COOLDOWN, t_curr, "Click up executed")

        elif self.state == ClickState.COOLDOWN:
            if elapsed_ms >= self.COOLDOWN_MS:
                self._change_state(ClickState.IDLE, t_curr, "Cooldown finished")


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
        
        self.threshold_enter = 0.70
        self.threshold_maintain = 0.40
        
        self.is_active = False
        self.state_enter_time = 0.0
        self.last_seen_valid_time = 0.0

    def process_pose(self, pose_detected, confidence, t_curr, config=None):
        if config and hasattr(config, "state"):
            self.threshold_enter = config.state.get("scroll_threshold_enter", 0.70)
            self.threshold_maintain = config.state.get("scroll_threshold_maintain", 0.40)
        if not self.is_active:
            if pose_detected and confidence > self.threshold_enter:
                if self.state_enter_time == 0.0:
                    self.state_enter_time = t_curr
                elif (t_curr - self.state_enter_time) * 1000.0 >= self.INTENT_MS:
                    self.is_active = True
                    self.last_seen_valid_time = t_curr
            else:
                self.state_enter_time = 0.0
        else:
            if pose_detected and confidence > self.threshold_maintain:
                self.last_seen_valid_time = t_curr

            elapsed_since_valid = (t_curr - self.last_seen_valid_time) * 1000.0
            if elapsed_since_valid > self.GRACE_MS:
                self.is_active = False
                self.state_enter_time = 0.0


# =============================================================================
# DoubleClickStateMachine — Observational State Machine
# =============================================================================
class DoubleClickState:
    IDLE = 0
    WAITING_FOR_SECOND_CLICK = 1
    SECOND_CLICK = 2

class DoubleClickStateMachine:
    def __init__(self, lock_manager):
        self.lock_manager = lock_manager
        self.state = DoubleClickState.IDLE
        self.state_enter_time = 0.0
        self.anchor_x_px = 0.0
        self.anchor_y_px = 0.0
        self.session = None

    def _change_state(self, new_state, t_curr, reason=""):
        try:
            state_names = {0: 'IDLE', 1: 'WAITING_FOR_SECOND_CLICK', 2: 'SECOND_CLICK'}
            from logger import system_logger
            system_logger.info(f"[DoubleClickPipeline] {state_names.get(self.state)} -> {state_names.get(new_state)} at {t_curr:.3f}s | Reason: {reason}")
            
            diag_buffer.append("DoubleClickPipeline", "STATE_TRANSITION", {
                "old_state": state_names.get(self.state),
                "new_state": state_names.get(new_state),
                "reason": reason,
                "timestamp": round(t_curr, 3)
            })
        except Exception:
            pass

        self.state = new_state
        self.state_enter_time = t_curr
        if new_state == DoubleClickState.IDLE and self.session:
            self.session.destroy()
            self.session = None

    def _get_workspace_params(self, config):
        if config and hasattr(config, "state"):
            calib = config.state.get("calibration", {})
            wa = calib.get("workingArea", {})
            wa_minX = wa.get("minX", 0.25)
            wa_maxX = wa.get("maxX", 0.75)
            wa_minY = wa.get("minY", 0.20)
            wa_maxY = wa.get("maxY", 0.58)
            
            # Enforce minimum boundaries
            if (wa_maxX - wa_minX) < 0.1: wa_minX, wa_maxX = 0.25, 0.75
            if (wa_maxY - wa_minY) < 0.1: wa_minY, wa_maxY = 0.20, 0.58
            return wa_minX, wa_maxX, wa_minY, wa_maxY
        return 0.25, 0.75, 0.20, 0.58

    def _normalized_to_screen(self, raw_x, raw_y, screen_w, screen_h, config):
        wa_minX, wa_maxX, wa_minY, wa_maxY = self._get_workspace_params(config)
        margin_x = (wa_maxX - wa_minX) * 0.10
        margin_y = (wa_maxY - wa_minY) * 0.15
        
        nx = max(wa_minX - margin_x, min(raw_x, wa_maxX + margin_x))
        ny = max(wa_minY - margin_y, min(raw_y, wa_maxY + margin_y))
        
        norm_x = (nx - wa_minX) / (wa_maxX - wa_minX)
        norm_y = (ny - wa_minY) / (wa_maxY - wa_minY)
        return norm_x * screen_w, norm_y * screen_h

    def process(self, click_machine, tracking_data, config):
        t_curr = tracking_data.get("t_curr", 0.0)
        has_hand = tracking_data.get("has_hand", False)
        raw_x = tracking_data.get("raw_x", 0.0)
        raw_y = tracking_data.get("raw_y", 0.0)
        screen_size = tracking_data.get("screen_size", (1920, 1080))
        
        timeout_ms = config.state.get("double_click_timeout_ms", 400.0) if config else 400.0
        movement_tol_px = config.state.get("double_click_movement_tolerance_px", 12.0) if config else 12.0
        max_interrupt_ms = config.state.get("double_click_max_interruption_ms", 100.0) if config else 100.0

        screen_cursor_x = tracking_data.get("screen_cursor_x", 0.0)
        screen_cursor_y = tracking_data.get("screen_cursor_y", 0.0)

        if self.state == DoubleClickState.IDLE:
            # Transition to WAITING if the first click successfully releases
            if click_machine.state in (ClickState.RELEASE, ClickState.COOLDOWN):
                self.anchor_x_px = screen_cursor_x
                self.anchor_y_px = screen_cursor_y
                self._change_state(DoubleClickState.WAITING_FOR_SECOND_CLICK, t_curr, "First click released successfully")

        elif self.state == DoubleClickState.WAITING_FOR_SECOND_CLICK:
            elapsed_ms = (t_curr - self.state_enter_time) * 1000.0
            drift_px = math.sqrt((screen_cursor_x - self.anchor_x_px)**2 + (screen_cursor_y - self.anchor_y_px)**2)
            
            # Immediately unlock and cancel if any condition is violated
            if click_machine.state == ClickState.HELD:
                self._change_state(DoubleClickState.IDLE, t_curr, "Drag started instead of click")
            elif not has_hand and elapsed_ms > max_interrupt_ms:
                self._change_state(DoubleClickState.IDLE, t_curr, "Tracking lost for too long")
            elif drift_px > movement_tol_px:
                self._change_state(DoubleClickState.IDLE, t_curr, f"Movement exceeded tolerance ({drift_px:.1f}px > {movement_tol_px}px)")
            elif elapsed_ms > timeout_ms:
                self._change_state(DoubleClickState.IDLE, t_curr, "Double click timeout expired")
            elif click_machine.state == ClickState.CLICK_DOWN:
                self._change_state(DoubleClickState.SECOND_CLICK, t_curr, "Second click initiated perfectly on target")

        elif self.state == DoubleClickState.SECOND_CLICK:
            if click_machine.state in (ClickState.RELEASE, ClickState.COOLDOWN):
                self._change_state(DoubleClickState.IDLE, t_curr, "Second click completed, releasing lock")
            elif click_machine.state == ClickState.HELD:
                self._change_state(DoubleClickState.IDLE, t_curr, "Second click became a drag, releasing lock")
            elif click_machine.state == ClickState.IDLE:
                self._change_state(DoubleClickState.IDLE, t_curr, "Second click aborted")

# =============================================================================
# GestureEngine — Independent intent detection with all rules internalized
# =============================================================================
class GestureEngine:
    def __init__(self, lock_manager=None):
        self.lock_manager = lock_manager
        self.left_click = ClickStateMachine("LEFT_CLICK", lock_manager)
        self.right_click = ClickStateMachine("RIGHT_CLICK", lock_manager)
        self.double_click = DoubleClickStateMachine(lock_manager)
        self.scroll = ContinuousStateMachine("SCROLL")
        self.zoom = ContinuousStateMachine("ZOOM")
        self.is_dragging = False
        self.last_hand_time = 0.0
        self.current_intent = IntentType.IDLE
        # Consecutive fist frame counter — ZOOM requires sustained fist pose
        self._fist_frame_count = 0
        self._FIST_FRAMES_REQUIRED = 8  # ~267ms at 30fps

    def detect_intent(self, tracking_data, legacy_manager=None, mock_mouse=None, config=None) -> UserIntent:
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
            # Stage 6B: Never short-circuit. Just zero out inputs and let state machines decay naturally.
            dist_i = 1.0
            dist_m = 1.0
            scroll_pose = False
            zoom_pose = False
            confidence = 0.0
        if tracking_state == "WARMING_UP":
            return UserIntent(IntentType.IDLE, raw_x, raw_y, dist_i, confidence, t_curr, session=None)

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
            return UserIntent(intent_type, raw_x, raw_y, dist_i, confidence, t_curr, session=None)

        # =====================================================================
        # INDEPENDENT MODE: Use internal state machines only
        # =====================================================================

        left_click_score = tracking_data.get("left_click_score", 0.0)
        right_click_score = tracking_data.get("right_click_score", 0.0)

        # Extract palm center for stable drift tracking
        landmarks = tracking_data.get("landmarks", [])
        palm_x = landmarks[9]["x"] if landmarks and len(landmarks) > 9 else raw_x
        palm_y = landmarks[9]["y"] if landmarks and len(landmarks) > 9 else raw_y

        # Enforce Gesture Exclusivity (Stage 6A)
        # Block left and right clicks if scroll or zoom are active or engaging,
        # BUT only if they are in pre-click states. If they are already actively clicking/dragging,
        # let them finish their natural lifecycle to prevent dropping drags.
        if scroll_pose or self.scroll.is_active or zoom_pose or self.zoom.is_active:
            if self.left_click.state not in (ClickState.PINCH_STARTED, ClickState.CONFIRMING, ClickState.CLICK_DOWN, ClickState.HELD):
                self.left_click._change_state(ClickState.IDLE, t_curr, "Exclusivity: Preempted by Scroll/Zoom")
                left_click_score = 0.0
            
            if self.right_click.state not in (ClickState.PINCH_STARTED, ClickState.CONFIRMING, ClickState.CLICK_DOWN, ClickState.HELD):
                self.right_click._change_state(ClickState.IDLE, t_curr, "Exclusivity: Preempted by Scroll/Zoom")
                right_click_score = 0.0

        screen_x = tracking_data.get("screen_cursor_x", 0.0)
        screen_y = tracking_data.get("screen_cursor_y", 0.0)

        # Step 1: Feed all state machines (mirrors daemon.py processing order)
        self.left_click.process(left_click_score, conf_hist, t_curr, env_penalty, raw_x=raw_x, raw_y=raw_y, has_hand=has_hand, config=config, palm_x=palm_x, palm_y=palm_y, screen_x=screen_x, screen_y=screen_y)
        self.right_click.process(right_click_score, conf_hist, t_curr, env_penalty, raw_x=raw_x, raw_y=raw_y, has_hand=has_hand, config=config, palm_x=palm_x, palm_y=palm_y, screen_x=screen_x, screen_y=screen_y)
        
        # Extend grace period for ZOOM if confidence drops (e.g., due to fist obscuring landmarks)
        if self.zoom.is_active and confidence < 0.7:
            self.zoom.GRACE_MS = 300.0
        else:
            self.zoom.GRACE_MS = 180.0
            
        # Mutual exclusion: ZOOM and SCROLL poses are physically incompatible.
        # If zoom_pose is signalled, forcibly deactivate scroll and vice versa.
        if zoom_pose and self.scroll.is_active:
            self.scroll.is_active = False
            self.scroll.state_enter_time = 0.0
        if scroll_pose and self.zoom.is_active:
            self.zoom.is_active = False
            self.zoom.state_enter_time = 0.0
            self._fist_frame_count = 0
            
        # Cancel double click candidate if a conflicting gesture activates
        if (self.scroll.is_active or self.zoom.is_active or self.right_click.is_pressed) and self.double_click.state != DoubleClickState.IDLE:
            self.double_click._change_state(DoubleClickState.IDLE, t_curr, "Conflicting gesture activated")

        # Consecutive fist frame debounce — only allow zoom_pose to propagate
        # after fist is held for _FIST_FRAMES_REQUIRED consecutive frames.
        if zoom_pose:
            self._fist_frame_count += 1
        else:
            self._fist_frame_count = 0
        debounced_zoom_pose = self._fist_frame_count >= self._FIST_FRAMES_REQUIRED

        self.scroll.process_pose(scroll_pose, confidence, t_curr, config=config)
        self.zoom.process_pose(debounced_zoom_pose, confidence, t_curr, config=config)
        
        # Process DoubleClick Machine (Observational)
        self.double_click.process(self.left_click, tracking_data, config)
        
        # Step 2: Priority Arbitration
        # Priority: ZOOM(80) > SCROLL(70) > LEFT_CLICK(50) = RIGHT_CLICK(50) > CURSOR(10)
        intent_type = IntentType.MOVE_CURSOR
        
        if self.zoom.is_active:
            intent_type = IntentType.ZOOM
        elif self.scroll.is_active:
            intent_type = IntentType.SCROLL
        elif self.right_click.is_pressed:
            intent_type = IntentType.RIGHT_CLICK
        elif self.left_click.is_dragging:
            intent_type = IntentType.DRAG
            self.is_dragging = True
        elif self.left_click.is_pressed:
            intent_type = IntentType.LEFT_CLICK
            self.is_dragging = False
        else:
            self.is_dragging = False
            if not has_hand:
                intent_type = IntentType.NO_HAND
            else:
                intent_type = IntentType.MOVE_CURSOR

        # State Transition Logging (Priority 1)
        if intent_type != self.current_intent:
            try:
                from logger import system_logger
                
                reason = "Default"
                if intent_type == IntentType.ZOOM: reason = "Zoom threshold met"
                elif intent_type == IntentType.SCROLL: reason = "Scroll threshold met"
                elif intent_type == IntentType.LEFT_CLICK: reason = "Left click pinch met"
                elif intent_type == IntentType.RIGHT_CLICK: reason = "Right click pinch met"
                elif intent_type == IntentType.DRAG: reason = "Drag hold met"
                elif intent_type == IntentType.MOVE_CURSOR: reason = "Gestures released"
                
                system_logger.info(
                    f"\n[INTERACTION STATE] ID:{self.left_click.interaction_id} {self.current_intent.name} \n"
                    f"↓\n"
                    f"{intent_type.name}\n"
                    f"Reason: {reason}\n"
                    f"Timestamp: {t_curr:.3f}\n"
                )
                diag_buffer.append("GestureEngine", "STATE_TRANSITION", {
                    "interaction_id": self.left_click.interaction_id,
                    "old_state": self.current_intent.name,
                    "new_state": intent_type.name,
                    "reason": reason,
                    "active_states": {
                        "left_click": self.left_click.is_pressed,
                        "right_click": self.right_click.is_pressed,
                        "scroll": self.scroll.is_active,
                        "zoom": self.zoom.is_active,
                        "dragging": self.left_click.is_dragging
                    }
                })
            except Exception:
                pass
            self.current_intent = intent_type

        # Attach active InteractionSession to Intent (will be None if no session exists)
        session = self.left_click.session
            
        return UserIntent(intent_type, raw_x, raw_y, dist_i, confidence, t_curr, session=session)

    def get_pending_events(self):
        """Aggregate all pending events from all active sessions (Stage 6B)."""
        events = []
        if self.left_click.session and self.left_click.session.pending_events:
            while self.left_click.session.pending_events:
                events.append((self.left_click.session.interaction_id, "LEFT", self.left_click.session.pending_events.popleft()))
                
        if self.right_click.session and self.right_click.session.pending_events:
            while self.right_click.session.pending_events:
                events.append((self.right_click.session.interaction_id, "RIGHT", self.right_click.session.pending_events.popleft()))
                
        return events

    def emergency_stop(self, t_curr):
        """Single cleanup entry point (Stage 6B). Force all state machines to IDLE, destroying sessions, and return cleanup events."""
        # This naturally flushes UP events into the sessions if they were active
        self.left_click._change_state(ClickState.IDLE, t_curr, "Emergency Stop")
        self.left_click.is_pressed = False
        self.right_click._change_state(ClickState.IDLE, t_curr, "Emergency Stop")
        self.right_click.is_pressed = False
        
        self.scroll.is_active = False
        self.scroll.state_enter_time = 0.0
        self.zoom.is_active = False
        self.zoom.state_enter_time = 0.0
        self.is_dragging = False
        
        self.double_click._change_state(DoubleClickState.IDLE, t_curr, "Emergency stop")
        
        # Pull all flushed events
        events = self.get_pending_events()
        
        # Destroy sessions forcefully
        if self.left_click.session:
            self.left_click.session.destroy()
            self.left_click.session = None
        if self.right_click.session:
            self.right_click.session.destroy()
            self.right_click.session = None
            
        return events


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
