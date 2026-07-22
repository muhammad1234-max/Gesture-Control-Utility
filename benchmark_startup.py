import subprocess
import time
import sys
import json
import os

def run_benchmark():
    print("--- STARTUP BENCHMARK (BASELINE) ---")
    
    daemon_path = os.path.join(os.path.dirname(__file__), 'backend', 'daemon', 'daemon.py')
    
    t_start = time.perf_counter()
    
    daemon_dir = os.path.dirname(daemon_path)
    
    proc = subprocess.Popen(
        [sys.executable, 'daemon.py'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=daemon_dir
    )

    t_first_output = None
    t_engine_started = None
    t_camera_opened = None
    
    # Wait for SUCCESS (Initial Python load)
    while True:
        line = proc.stdout.readline()
        if not line: break
        
        if "SUCCESS" in line and t_first_output is None:
            t_first_output = time.perf_counter()
            
        try:
            msg = json.loads(line)
            if msg.get("event") == "ENGINE_STARTED":
                t_engine_started = time.perf_counter()
                # Simulate frontend sending OPEN_CAMERA
                proc.stdin.write(json.dumps({"action": "OPEN_CAMERA", "payload": {"camera_id": 0}}) + "\n")
                proc.stdin.flush()
            elif msg.get("event") == "CAMERA_OPENED":
                t_camera_opened = time.perf_counter()
                break # We got all we need for startup
        except json.JSONDecodeError:
            pass

    # Shutdown
    try:
        proc.stdin.write("SHUTDOWN\n")
        proc.stdin.flush()
    except OSError:
        pass
        
    proc.wait(timeout=5)

    t_end = time.perf_counter()

    cold_startup = t_engine_started - t_start if t_engine_started else 0
    camera_startup = t_camera_opened - t_engine_started if t_camera_opened and t_engine_started else 0
    total_startup = t_camera_opened - t_start if t_camera_opened else 0

    print(f"Process Launch -> Python Init: {(t_first_output - t_start)*1000:.2f} ms")
    print(f"Python Init -> Engine Started (MediaPipe/Imports): {(t_engine_started - t_first_output)*1000:.2f} ms")
    print(f"Cold Startup Time (Process -> Engine Ready): {cold_startup*1000:.2f} ms")
    print(f"Camera Initialization Time: {camera_startup*1000:.2f} ms")
    print(f"Total Startup Time: {total_startup*1000:.2f} ms")

if __name__ == "__main__":
    run_benchmark()
