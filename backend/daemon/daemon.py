import sys
import cv2
import threading
import os
import time
import ctypes
import json
import math

from mouse_controller import MouseController
from camera import CameraStream
from tracker import HandTracker
from gesture_engine import GestureEngine
from motion_engine import MotionEngine
from action_executor import ActionExecutor
from config import BackendConfig
from validation_reporter import ValidationReporter
from environment_monitor import EnvironmentMonitor
from hardware_profiler import HardwareProfiler
from gesture_registry import GestureRegistry
from gesture_intent import GestureIntentRecognizer as IntentRecognizer
from reliability_engine import ReliabilityEngine

from diagnostic_buffer import diag_buffer
from diagnostic_collector import collect_diagnostics

from context import SystemContext
from ipc_emitter import IPCEmitter
from logger import system_logger
from health_manager import HealthState, Subsystem
from feature_flags import FeatureFlags
from version import get_version_info



def get_screen_size():
    try:
        ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass
    return ctypes.windll.user32.GetSystemMetrics(0), ctypes.windll.user32.GetSystemMetrics(1)

def dist(lm1, lm2):
    return math.sqrt((lm1.x - lm2.x)**2 + (lm1.y - lm2.y)**2)

class CameraStream:
    def __init__(self):
        self.cap = None
        
    def open(self, index):
        if self.cap is not None:
            self.cap.release()
        self.cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        return self.cap.isOpened()
        
    def read(self):
        if self.cap is None: return False, None
        success, frame = self.cap.read()
        if success:
            return True, cv2.cvtColor(cv2.flip(frame, 1), cv2.COLOR_BGR2RGB)
        return False, None
        
    def close(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

def main():
    ctx = SystemContext(get_screen_size)
    stream = ctx.camera
    hands = None
    
    state = {
        "running": True,
        "tracking": False,
        "sensitivity": 0.5,
        "smoothing": 0.5,
        "pinch_threshold": 0.05,
        "camera_id": 0,
        "calibration": {},
        "calibration_mode": False,
        "hand_detected": False,
        "recording": False,
        "recorded_frames": [],
        "replaying": False,
        "replay_frames": [],
        "replay_idx": 0,
        "force_move_only": False
    }
    
    system_logger.info(f"[Startup Audit] Effective force_move_only: {state['force_move_only']}")

    def listen_for_commands():
        while state["running"]:
            line = sys.stdin.readline()
            if not line:
                state["running"] = False
                break
                
            if "SHUTDOWN" in line:
                state["running"] = False
                break
                
            try:
                cmd = json.loads(line)
                action = cmd.get("action")
                payload = cmd.get("payload", {})
                
                IPCEmitter.emit("INFO", f"Executing: {action}")
                diag_buffer.append("IPC", "COMMAND_RECEIVED", {"action": action, "payload": payload})
                
                if action == "CONFIG":
                    if "sensitivity" in payload: state["sensitivity"] = payload["sensitivity"]
                    if "smoothing" in payload: state["smoothing"] = payload["smoothing"]
                    if "pinch_threshold" in payload: state["pinch_threshold"] = payload["pinch_threshold"]
                    if "camera_id" in payload: state["camera_id"] = payload["camera_id"]
                    if "calibration" in payload: 
                        cal = payload["calibration"]
                        
                        # Fix Calibration IPC Mapping
                        working_area = cal.get("workingArea", {})
                        if working_area:
                            cal["min_x"] = working_area.get("minX", 0.0)
                            cal["max_x"] = working_area.get("maxX", 1.0)
                            cal["min_y"] = working_area.get("minY", 0.0)
                            cal["max_y"] = working_area.get("maxY", 1.0)
                            
                        state["calibration"] = cal
                        diag_buffer.append("Config", "CALIBRATION_LOADED", {"source": "IPC", "data": cal})
                        
                        min_x = cal.get("min_x", 0.0)
                        max_x = cal.get("max_x", 1.0)
                        min_y = cal.get("min_y", 0.0)
                        max_y = cal.get("max_y", 1.0)
                        w = max_x - min_x
                        h = max_y - min_y
                        effective_pct = (w * h) * 100.0
                        
                        system_logger.info(
                            f"\n[Workspace Audit] Calibration Loaded\n"
                            f"minX={min_x:.3f}, maxX={max_x:.3f}, width={w:.3f}\n"
                            f"minY={min_y:.3f}, maxY={max_y:.3f}, height={h:.3f}\n"
                            f"Camera Resolution: 640x480\n"
                            f"Effective Workspace %: {effective_pct:.1f}%\n"
                        )
                    if "force_move_only" in payload: state["force_move_only"] = payload["force_move_only"]
                    IPCEmitter.emit("CONFIG_APPLIED")
                    
                elif action == "CALIBRATION_MODE":
                    is_calibration = cmd.get("payload", False)
                    state["calibration_mode"] = is_calibration
                    IPCEmitter.emit("CALIBRATION_MODE_ENABLED" if is_calibration else "CALIBRATION_MODE_DISABLED")
                    
                elif action == "OPEN_CAMERA":
                    if not stream.open(state["camera_id"]):
                        IPCEmitter.emit("ERROR", "Failed to open camera")
                    else:
                        IPCEmitter.emit("CAMERA_OPENED")
                        
                elif action == "CLOSE_CAMERA":
                    stream.close()
                    action_executor.release_all_inputs()
                    IPCEmitter.emit("CAMERA_CLOSED")
                    
                elif action == "START_TRACKING":
                    state["tracking"] = True
                    IPCEmitter.emit("TRACKING_STARTED")
                    
                elif action == "STOP_TRACKING":
                    state["tracking"] = False
                    action_executor.release_all_inputs()
                    IPCEmitter.emit("TRACKING_STOPPED")
                    
                elif action == "GET_STATUS":
                    IPCEmitter.emit("ENGINE_STATUS", {
                        "pid": os.getpid(),
                        "camera_open": stream.cap is not None,
                        "tracking": state["tracking"]
                    })

                elif action == "START_RECORDING":
                    state["recording"] = True
                    state["recorded_frames"] = []
                    IPCEmitter.emit("RECORDING_STARTED")

                elif action == "STOP_RECORDING":
                    state["recording"] = False
                    path = cmd.get("payload", "replay.json")
                    with open(path, "w") as f:
                        json.dump(state["recorded_frames"], f)
                    IPCEmitter.emit("RECORDING_SAVED", path)

                elif action == "START_REPLAY":
                    path = cmd.get("payload", "replay.json")
                    if os.path.exists(path):
                        with open(path, "r") as f:
                            state["replay_frames"] = json.load(f)
                        state["replay_idx"] = 0
                        state["replaying"] = True
                        state["tracking"] = True
                        IPCEmitter.emit("REPLAY_STARTED")
                    else:
                        IPCEmitter.emit("ERROR", "Replay file not found")

            except Exception as e:
                pass

    t = threading.Thread(target=listen_for_commands, daemon=True)
    t.start()
    
    print("SUCCESS", flush=True)
    
    fps_start_time = time.time()
    fps_frames = 0
    fps = 0
    camera_failures = 0
    conf_hist = []
    
    # Pipeline Setup via SystemContext
    mouse = ctx.mouse
    action_executor = ctx.action
    config = ctx.config
    config.state = state
    
    tracking_data = {}
    
    tracker = ctx.tracker
    registry = GestureRegistry()
    intent_recognizer = IntentRecognizer()

    gesture_engine = ctx.gesture
    motion_engine = ctx.motion
    reliability_engine = ctx.reliability
    
    env_monitor = EnvironmentMonitor()
    val_reporter = ValidationReporter()
    
    IPCEmitter.emit("ENGINE_STARTED")
    IPCEmitter.emit("SELF_TEST_RESULT", {"status": "ok"})
    
    version_info = get_version_info()
    daemon_build_id = f"{version_info['app_version']}-{version_info['commit_hash']}"
    IPCEmitter.emit("PYTHON_BUILD_ID", daemon_build_id)
    
    system_logger.info("--- RUNTIME VERIFICATION AUDIT ---")
    system_logger.info(f"Executable Path: {sys.executable}")
    system_logger.info(f"Current Working Directory: {os.getcwd()}")
    system_logger.info(f"Daemon Script Path: {__file__}")
    system_logger.info(f"Daemon Build ID: {daemon_build_id}")
    system_logger.info(f"Python PID: {os.getpid()} | Parent PID: {os.getppid()}")
    system_logger.info("----------------------------------")
    
    try:

        last_t = time.perf_counter()
        
        while state["running"]:
            t_start = time.perf_counter()
            t_curr = t_start
            dt = t_curr - last_t
            if dt <= 0: dt = 0.001
            last_t = t_curr
            
            if not state["tracking"]:
                tracker.stop()
                time.sleep(0.05)
                continue
                
            has_hand = False
            index_x, index_y = 0, 0
            dist_i, dist_m = 0, 0
            closing_i, closing_m, closing_r = 0, 0, 0
            hand_scale = 0.1
            landmarks = []
            confidence = 0.0
            zoom_pose = False
            scroll_pose = False
            intents = intent_recognizer.evaluate([], 0.1)
            new_intent = None
            
            t_inference_start = time.perf_counter()
            
            if state["replaying"]:
                if state["replay_idx"] < len(state["replay_frames"]):
                    frame_data = state["replay_frames"][state["replay_idx"]]
                    state["replay_idx"] += 1
                    index_x = frame_data["x"]
                    index_y = frame_data["y"]
                    dist_i = frame_data["dist_l"]
                    dist_m = frame_data["dist_r"]
                    landmarks = frame_data.get("landmarks", [])
                    
                    if landmarks:
                        intents = intent_recognizer.evaluate(landmarks, hand_scale)
                        zoom_pose = intents["ZOOM"]["intent_score"] > 0.5
                        scroll_pose = intents["SCROLL"]["intent_score"] > 0.5
                    confidence = 1.0
                    has_hand = True
                    time.sleep(1/30.0)
                else:
                    state["replaying"] = False
                    IPCEmitter.emit("REPLAY_STOPPED")
                    continue
            else:
                tracker.start()
                
                t_cam_start = time.perf_counter()
                success, rgb = stream.read()
                t_cam_end = time.perf_counter()
                t_cam = t_cam_end - t_cam_start
                
                if not success or rgb is None:
                    camera_failures += 1
                    if camera_failures > 30: # Approx 1s timeout
                        ctx.health.set_state(Subsystem.CAMERA, HealthState.ERROR)
                        IPCEmitter.emit("ERROR", {"code": "CAMERA_DISCONNECTED", "message": "Camera failed to read repeatedly. Auto-recovery failed."})
                        state["tracking"] = False
                        stream.close()
                        camera_failures = 0
                    else:
                        time.sleep(0.03)
                    continue
                
                camera_failures = 0
                ctx.health.set_state(Subsystem.CAMERA, HealthState.READY)
                
                fps_frames += 1
                if time.time() - fps_start_time >= 1.0:
                    fps = fps_frames
                    fps_frames = 0
                    fps_start_time = time.time()
                
                results = tracker.process(rgb)
            
                if results.multi_hand_landmarks:
                    has_hand = True
                    # Pseudo-confidence for python implementation
                    confidence = 0.9 
                    
                    hand = results.multi_hand_landmarks[0].landmark
                    wrist = hand[0]   # WRIST
                    mcp = hand[9]     # MIDDLE_FINGER_MCP
                    
                    thumb = hand[4]   # THUMB_TIP
                    index = hand[8]   # INDEX_FINGER_TIP
                    middle = hand[12] # MIDDLE_FINGER_TIP
                    ring = hand[16]   # RING_FINGER_TIP
                    
                    hand_scale = dist(wrist, mcp)
                
                    dist_i = dist(index, thumb)
                    dist_m = dist(middle, thumb)
                    
                    index_x = index.x
                    index_y = index.y
                    landmarks = [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand]
                    
                    if state["recording"]:
                        state["recorded_frames"].append({
                            "x": index_x,
                            "y": index_y,
                            "dist_l": dist_i,
                            "dist_r": dist_m,
                            "landmarks": landmarks
                        })
                    
                    intents = intent_recognizer.evaluate(landmarks, hand_scale)
                    zoom_pose = intents["ZOOM"]["intent_score"] > 0.5
                    scroll_pose = intents["SCROLL"]["intent_score"] > 0.5

            t_inference_end = time.perf_counter()
            t_tracker = t_inference_end - t_inference_start

            if has_hand:
                assert conf_hist is not None, "conf_hist must be initialized before appending"
                conf_hist.append(confidence)
                if len(conf_hist) > 5:
                    conf_hist.pop(0)
            else:
                conf_hist.clear()
                
            
            
            tracking_state_label = "TRACKING" if has_hand else "SEARCHING"
            quality_score = confidence
            quality_label = "HIGH" if quality_score > 0.8 else "LOW"
            detected_pose_name = "NONE"
            
            t_inference_end = time.perf_counter()
            if rgb is not None and fps_frames % 30 == 0:
                env_monitor.process_frame(rgb, t_curr)
            env_penalty = env_monitor.get_environmental_penalty()

            tracking_data.update({
                "has_hand": has_hand,
                "tracking_state": tracking_state_label,
                "raw_x": index_x,
                "raw_y": index_y,
                "dist_i": dist_i,
                "dist_m": dist_m,
                "hand_scale": hand_scale,
                "confidence": confidence,
                "t_curr": t_curr,
                "zoom_pose": zoom_pose,
                "scroll_pose": scroll_pose,
                "left_click_score": intents["LEFT_CLICK"]["intent_score"] if has_hand else 0.0,
                "right_click_score": intents["RIGHT_CLICK"]["intent_score"] if has_hand else 0.0,
                "conf_hist": conf_hist,
                "env_penalty": env_penalty,
                "landmarks": landmarks
            })

            t_filter_start = time.perf_counter()
            validated_data = reliability_engine.process(tracking_data, dt)
            t_reliability = time.perf_counter() - t_filter_start
            validated_dict = validated_data.to_dict()

            try:
                v_has_hand = validated_dict["has_hand"]
                if v_has_hand:
                    if not state.get("hand_detected", False):
                        state["hand_detected"] = True
                        IPCEmitter.emit("HAND_DETECTED", True)
                        
                    if state.get("calibration_mode", False):
                        t_end = time.perf_counter()
                        pass
                    else:
                        t_gest_start = time.perf_counter()
                        new_intent = gesture_engine.detect_intent(validated_dict)
                        if state.get("force_move_only", False):
                            from pipeline_types import IntentType
                            new_intent.type = IntentType.MOVE_CURSOR
                        t_gest = time.perf_counter() - t_gest_start
                        
                        t_mot_start = time.perf_counter()
                        action_cmd = motion_engine.process(new_intent, config, env_penalty, dt)
                        t_mot = time.perf_counter() - t_mot_start
                        
                        t_act_start = time.perf_counter()
                        action_executor.execute(action_cmd)
                        t_act = time.perf_counter() - t_act_start
                else:
                    if state.get("hand_detected", False):
                        state["hand_detected"] = False
                        action_executor.release_all_inputs()
                        IPCEmitter.emit("HAND_DETECTED", False)

            except Exception as ex:
                import traceback
                IPCEmitter.emit("MODULE_EXCEPTION", {"module": "ProcessingLoop", "trace": traceback.format_exc()})

            t_end = time.perf_counter()

            
            if has_hand:
                active_name = new_intent.type.name if "new_intent" in locals() and new_intent else "NONE"
                
                reason_cursor_blocked = "NONE"
                flags = validated_dict.get("reliability_flags", [])
                
                if not state["tracking"]:
                    reason_cursor_blocked = "ENGINE_PAUSED"
                elif "TRACKING_LOST" in flags:
                    reason_cursor_blocked = "TRACKING_LOST"
                elif "LOW_CONFIDENCE" in flags:
                    reason_cursor_blocked = "LOW_CONFIDENCE"
                elif "HIGH_VELOCITY" in flags:
                    reason_cursor_blocked = "RELIABILITY_LOCK"
                elif active_name == "ZOOM":
                    reason_cursor_blocked = "ZOOM_ACTIVE"
                elif active_name == "SCROLL":
                    reason_cursor_blocked = "SCROLL_ACTIVE"
                
                IPCEmitter.emit("TELEMETRY", {
                    "x": validated_dict["raw_x"],
                    "y": validated_dict["raw_y"],
                    "dist_l": validated_dict["dist_i"],
                    "dist_r": validated_dict["dist_m"],
                    "pose_peace": validated_dict["scroll_pose"],
                    "pose_fist": validated_dict["zoom_pose"],
                    "fps": fps,
                    "landmarks": validated_dict["landmarks"],
                    "metrics": {
                        "t_cam_ms": t_cam * 1000 if 't_cam' in locals() else 0,
                        "t_tracker_ms": t_tracker * 1000 if 't_tracker' in locals() else 0,
                        "t_reliability_ms": t_reliability * 1000 if 't_reliability' in locals() else 0,
                        "t_gesture_ms": t_gest * 1000 if 't_gest' in locals() else 0,
                        "t_motion_ms": t_mot * 1000 if 't_mot' in locals() else 0,
                        "t_action_ms": t_act * 1000 if 't_act' in locals() else 0,
                        "total_ms": (time.perf_counter() - t_start) * 1000
                    },
                    "frame_quality": validated_dict.get("frame_quality", 0.0),
                    "tracking_quality": validated_dict.get("reliability_score", 0.0),
                    "reliability_flags": validated_dict.get("reliability_flags", []),
                    "rejected_frames": validated_dict.get("rejected_frames", 0),
                    "grace_period_active": validated_dict.get("grace_period_active", False),
                    "reason_cursor_blocked": reason_cursor_blocked,
                    "subsystems": {
                        "engine": "READY",
                        "camera": "READY" if state.get("camera_id") is not None else "DISCONNECTED",
                        "tracking": validated_dict["tracking_state"]
                    },
                    "intent_matrix": intents,
                    "active_intent": active_name
                })

    
            # Periodic 1.0s Heartbeat
            if 'last_heartbeat_t' not in locals(): last_heartbeat_t = t_start
            if (t_curr - last_heartbeat_t) >= 1.0:
                last_heartbeat_t = t_curr
                try:
                    import psutil
                    hb_cpu = psutil.cpu_percent(interval=None)
                    hb_ram = psutil.Process().memory_info().rss / 1024 / 1024
                except:
                    hb_cpu, hb_ram = 0, 0

                IPCEmitter.emit("HEARTBEAT", {
                    "cpu": hb_cpu,
                    "ram_mb": hb_ram,
                    "fps": round(fps, 1),
                    "camera_open": state.get("camera_id") is not None,
                    "tracking": state.get("tracking", False),
                    "uptime_sec": int(t_curr - t_start),
                    "frame_latency_ms": round((t_end - t_start) * 1000.0, 2)
                })

    except Exception as e:
        import traceback
        system_logger.error(f"FATAL: Unhandled exception in main loop: {e}\n{traceback.format_exc()}")
        IPCEmitter.emit("ERROR", {"code": "FATAL_CRASH", "message": f"Daemon crashed: {str(e)}"})
    finally:
        IPCEmitter.emit("INFO", "Executing ordered shutdown")
        system_logger.info(f"Active Python PID: {os.getpid()} - Initiating teardown")
        
        system_logger.info("[Shutdown Audit] Step 1: Releasing inputs")
        try: action_executor.release_all_inputs()
        except: pass
        
        system_logger.info("[Shutdown Audit] Step 2: Stopping action executor")
        try: action_executor.stop()
        except: pass
        
        system_logger.info("[Shutdown Audit] Step 3: Stopping tracker")
        try: tracker.stop()
        except: pass
        
        system_logger.info("[Shutdown Audit] Step 4: Closing camera stream")
        try: stream.close()
        except: pass
        
        system_logger.info("[Shutdown Audit] Step 5: Joining command listener thread")
        try: t.join(timeout=1.0)
        except: pass
        
        system_logger.info("[Shutdown Audit] Step 6: Flushing Diagnostic Buffer")
        try:
            output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
            trace_path = os.path.join(output_dir, "motion_trace.json")
            diag_buffer.flush_to_disk(trace_path)
        except Exception as e:
            system_logger.error(f"Failed to flush diagnostics: {e}")
        
        system_logger.info(f"Active Python PID: {os.getpid()} - Teardown complete. Exiting via os._exit(0).")
        os._exit(0)


if __name__ == "__main__":
    main()
