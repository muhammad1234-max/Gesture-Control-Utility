import math
from pipeline_types import IntentType, CommandType, ActionCommand
from logger import system_logger
from diagnostic_buffer import diag_buffer

class MotionEngine:
    def __init__(self, get_screen_size_func):
        self.deadzone_px = 2.5
        self.min_cutoff = 0.01
        self.beta = 0.002
        self.dcutoff = 1.0
        self.pred_threshold = 15.0
        self.vel_cap = 3000.0
        
        self.smoothed_x = None
        self.smoothed_y = None
        self.last_x = None
        self.last_y = None
        self.dx_ema = 0.0
        self.dy_ema = 0.0
        self.is_stationary = True
        
        self.is_engaging = False
        self.midas_active_until = 0.0
        self.was_dragging = False
        self.drop_stabilize_until = 0.0
        
        self.get_screen_size = get_screen_size_func

    def get_alpha(self, cutoff, dt):
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def process(self, intent, config, env_penalty, dt=0.033) -> ActionCommand:
        if intent.type in [IntentType.NO_HAND, IntentType.TRACKING_LOST, IntentType.IDLE]:
            self.dx_ema = 0.0
            self.dy_ema = 0.0
            self.is_stationary = True
            return ActionCommand(CommandType.NONE)
            
        if intent.type == IntentType.LEFT_CLICK:
            return ActionCommand(CommandType.LEFT_DOWN)
            
        if intent.type == IntentType.RIGHT_CLICK:
            return ActionCommand(CommandType.RIGHT_CLICK)

        if intent.type in [IntentType.SCROLL, IntentType.ZOOM]:
            is_zoom = (intent.type == IntentType.ZOOM)
            current_y = intent.raw_y
            
            if not hasattr(self, 'scroll_active'):
                self.scroll_active = False
                self.scroll_anchor = 0.5
                
            if not self.scroll_active:
                self.scroll_active = True
                self.scroll_anchor = current_y
            else:
                self.scroll_anchor = 0.992 * self.scroll_anchor + 0.008 * current_y
                
            delta = -(current_y - self.scroll_anchor)
            deadzone = 0.04
            sensitivity = 1.2 if is_zoom else 1.8
            
            if abs(delta) < deadzone:
                vel = 0.0
            else:
                effective_delta = (delta - math.copysign(deadzone, delta))
                vel = math.tanh(effective_delta * sensitivity * 6.0) * 120.0 * sensitivity

            return ActionCommand(
                CommandType.ZOOM if is_zoom else CommandType.SCROLL, 
                velocity=vel
            )
            
        self.scroll_active = False

        # Handle MOVE_CURSOR and DRAG using 1-Euro Smoothing
        calib = config.state.get("calibration", {})
        wa = calib.get("workingArea", {})
        
        wa_minX = wa.get("minX", 0.0)
        wa_maxX = wa.get("maxX", 1.0)
        wa_minY = wa.get("minY", 0.0)
        wa_maxY = wa.get("maxY", 1.0)
        
        # Enforce minimum boundaries (prevent ZeroDivisionError and extremely small workspaces)
        if (wa_maxX - wa_minX) < 0.1:
            wa_minX, wa_maxX = 0.0, 1.0
        if (wa_maxY - wa_minY) < 0.1:
            wa_minY, wa_maxY = 0.0, 1.0

            
        system_logger.debug(f"[Config Audit] Active Workspace: minX={wa_minX}, maxX={wa_maxX}, minY={wa_minY}, maxY={wa_maxY}")
        
        nx = max(wa_minX, min(intent.raw_x, wa_maxX))
        ny = max(wa_minY, min(intent.raw_y, wa_maxY))
        
        norm_x = (nx - wa_minX) / (wa_maxX - wa_minX)
        norm_y = (ny - wa_minY) / (wa_maxY - wa_minY)
        
        sensitivity = config.state.get("sensitivity", 1.0)
        user_smoothing = config.state.get("smoothing", 0.5)
        
        screen_w, screen_h = self.get_screen_size()
        raw_x_px = norm_x * screen_w
        raw_y_px = norm_y * screen_h
        
        if config.state.get("raw_motion_mode", False):
            return ActionCommand(CommandType.MOVE_CURSOR, max(0, min(raw_x_px, screen_w - 1)), max(0, min(raw_y_px, screen_h - 1)))
        
        t_curr = intent.timestamp
        if intent.is_engaging:
            if not self.is_engaging:
                self.is_engaging = True
                self.midas_active_until = t_curr + 0.150
        else:
            self.is_engaging = False

        if intent.type == IntentType.DRAG:
            self.was_dragging = True
        elif self.was_dragging and intent.type != IntentType.DRAG:
            self.was_dragging = False
            if intent.type == IntentType.MOVE_CURSOR:
                self.drop_stabilize_until = t_curr + 0.200

        # Midas Touch & Drop Stabilization Freeze
        if self.smoothed_x is not None:
            if t_curr < self.midas_active_until or t_curr < self.drop_stabilize_until:
                raw_x_px = self.smoothed_x
                raw_y_px = self.smoothed_y

        # Update 1-Euro filter
        if self.smoothed_x is None:
            self.smoothed_x, self.smoothed_y = raw_x_px, raw_y_px
            self.last_x, self.last_y = raw_x_px, raw_y_px
            
        dx = (raw_x_px - self.last_x) / dt
        dy = (raw_y_px - self.last_y) / dt
        self.last_x, self.last_y = raw_x_px, raw_y_px

        alpha_d = self.get_alpha(self.dcutoff, dt)
        self.dx_ema = alpha_d * dx + (1 - alpha_d) * self.dx_ema
        self.dy_ema = alpha_d * dy + (1 - alpha_d) * self.dy_ema
        vel = math.sqrt(self.dx_ema**2 + self.dy_ema**2)

        cutoff = self.min_cutoff + self.beta * vel
        alpha = self.get_alpha(cutoff, dt)

        user_alpha = min(max(alpha * (user_smoothing * 2.0), 0.01), 1.0)
        blended_alpha = user_alpha * (intent.confidence ** 2) * env_penalty

        target_x = blended_alpha * raw_x_px + (1 - blended_alpha) * self.smoothed_x
        target_y = blended_alpha * raw_y_px + (1 - blended_alpha) * self.smoothed_y

        dist_px = math.sqrt((target_x - self.smoothed_x)**2 + (target_y - self.smoothed_y)**2)
        
        reason_not_moving = ""
        if dist_px >= self.deadzone_px and vel >= self.pred_threshold:
            self.smoothed_x = target_x
            self.smoothed_y = target_y
            self.is_stationary = False
        else:
            if vel < self.pred_threshold:
                reason_not_moving = "BELOW_VELOCITY_THRESHOLD"
            else:
                reason_not_moving = "BELOW_DEADZONE"
            self.is_stationary = True

        if self.is_stationary:
            pred_x = self.smoothed_x
            pred_y = self.smoothed_y
        else:
            vel_clamped = min(self.vel_cap, vel)
            # Simple adaptive prediction
            if vel_clamped < 100: pred_sec = 0.0
            elif vel_clamped < 500: pred_sec = 0.008
            elif vel_clamped < 1500: pred_sec = 0.015
            else: pred_sec = 0.020
            
            pred_sec *= env_penalty
            pred_x = self.smoothed_x + (self.dx_ema * pred_sec)
            pred_y = self.smoothed_y + (self.dy_ema * pred_sec)
            
        pred_x = max(0, min(pred_x, screen_w - 1))
        pred_y = max(0, min(pred_y, screen_h - 1))
        
        # Instrumentation output as requested by user
        diag_buffer.append("MotionEngine", "FRAME_TRACE", {
            "raw": [intent.raw_x, intent.raw_y],
            "workspace": [wa_minX, wa_maxX, wa_minY, wa_maxY],
            "clamped": [nx, ny],
            "normalized": [norm_x, norm_y],
            "smoothed": [pred_x, pred_y],
            "sent": [pred_x, pred_y] if not self.is_stationary else None,
            "blocked_reason": reason_not_moving if self.is_stationary else "NONE"
        })
        

        # Output Command
        if intent.type == IntentType.DRAG:
            return ActionCommand(CommandType.DRAG, pred_x, pred_y)
        
        return ActionCommand(CommandType.MOVE_CURSOR, pred_x, pred_y)
