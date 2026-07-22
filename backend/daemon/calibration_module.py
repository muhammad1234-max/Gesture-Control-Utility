import json
import time
import os
import math

class CalibrationModule:
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.stage = 0
        self.frames_collected = 0
        
        self.rest_x = []
        self.rest_y = []
        self.hand_scales = []
        
        self.left_pinch_dists = []
        self.left_pinch_speeds = []
        
        self.right_pinch_dists = []
        
        self.reach_x = []
        self.reach_y = []
        
        self.last_dist_l = 1.0
        self.last_t = 0.0
        
    def process(self, state, landmarks, index_x, index_y, dist_l, dist_r, hand_scale, t_curr):
        cmd = state.get("calibration_stage", 0)
        
        if cmd == 0:
            return # idle
            
        if cmd != self.stage:
            self.stage = cmd
            self.frames_collected = 0
            
        self.frames_collected += 1
        
        # Stage 1: Resting Pose
        if self.stage == 1:
            self.rest_x.append(index_x)
            self.rest_y.append(index_y)
            self.hand_scales.append(hand_scale)
            
        # Stage 2: Left Pinch Test (Measure speed/width)
        elif self.stage == 2:
            self.left_pinch_dists.append(dist_l)
            if self.last_t > 0:
                dt = t_curr - self.last_t
                if dt > 0:
                    speed = abs(dist_l - self.last_dist_l) / dt
                    self.left_pinch_speeds.append(speed)
            self.last_dist_l = dist_l
            self.last_t = t_curr
            
        # Stage 3: Right Pinch Test
        elif self.stage == 3:
            self.right_pinch_dists.append(dist_r)
            
        # Stage 4: Comfortable Reach
        elif self.stage == 4:
            self.reach_x.append(index_x)
            self.reach_y.append(index_y)
            
        # Stage 5: Finalize
        elif self.stage == 5 and self.frames_collected == 1:
            self.finalize_calibration(state)
            
    def finalize_calibration(self, state):
        import sys
        print("Finalizing calibration...", file=sys.stderr)
        try:
            # 1. Handedness (Approximate based on resting X relative to screen center)
            avg_rest_x = sum(self.rest_x)/len(self.rest_x) if self.rest_x else 0.5
            handedness = "Right" if avg_rest_x > 0.5 else "Left"
            
            # 2. Hand Scale
            final_scale = sum(self.hand_scales)/len(self.hand_scales) if self.hand_scales else 0.1
            
            # 3. Pinch Widths
            # Find the minimum 10% of distances to establish the "closed" baseline
            left_sorted = sorted(self.left_pinch_dists)
            right_sorted = sorted(self.right_pinch_dists)
            
            idx_l = max(1, int(len(left_sorted) * 0.1))
            idx_r = max(1, int(len(right_sorted) * 0.1))
            
            left_base = sum(left_sorted[:idx_l]) / idx_l if left_sorted else 0.04
            right_base = sum(right_sorted[:idx_r]) / idx_r if right_sorted else 0.04
            
            # 4. Speeds
            avg_speed = sum(self.left_pinch_speeds)/len(self.left_pinch_speeds) if self.left_pinch_speeds else 0.5
            
            # 5. Working Area (80% stretch mapping)
            if self.reach_x and self.reach_y:
                raw_min_x = min(self.reach_x)
                raw_max_x = max(self.reach_x)
                raw_min_y = min(self.reach_y)
                raw_max_y = max(self.reach_y)
                
                # Expand it slightly so 80% physical stretch = 100% screen
                x_center = (raw_min_x + raw_max_x) / 2.0
                y_center = (raw_min_y + raw_max_y) / 2.0
                x_range = (raw_max_x - raw_min_x) * 0.8
                y_range = (raw_max_y - raw_min_y) * 0.8
                
                wa = {
                    "minX": max(0.0, x_center - x_range/2),
                    "maxX": min(1.0, x_center + x_range/2),
                    "minY": max(0.0, y_center - y_range/2),
                    "maxY": min(1.0, y_center + y_range/2)
                }
            else:
                wa = {"minX": 0.2, "maxX": 0.8, "minY": 0.2, "maxY": 0.8}
                
            calib_data = {
                "handScale": final_scale,
                "handedness": handedness,
                "leftPinchThreshold": left_base + 0.02, # baseline + padding
                "rightPinchThreshold": right_base + 0.02,
                "pinchSpeed": avg_speed,
                "workingArea": wa
            }
            
            with open("calibration.json", "w") as f:
                json.dump(calib_data, f, indent=4)
                
            state["calibration"] = calib_data
            print(json.dumps({"event": "CALIBRATION_SAVED", "payload": calib_data}), flush=True)
            self.reset()
            
        except Exception as e:
            print(f"Error saving calibration: {e}", file=sys.stderr)
