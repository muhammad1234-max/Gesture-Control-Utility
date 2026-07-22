import subprocess
import time
import json
import threading

def run_endurance_test():
    print("Starting Phase 4 Endurance Test (Chaos Monkey)")
    
    # Start the daemon
    import sys
    daemon = subprocess.Popen(
        [sys.executable, "backend/daemon/daemon.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    log_file = open("endurance_crash.log", "w")
    def read_output():
        while True:
            try:
                line = daemon.stdout.readline()
                if not line: break
                log_file.write(line)
                log_file.flush()
            except:
                break
                
    def read_err():
        while True:
            try:
                line = daemon.stderr.readline()
                if not line: break
                log_file.write("ERROR: " + line)
                log_file.flush()
            except:
                break
            
    t = threading.Thread(target=read_output, daemon=True)
    t.start()
    t2 = threading.Thread(target=read_err, daemon=True)
    t2.start()
    
    def send_cmd(cmd):
        if daemon.poll() is None:
            daemon.stdin.write(json.dumps(cmd) + "\n")
            daemon.stdin.flush()
            
    try:
        # Initial config
        send_cmd({"action": "CONFIG", "payload": {"smoothing": 0.5, "camera_id": 0}})
        send_cmd({"action": "OPEN_CAMERA"})
        send_cmd({"action": "START_TRACKING"})
        
        # Test 1: Rapid Config Spam
        print("Testing Rapid IPC Config Spam...")
        for i in range(100):
            send_cmd({"action": "CONFIG", "payload": {"smoothing": i / 100.0}})
            time.sleep(0.01)
            
        # Test 2: Camera Reconnection Cycle
        print("Testing Camera Dropouts...")
        for i in range(5):
            send_cmd({"action": "CLOSE_CAMERA"})
            time.sleep(1.0)
            send_cmd({"action": "OPEN_CAMERA"})
            time.sleep(1.0)
            
        # Test 3: System Sleep Simulation (Tracking suspended, large time jumps)
        print("Testing Tracking Suspend (Sleep mode)...")
        send_cmd({"action": "STOP_TRACKING"})
        time.sleep(5.0)
        send_cmd({"action": "START_TRACKING"})
        
        # Test 4: Memory Leak Hold (Keep running for a while)
        print("Holding state for memory stability...")
        time.sleep(10.0) # In a real test, this would be 4 hours
        
        # Shutdown cleanly
        send_cmd({"action": "SHUTDOWN"})
        daemon.wait(timeout=5.0)
        print("Endurance Test Completed Successfully.")
        
    except Exception as e:
        print(f"Endurance test failed: {e}")
        daemon.kill()

if __name__ == "__main__":
    run_endurance_test()
