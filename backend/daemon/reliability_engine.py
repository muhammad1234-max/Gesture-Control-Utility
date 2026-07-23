import math
from collections import deque

class ReliabilityFlags:
    NONE = "NONE"
    LOW_LIGHT = "LOW_LIGHT"
    HIGH_JITTER = "HIGH_JITTER"
    HIGH_VELOCITY = "HIGH_VELOCITY"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    TRACKING_LOST = "TRACKING_LOST"
    PARTIAL_OCCLUSION = "PARTIAL_OCCLUSION"
    ANATOMICAL_ANOMALY = "ANATOMICAL_ANOMALY"

class ValidatedTrackingData:
    def __init__(self, raw_data):
        self.has_hand = raw_data.get("has_hand", False)
        self.tracking_state = raw_data.get("tracking_state", "SEARCHING")
        self.raw_x = raw_data.get("raw_x", 0.0)
        self.raw_y = raw_data.get("raw_y", 0.0)
        self.dist_i = raw_data.get("dist_i", 0.0)
        self.dist_m = raw_data.get("dist_m", 0.0)
        self.hand_scale = raw_data.get("hand_scale", 0.1)
        self.confidence = raw_data.get("confidence", 0.0)
        self.t_curr = raw_data.get("t_curr", 0.0)
        self.zoom_pose = raw_data.get("zoom_pose", False)
        self.scroll_pose = raw_data.get("scroll_pose", False)
        self.env_penalty = raw_data.get("env_penalty", 0.0)
        self.landmarks = raw_data.get("landmarks", [])
        
        self.frame_quality = 0.0
        self.reliability_score = 0.0
        self.flags = []
        self.invalidated_fields = []
        self.grace_period_active = False
        self.rejected_frames = 0

    def to_dict(self):
        return {
            "has_hand": self.has_hand,
            "tracking_state": self.tracking_state,
            "raw_x": self.raw_x,
            "raw_y": self.raw_y,
            "dist_i": self.dist_i,
            "dist_m": self.dist_m,
            "hand_scale": self.hand_scale,
            "confidence": self.confidence,
            "t_curr": self.t_curr,
            "zoom_pose": self.zoom_pose,
            "scroll_pose": self.scroll_pose,
            "env_penalty": self.env_penalty,
            "landmarks": self.landmarks,
            "frame_quality": self.frame_quality,
            "reliability_score": self.reliability_score,
            "reliability_flags": self.flags,
            "invalidated_fields": self.invalidated_fields,
            "grace_period_active": self.grace_period_active,
            "rejected_frames": self.rejected_frames
        }

