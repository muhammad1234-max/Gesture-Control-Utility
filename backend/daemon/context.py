# context.py
from camera import CameraStream
from tracker import HandTracker
from reliability_engine import ReliabilityEngine
from gesture_engine import GestureEngine
from motion_engine import MotionEngine
from action_executor import ActionExecutor
from mouse_controller import MouseController
from health_manager import HealthManager
from performance_monitor import PerformanceMonitor
from config import BackendConfig

class SystemContext:
    """
    Dependency Injection Container.
    Instantiates and holds all singleton services.
    """
    def __init__(self, get_screen_size_func):
        self.mouse = MouseController()
        self.camera = CameraStream()
        self.tracker = HandTracker()
        self.reliability = ReliabilityEngine()
        self.gesture = GestureEngine()
        self.motion = MotionEngine(get_screen_size_func)
        self.action = ActionExecutor(self.mouse)
        
        self.health = HealthManager()
        self.performance = PerformanceMonitor()
        self.config = BackendConfig()
        
    def stop_all(self):
        self.camera.close()
        self.tracker.stop()
        self.action.stop()
