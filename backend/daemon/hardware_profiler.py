import time
import math

class HardwareProfiler:
    def __init__(self):
        self.inference_times = []
        self.injection_delays = []
        
    def profile_inference(self, duration_sec=2.0):
        # We do this passively in daemon.py by passing metrics to it for the first N seconds
        pass
        
    def get_profile(self, mean_inference_ms, mean_injection_ms):
        if mean_inference_ms > 20.0 or mean_injection_ms > 5.0:
            return "Low-End"
        elif mean_inference_ms > 10.0:
            return "Balanced"
        else:
            return "High-Performance"
            
    def apply_profile(self, state, profile_name):
        if profile_name == "Low-End":
            state["smoothing"] = 0.8
            state["prediction"] = 0.0 # disable prediction to save cpu
            state["target_fps"] = 20
        elif profile_name == "Balanced":
            state["smoothing"] = 0.5
            state["target_fps"] = 60
        else:
            state["smoothing"] = 0.2
            state["target_fps"] = 150
            
        import sys
        print(f"Applied Hardware Profile: {profile_name}", file=sys.stderr)
