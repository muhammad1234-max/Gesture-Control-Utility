# health_manager.py
from enum import Enum
from ipc_emitter import IPCEmitter

class HealthState(Enum):
    READY = "READY"
    STARTING = "STARTING"
    WARNING = "WARNING"
    ERROR = "ERROR"
    STOPPED = "STOPPED"

class Subsystem(Enum):
    CAMERA = "CAMERA"
    TRACKER = "TRACKER"
    RELIABILITY_ENGINE = "RELIABILITY_ENGINE"
    GESTURE_ENGINE = "GESTURE_ENGINE"
    MOTION_ENGINE = "MOTION_ENGINE"
    ACTION_EXECUTOR = "ACTION_EXECUTOR"
    IPC = "IPC"
    PERFORMANCE = "PERFORMANCE"

class OverallHealth(Enum):
    EXCELLENT = "EXCELLENT"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"

class HealthManager:
    def __init__(self):
        self.states = {subsystem: HealthState.STOPPED for subsystem in Subsystem}
        
    def set_state(self, subsystem: Subsystem, state: HealthState):
        if self.states[subsystem] != state:
            self.states[subsystem] = state
            self._evaluate_overall_health()
            
    def _evaluate_overall_health(self):
        # Derive overall health
        has_error = any(s == HealthState.ERROR for s in self.states.values())
        has_warning = any(s == HealthState.WARNING for s in self.states.values())
        
        if has_error:
            overall = OverallHealth.CRITICAL
        elif has_warning:
            overall = OverallHealth.DEGRADED
        else:
            overall = OverallHealth.EXCELLENT
            
        IPCEmitter.emit("ENGINE_HEALTH", {
            "overall": overall.value,
            "subsystems": {subsys.value: state.value for subsys, state in self.states.items()}
        })
