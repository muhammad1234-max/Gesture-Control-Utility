import cv2
import time
import numpy as np

class EnvironmentMonitor:
    def __init__(self):
        self.brightness_history = []
        self.frame_times = []
        
        self.fps = 0.0
        self.frame_stability = 1.0
        self.average_brightness = 128.0
        self.exposure_variance = 0.0
        
        self.history_size = 30 # 1 second at 30fps
        self.last_t = time.perf_counter()
        
    def process_frame(self, frame, t_curr):
        # 1. FPS and Frame Stability
        dt = t_curr - self.last_t
        self.last_t = t_curr
        
        self.frame_times.append(dt)
        if len(self.frame_times) > self.history_size:
            self.frame_times.pop(0)
            
        if len(self.frame_times) > 1:
            mean_dt = sum(self.frame_times) / len(self.frame_times)
            self.fps = 1.0 / mean_dt if mean_dt > 0 else 0
            
            # Variance in frame times = instability
            variance = sum((t - mean_dt)**2 for t in self.frame_times) / len(self.frame_times)
            # Normalized stability (0 to 1), where 0 is high variance (bad) and 1 is low variance (good)
            # Assuming expected variance of 0.001 (about 31ms std dev) is completely unstable
            self.frame_stability = max(0.0, 1.0 - (variance * 1000.0))
            
        # 2. Image Brightness & Exposure
        # Calculate mean brightness (fast grayscale conversion via mean of channels or just V channel of HSV, 
        # but cv2.mean is fastest)
        mean_bgr = cv2.mean(frame)
        brightness = (mean_bgr[0] + mean_bgr[1] + mean_bgr[2]) / 3.0
        
        self.brightness_history.append(brightness)
        if len(self.brightness_history) > self.history_size:
            self.brightness_history.pop(0)
            
        self.average_brightness = sum(self.brightness_history) / len(self.brightness_history)
        
        if len(self.brightness_history) > 1:
            # High variance in brightness means camera is hunting for exposure
            exp_var = sum((b - self.average_brightness)**2 for b in self.brightness_history) / len(self.brightness_history)
            self.exposure_variance = exp_var
            
    def get_environmental_penalty(self):
        # Returns a multiplier from 1.0 (perfect) to 0.0 (terrible)
        
        # Dim lighting penalty (< 60 brightness)
        light_penalty = max(0.0, min(1.0, self.average_brightness / 80.0))
        
        # Exposure hunting penalty (> 20 variance)
        exp_penalty = max(0.0, min(1.0, 1.0 - (self.exposure_variance / 50.0)))
        
        # FPS stability penalty
        stab_penalty = self.frame_stability
        
        # Total combined penalty (weighted)
        return (light_penalty * 0.5) + (exp_penalty * 0.2) + (stab_penalty * 0.3)
