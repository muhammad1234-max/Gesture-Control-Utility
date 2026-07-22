import subprocess
import time
import sys
import json
import os

def run_benchmark():
    print("--- PIPELINE LATENCY BENCHMARK (BASELINE) ---")
    
    daemon_path = os.path.join(os.path.dirname(__file__), 'backend', 'daemon', 'daemon.py')
    daemon_dir = os.path.dirname(daemon_path)
    
    proc = subprocess.Popen(
        [sys.executable, 'daemon.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=daemon_dir
    )

    t_engine_started = False
    
    # Wait for ENGINE_STARTED
    while not t_engine_started:
        line = proc.stdout.readline()
        if not line: break
        try:
            msg = json.loads(line)
            if msg.get("event") == "ENGINE_STARTED":
                t_engine_started = True
                proc.stdin.write(json.dumps({"action": "OPEN_CAMERA", "payload": {"camera_id": 0}}) + "\n")
                proc.stdin.write(json.dumps({"action": "START_TRACKING", "payload": {}}) + "\n")
                proc.stdin.flush()
        except Exception:
            pass

    metrics = []
    
    # Collect 100 frames
    print("Collecting 100 frames of telemetry...")
    while len(metrics) < 100:
        line = proc.stdout.readline()
        if not line: break
        try:
            msg = json.loads(line)
            if msg.get("event") == "TELEMETRY":
                m = msg["payload"]["metrics"]
                metrics.append(m)
        except Exception:
            pass

    # Shutdown
    try:
        proc.stdin.write("SHUTDOWN\n")
        proc.stdin.flush()
    except OSError:
        pass
    proc.wait(timeout=5)

    if not metrics:
        print("No telemetry gathered. Is camera connected?")
        return

    # Calculate Averages
    def avg(key): return sum(m.get(key, 0) for m in metrics) / len(metrics)
    
    print("\n--- Pipeline Timings (Avg over 100 frames) ---")
    print(f"Camera Capture:     {avg('t_cam_ms'):>6.2f} ms")
    print(f"MediaPipe Tracker:  {avg('t_tracker_ms'):>6.2f} ms")
    print(f"Reliability Engine: {avg('t_reliability_ms'):>6.2f} ms")
    print(f"Gesture Engine:     {avg('t_gesture_ms'):>6.2f} ms")
    print(f"Motion Engine:      {avg('t_motion_ms'):>6.2f} ms")
    print(f"Action Executor:    {avg('t_action_ms'):>6.2f} ms")
    print(f"Total Framework:    {avg('total_ms'):>6.2f} ms")
    print(f"Avg CPU %:          {avg('cpu'):>6.2f} %")
    print(f"Avg RAM MB:         {avg('ram_mb'):>6.2f} MB")

if __name__ == "__main__":
    run_benchmark()