class ReliabilityEngine:
    def __init__(self):
        self.history_size = 10
        self.history = deque(maxlen=self.history_size)
        
        self.last_valid_x = 0.0
        self.last_valid_y = 0.0
        self.last_valid_dist_i = 0.0
        self.last_valid_dist_m = 0.0
        self.last_valid_scale = 0.1
        
        self.lost_time = 0.0
        self.grace_period_ms = 300.0
        self.tracking_active = False
        
        self.velocity_history = deque(maxlen=5)
        self.rejected_frames_count = 0

    def _dist(self, p1, p2):
        if isinstance(p1, dict) and isinstance(p2, dict):
            return math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2)
        return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

    def process(self, raw_data, dt):
        out = ValidatedTrackingData(raw_data)
        
        has_hand = out.has_hand
        mp_confidence = out.confidence
        landmarks = out.landmarks
        
        flags = []
        invalidated = []
        
        # 1. Hysteresis, Grace Period & DEGRADED_TRACKING
        if has_hand:
            if not self.tracking_active and mp_confidence > 0.65:
                self.tracking_active = True
            elif self.tracking_active and mp_confidence < 0.55:
                flags.append(ReliabilityFlags.LOW_CONFIDENCE)
                
            self.lost_time = 0.0
            self.rejected_frames_count = 0
        else:
            if self.tracking_active:
                self.lost_time += dt * 1000.0
                if self.lost_time > self.grace_period_ms:
                    self.tracking_active = False
                    self.rejected_frames_count += 1
                else:
                    out.has_hand = True
                    out.tracking_state = "DEGRADED_TRACKING"
                    flags.append(ReliabilityFlags.TRACKING_LOST)
                    self.rejected_frames_count += 1
            else:
                self.rejected_frames_count += 1
        
        if self.tracking_active and has_hand:
            out.tracking_state = "TRACKING"
        elif self.tracking_active and not has_hand:
            out.tracking_state = "DEGRADED_TRACKING"
        else:
            out.tracking_state = "NO_HAND"
            out.has_hand = False
            
        out.grace_period_active = (self.lost_time > 0.0 and self.lost_time <= self.grace_period_ms and self.tracking_active)
        out.rejected_frames = self.rejected_frames_count
            
        # 2. Prediction Error & Landmark Consistency
        anatomical_anomaly = False
        if has_hand and landmarks and len(landmarks) >= 21:
            wrist = landmarks[0]
            mcp = landmarks[9]
            current_scale = self._dist(wrist, mcp)
            if self.history:
                avg_scale = sum(h["scale"] for h in self.history) / len(self.history)
                if avg_scale > 0 and (current_scale > avg_scale * 1.5 or current_scale < avg_scale * 0.5):
                    anatomical_anomaly = True
                    flags.append(ReliabilityFlags.ANATOMICAL_ANOMALY)
                    
        # 3. Adaptive Velocity Plausibility (Partial Invalidation)
        if has_hand and self.history and out.tracking_state != "DEGRADED_TRACKING":
            dx = out.raw_x - self.last_valid_x
            dy = out.raw_y - self.last_valid_y
            v = math.sqrt(dx*dx + dy*dy) / max(dt, 0.001)
            
            avg_v = sum(self.velocity_history) / len(self.velocity_history) if self.velocity_history else v
            
            # Rejection boundary based on historical velocity
            max_allowed_v = max(avg_v * 10.0, 5.0)
            
            if len(self.velocity_history) >= 3 and v > max_allowed_v:
                flags.append(ReliabilityFlags.HIGH_VELOCITY)
                # DO NOT FREEZE cursor coordinates, just flag the event
                v = avg_v 
            
            self.velocity_history.append(v)
            
        # 4. Fused Reliability Score
        reliability = 100.0
        if anatomical_anomaly: reliability -= 30.0
        if ReliabilityFlags.HIGH_VELOCITY in flags: reliability -= 20.0
        if ReliabilityFlags.LOW_CONFIDENCE in flags: reliability -= 15.0
        if ReliabilityFlags.TRACKING_LOST in flags: reliability -= 40.0
        
        reliability -= (out.env_penalty * 20.0)
        reliability = max(0.0, min(100.0, reliability))
        out.reliability_score = reliability
        
        if self.history:
            past_qualities = [h["quality"] for h in self.history]
            out.frame_quality = (sum(past_qualities) + reliability) / (len(past_qualities) + 1)
        else:
            out.frame_quality = reliability
            
        # 5. Save Valid Data State
        if not out.has_hand or out.tracking_state == "DEGRADED_TRACKING":
            out.raw_x = self.last_valid_x
            out.raw_y = self.last_valid_y
            out.dist_i = self.last_valid_dist_i
            out.dist_m = self.last_valid_dist_m
            out.hand_scale = self.last_valid_scale
        else:
            if "raw_x" not in invalidated:
                self.last_valid_x = out.raw_x
                self.last_valid_y = out.raw_y
            self.last_valid_dist_i = out.dist_i
            self.last_valid_dist_m = out.dist_m
            if not anatomical_anomaly and has_hand and landmarks:
                self.last_valid_scale = self._dist(landmarks[0], landmarks[9])

        if out.has_hand:
            self.history.append({
                "x": out.raw_x,
                "y": out.raw_y,
                "quality": out.frame_quality,
                "scale": self.last_valid_scale
            })
            
        out.flags = flags
        out.invalidated_fields = invalidated
        
        return out
