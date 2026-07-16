import sys
import struct
import time
import os
import urllib.request
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Capture true stdout to write binary output directly, bypassing any text wrappers
out_fd = sys.stdout.buffer
# Redirect all print() statements to stderr so they don't corrupt the binary stdout stream
sys.stdout = sys.stderr

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def download_model(model_path):
    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    if not os.path.exists(model_path):
        eprint(f"Model not found at {model_path}. Downloading...")
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        urllib.request.urlretrieve(url, model_path)
        eprint("Download complete.")

def run():
    model_path = os.path.join(os.getcwd(), 'models', 'hand_landmarker.task')
    download_model(model_path)

    eprint("Loading MediaPipe HandLandmarker...")
    base_options = python.BaseOptions(
        model_asset_path=model_path, 
        delegate=python.BaseOptions.Delegate.CPU
    )
    
    # We use IMAGE mode because we are manually feeding discrete frames (dropped frames handled by Node)
    # Actually, VIDEO mode requires timestamps. We can use IMAGE mode for stateless inference, 
    # or VIDEO mode passing the timestamp. VIDEO mode is better for tracking stability.
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    landmarker = vision.HandLandmarker.create_from_options(options)
    eprint("SUCCESS: Python MediaPipe Tracker Ready.")

    while True:
        # Read Header: [Width: 4] [Height: 4] [PayloadSize: 4]
        header = sys.stdin.buffer.read(12)
        if not header or len(header) < 12:
            break
        
        width, height, payload_size = struct.unpack('<III', header)
        
        # Read Payload (RGB Bytes)
        # To avoid blocking indefinitely on partial writes, read exactly payload_size
        frame_bytes = sys.stdin.buffer.read(payload_size)
        if len(frame_bytes) < payload_size:
            break
            
        t0 = time.time()
        
        # Convert bytes to numpy array (RGB)
        np_arr = np.frombuffer(frame_bytes, dtype=np.uint8).reshape((height, width, 3))
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np_arr)
        
        # We need a monotonic timestamp in ms for VIDEO mode
        ts_ms = int(time.time() * 1000)
        
        # Inference
        result = landmarker.detect_for_video(mp_image, ts_ms)
        
        inference_time_ms = (time.time() - t0) * 1000.0
        
        # Pack results into Binary Protocol
        # Output Header: [Timestamp: 8 float] [HandCount: 4 int] [InferenceTimeMs: 4 float]
        hand_count = len(result.hand_landmarks) if result.hand_landmarks else 0
        
        # time.time() returns float seconds
        out_header = struct.pack('<dIf', time.time(), hand_count, inference_time_ms)
        out_fd.write(out_header)
        
        for i in range(hand_count):
            # Handedness (Left/Right)
            # category_name is usually "Left" or "Right"
            # In MediaPipe mirrored, Right hand in image is "Left". 
            # We will just pass the category index (0 or 1) and score
            handedness = result.handedness[i][0]
            # Convert name to 0=Left, 1=Right
            h_idx = 0 if handedness.category_name == 'Left' else 1
            h_score = handedness.score
            
            # [HandednessIdx: 4 uint32] [Score: 4 float32]
            hand_header = struct.pack('<If', h_idx, h_score)
            out_fd.write(hand_header)
            
            # Landmarks: 21 * (x, y, z, visibility, presence) = 21 * 5 = 105 floats
            landmarks = result.hand_landmarks[i]
            lm_list = []
            for lm in landmarks:
                # mediapipe python sometimes lacks visibility if not enabled, fallback to 1.0
                vis = getattr(lm, 'visibility', 1.0)
                pres = getattr(lm, 'presence', 1.0)
                lm_list.extend([lm.x, lm.y, lm.z, vis, pres])
            
            lm_bytes = struct.pack(f'<{len(lm_list)}f', *lm_list)
            out_fd.write(lm_bytes)
            
        out_fd.flush()

if __name__ == '__main__':
    try:
        run()
    except Exception as e:
        eprint(f"ERROR: {e}")
        sys.exit(1)
