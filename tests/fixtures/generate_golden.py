import json
import math
import random
import os

def create_base_metadata(name, fps=30):
    return {
        "version": "1.0",
        "mediapipe_version": "0.10.x",
        "camera_fps": fps,
        "camera_resolution": [640, 480],
        "name": name,
        "config": {
            "smoothing": 0.5,
            "target_fps": fps,
            "prediction": 10.0
        },
        "frames": []
    }

def generate_landmarks(base_x, base_y, pinch_dist_l=1.0, pinch_dist_r=1.0, jitter=0.0):
    lm = [{"x": base_x, "y": base_y, "z": 0.0} for _ in range(21)]
    
    # Add random jitter
    for i in range(21):
        lm[i]["x"] += random.uniform(-jitter, jitter)
        lm[i]["y"] += random.uniform(-jitter, jitter)
        
    # Thumb tip = 4, Index tip = 8, Middle tip = 12
    lm[8]["x"] = lm[4]["x"] + pinch_dist_l
    lm[12]["x"] = lm[4]["x"] + pinch_dist_r
    
    return lm

def generate_idle(filename):
    data = create_base_metadata("idle_hand")
    for i in range(90): # 3 seconds at 30 fps
        data["frames"].append({
            "timestamp": i * (1000/30),
            "confidence": 0.99,
            "handedness": "Right",
            "landmarks": generate_landmarks(0.5, 0.5, pinch_dist_l=0.1, jitter=0.001)
        })
    with open(f"tests/fixtures/{filename}", "w") as f:
        json.dump(data, f)
        
def generate_click(filename):
    data = create_base_metadata("perfect_click")
    for i in range(90):
        pinch = 0.1
        if 30 <= i <= 40:
            pinch = 0.01 # Click for ~300ms
        data["frames"].append({
            "timestamp": i * (1000/30),
            "confidence": 0.99,
            "handedness": "Right",
            "landmarks": generate_landmarks(0.5, 0.5, pinch_dist_l=pinch, jitter=0.001)
        })
    with open(f"tests/fixtures/{filename}", "w") as f:
        json.dump(data, f)
        
def generate_drag(filename):
    data = create_base_metadata("drag_and_drop")
    x = 0.2
    for i in range(120): # 4 seconds
        pinch = 0.1
        if 20 <= i <= 100:
            pinch = 0.01 # Hold
            x += (0.8 - 0.2) / 80.0 # Move across screen
            
        data["frames"].append({
            "timestamp": i * (1000/30),
            "confidence": 0.99,
            "handedness": "Right",
            "landmarks": generate_landmarks(x, 0.5, pinch_dist_l=pinch, jitter=0.001)
        })
    with open(f"tests/fixtures/{filename}", "w") as f:
        json.dump(data, f)
        
def generate_stress(filename):
    data = create_base_metadata("poor_lighting_shaky", fps=15)
    for i in range(60): # 4 seconds at 15 fps
        # Random confidence drops simulating poor lighting
        conf = 0.95 if random.random() > 0.1 else 0.4 
        data["frames"].append({
            "timestamp": i * (1000/15),
            "confidence": conf,
            "handedness": "Right",
            "landmarks": generate_landmarks(0.5, 0.5, pinch_dist_l=0.1, jitter=0.02) # Heavy jitter
        })
    with open(f"tests/fixtures/{filename}", "w") as f:
        json.dump(data, f)
        
if __name__ == "__main__":
    generate_idle("idle_hand.json")
    generate_click("perfect_click.json")
    generate_drag("drag_and_drop.json")
    generate_stress("poor_lighting.json")
    print("Generated synthetic golden references.")
