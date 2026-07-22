# error_codes.py
from enum import Enum

class ErrorSeverity(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class ErrorCode:
    # Camera
    CAMERA_NOT_FOUND = "CAMERA_NOT_FOUND"
    CAMERA_BUSY = "CAMERA_BUSY"
    CAMERA_DISCONNECTED = "CAMERA_DISCONNECTED"
    
    # Tracker
    TRACKER_INITIALIZATION_FAILED = "TRACKER_INITIALIZATION_FAILED"
    HAND_NOT_VISIBLE = "HAND_NOT_VISIBLE"
    
    # Environment
    LOW_LIGHT = "LOW_LIGHT"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    
    # System
    PIPELINE_TIMEOUT = "PIPELINE_TIMEOUT"
    IPC_DISCONNECTED = "IPC_DISCONNECTED"
    UNKNOWN_EXCEPTION = "UNKNOWN_EXCEPTION"
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION"

def build_error(code, severity, recoverable, message, action):
    return {
        "code": code,
        "severity": severity.value,
        "recoverable": recoverable,
        "message": message,
        "action": action
    }
