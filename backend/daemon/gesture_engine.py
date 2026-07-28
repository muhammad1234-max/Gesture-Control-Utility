import math
from pipeline_types import IntentType, UserIntent, ClickEvent, InteractionSession

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
    def __init__(self, name):
        self.name = name
        self.state = ClickState.IDLE
        self.state_enter_time = 0.0
        
        self.threshold_on = 0.60
        self.threshold_off = 0.30
        self.pre_engage_threshold = 0.40
        
        self.confidence_accumulator = 0.0
        self.HOLD_TIME_MS = 350.0
        self.DRAG_DIST_THRESHOLD = 0.06
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
        self.pre_click_drift = 0.0
        self.locked_palm_x = 0.0
        self.locked_palm_y = 0.0
        
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
            self.session.cursor_locked = True
            
        if new_state == ClickState.CLICK_DOWN and old_state != ClickState.CLICK_DOWN:
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
                self.session.cursor_locked = False
                
        # Handle Session Expiry (Delayed destruction for stabilization)
        if self.session and not self.session.is_active and t_curr > self.session.unlock_time:
            # Ensure queue is flushed before destruction
            if not self.session.pending_events:
                self.session = None

        try:
            from logger import system_logger
            system_logger.info(
                f"[ClickPipeline] ID:{self.interaction_id} {self.name} {old_name} -> {new_name} "
                f"at {t_curr:.3f}s | Reason: {reason} | Acc:{self.confidence_accumulator:.2f}"
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
        
        if new_state in (ClickState.CLICK_DOWN, ClickState.HELD):
            self.is_pressed = True
        elif new_state in (ClickState.RELEASE, ClickState.COOLDOWN, ClickState.IDLE):
            self.is_pressed = False
            self.is_dragging = False
            if new_state == ClickState.IDLE:
                self.interaction_id = ""

    def process(self, click_score, confidence_history, t_curr, env_penalty=1.0, raw_x=0.0, raw_y=0.0, has_hand=True, config=None, palm_x=0.0, palm_y=0.0):
        if config and hasattr(config, "state"):
            self.threshold_on = config.state.get("pinch_sensitivity_on", 0.60)
            self.threshold_off = config.state.get("pinch_sensitivity_off", 0.30)
            self.HOLD_TIME_MS = config.state.get("hold_delay_ms", 350.0)
            self.DRAG_DIST_THRESHOLD = config.state.get("drag_distance", 0.06)
            self.COOLDOWN_MS = config.state.get("debounce_ms", 80.0)
            self.STABILIZATION_DELAY_S = config.state.get("stabilization_delay_ms", 40.0) / 1000.0
            
        avg_conf = sum(confidence_history) / len(confidence_history) if (confidence_history and len(confidence_history) > 0) else (1.0 if has_hand else 0.0)
        # Fused Dual-Confidence Model
        fused_conf = click_score * avg_conf if has_hand else 0.0
        elapsed_ms = (t_curr - self.state_enter_time) * 1000.0
        
        # Check active session lock expiry
        if self.session and not self.session.is_active and self.session.cursor_locked:
            if t_curr >= self.session.unlock_time:
                self.session.cursor_locked = False
                if not self.session.pending_events:
                    self.session = None

        if self.state == ClickState.IDLE:
            if has_hand and click_score > self.pre_engage_threshold:
                self.confidence_accumulator = 0.35
                self.pre_click_anchor_x = raw_x
                self.pre_click_anchor_y = raw_y
                self.locked_palm_x = palm_x
                self.locked_palm_y = palm_y
                self.pre_click_drift = 0.0
                self._change_state(ClickState.PINCH_STARTED, t_curr, "Geometry score > 0.40")
                
        elif self.state in (ClickState.PINCH_STARTED, ClickState.CONFIRMING):
            if self.state == ClickState.PINCH_STARTED:
                if not has_hand:
                    self._change_state(ClickState.IDLE, t_curr, "Hand tracking lost")
                elif click_score > self.threshold_on:
                    self.confidence_accumulator += 0.35
                    if self.confidence_accumulator >= 1.0:
                        self.press_start_time = t_curr
                        self.press_anchor_x = raw_x
                        self.press_anchor_y = raw_y
                        self._change_state(ClickState.CLICK_DOWN, t_curr, "Fused confidence >= 1.0")
                    else:
                        self._change_state(ClickState.CONFIRMING, t_curr, "Accumulating confidence")
                elif click_score < self.pre_engage_threshold:
                    self._change_state(ClickState.IDLE, t_curr, "REJECTED: CONFIDENCE_DECAY")

            elif self.state == ClickState.CONFIRMING:
                if not has_hand:
                    self._change_state(ClickState.IDLE, t_curr, "Hand tracking lost")
                elif click_score > self.threshold_on:
                    self.confidence_accumulator += 0.35
                    if self.confidence_accumulator >= 1.0:
                        self.press_start_time = t_curr
                        self.press_anchor_x = raw_x
                        self.press_anchor_y = raw_y
                        self._change_state(ClickState.CLICK_DOWN, t_curr, "Fused confidence confirmed")
                elif click_score < self.threshold_off:
                    self.confidence_accumulator = max(0.0, self.confidence_accumulator - 0.30)
                    if self.confidence_accumulator <= 0.0:
                        self._change_state(ClickState.IDLE, t_curr, "REJECTED: CONFIDENCE_DECAY")

        elif self.state == ClickState.CLICK_DOWN:
            dist_moved = math.sqrt((raw_x - self.press_anchor_x)**2 + (raw_y - self.press_anchor_y)**2)
            if not has_hand:
                self.lost_tracking_time = t_curr
                self._change_state(ClickState.LOST_TRACKING, t_curr, "Landmark drop during click")
            elif click_score < self.threshold_off:
                self._change_state(ClickState.RELEASE, t_curr, "Tap completed (< 350ms)")
            elif elapsed_ms >= self.HOLD_TIME_MS or dist_moved > self.DRAG_DIST_THRESHOLD:
                self.is_dragging = True
                self._change_state(ClickState.HELD, t_curr, f"Hold/Drag threshold met (elapsed={elapsed_ms:.0f}ms, dist={dist_moved:.3f})")

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
            time_since_hand = (t_curr - self.last_hand_time) * 1000.0
            if time_since_hand <= 300.0 and (self.is_dragging or self.scroll.is_active or self.zoom.is_active):
                # Extrapolate: prevent clicks from triggering due to 0 distance
                dist_i = 1.0
                dist_m = 1.0
                scroll_pose = False
                zoom_pose = False
                confidence = 0.0
            else:
                # Capture session before forcing IDLE so we can flush any emergency UP events
                expiring_session = self.left_click.session
                self.left_click._change_state(ClickState.IDLE, t_curr)
                self.left_click.is_pressed = False
                self.right_click._change_state(ClickState.IDLE, t_curr)
                self.right_click.is_pressed = False
                self.scroll.is_active = False
                self.scroll.state_enter_time = 0.0
                self.zoom.is_active = False
                self.zoom.state_enter_time = 0.0
                self.is_dragging = False
                return UserIntent(IntentType.NO_HAND, raw_x, raw_y, dist_i, confidence, t_curr, session=expiring_session)
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

        # Block right click if peace sign is active or engaging to prevent accidental clicks
        if scroll_pose or self.scroll.is_active:
            self.right_click._change_state(ClickState.IDLE, t_curr)
            self.right_click.is_pressed = False
            right_click_score = 0.0

        # Step 1: Feed all state machines (mirrors daemon.py processing order)
        self.left_click.process(left_click_score, conf_hist, t_curr, env_penalty, raw_x=raw_x, raw_y=raw_y, has_hand=has_hand, config=config, palm_x=palm_x, palm_y=palm_y)
        self.right_click.process(right_click_score, conf_hist, t_curr, env_penalty, raw_x=raw_x, raw_y=raw_y, has_hand=has_hand, config=config, palm_x=palm_x, palm_y=palm_y)
        
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

        # Consecutive fist frame debounce — only allow zoom_pose to propagate
        # after fist is held for _FIST_FRAMES_REQUIRED consecutive frames.
        if zoom_pose:
            self._fist_frame_count += 1
        else:
            self._fist_frame_count = 0
        debounced_zoom_pose = self._fist_frame_count >= self._FIST_FRAMES_REQUIRED

        self.scroll.process_pose(scroll_pose, confidence, t_curr)
        self.zoom.process_pose(debounced_zoom_pose, confidence, t_curr)
        
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
        return UserIntent(intent_type, raw_x, raw_y, dist_i, confidence, t_curr, session=self.left_click.session)


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
