import cv2
import sys
import json
import argparse
import socket
import struct
import time
import subprocess

def list_cameras():
    cameras = []
    try:
        # Attempt to get actual device names using Windows WMI
        output = subprocess.check_output('wmic path Win32_PnPEntity where "PNPClass=\'Image\' OR PNPClass=\'Camera\'" get Caption', shell=True).decode('utf-8', errors='ignore')
        lines = output.strip().split('\n')[1:]
        lines = [line.strip() for line in lines if line.strip()]
        
        # We also need to probe if they actually open in cv2
        for i, name in enumerate(lines):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                cameras.append({"id": str(i), "name": name})
                cap.release()
    except Exception as e:
        # Fallback probe
        for i in range(5):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                cameras.append({"id": str(i), "name": f"USB Camera {i}"})
                cap.release()
                
    print(json.dumps(cameras))
    sys.exit(0)

def capture(cam_id, port, width, height, fps):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect(('127.0.0.1', port))
    except Exception as e:
        print(f"Failed to connect to Node.js: {e}", file=sys.stderr)
        sys.exit(1)

    cap = cv2.VideoCapture(int(cam_id), cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"ERROR: Failed to open camera {cam_id}", file=sys.stderr)
        sock.close()
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    cap.set(cv2.CAP_PROP_FPS, fps)

    # Disable buffering for minimum latency
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    # Pixel Format mapping (1 = RGB24)
    PIX_FMT_RGB = 1

    print(f"SUCCESS: Camera {cam_id} streaming to port {port}", file=sys.stderr)

    while True:
        # time the capture loop
        t0 = time.time()
        ret, frame = cap.read()
        if not ret:
            print("ERROR: Camera disconnected or frame read failed.", file=sys.stderr)
            break
        
        # Convert BGR to RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        h, w, _ = frame.shape
        ts = time.time()
        data = frame.tobytes()
        size = len(data)
        
        # Header Protocol (Little Endian):
        # [Width: uint32] [Height: uint32] [Format: uint32] [Timestamp: float64] [Size: uint32]
        # 4 + 4 + 4 + 8 + 4 = 24 bytes
        header = struct.pack('<IIIdI', w, h, PIX_FMT_RGB, ts, size)
        
        try:
            sock.sendall(header + data)
        except Exception as e:
            # Node.js closed the socket
            break
            
        # Optional: throttle if cv2 runs faster than requested fps (some cameras ignore fps set)
        elapsed = time.time() - t0
        target_delay = (1.0 / fps) - elapsed
        if target_delay > 0.005:
            time.sleep(target_delay)

    cap.release()
    sock.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Raw Camera Capture Bridge")
    parser.add_argument("--list", action="store_true", help="List available cameras as JSON")
    parser.add_argument("--capture", type=int, help="Camera device index to capture from")
    parser.add_argument("--port", type=int, help="TCP port to stream binary frames to")
    parser.add_argument("--width", type=int, default=640, help="Target width")
    parser.add_argument("--height", type=int, default=480, help="Target height")
    parser.add_argument("--fps", type=int, default=30, help="Target FPS")
    
    args = parser.parse_args()
    
    if args.list:
        list_cameras()
    elif args.capture is not None and args.port is not None:
        capture(args.capture, args.port, args.width, args.height, args.fps)
    else:
        parser.print_help()
        sys.exit(1)
