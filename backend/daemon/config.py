from logger import system_logger
from version import get_version_info

class BackendConfig:
    def __init__(self):
        self.state = {
            "config_version": get_version_info()["config_version"],
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
            "replay_idx": 0
        }

    def _migrate(self, payload):
        version = payload.get("config_version", 1)
        if version < self.state["config_version"]:
            system_logger.info(f"Migrating config from v{version} to v{self.state['config_version']}")
            # Example migration rules
            if version < 3 and "deadzone" in payload:
                del payload["deadzone"]
            payload["config_version"] = self.state["config_version"]
        return payload

    def update(self, payload):
        payload = self._migrate(payload)
        
        if "sensitivity" in payload:
            val = float(payload["sensitivity"])
            if 0.1 <= val <= 2.0: self.state["sensitivity"] = val
            else: system_logger.warning("Invalid sensitivity value. Must be 0.1 - 2.0")
            
        if "smoothing" in payload:
            val = float(payload["smoothing"])
            if 0.0 <= val <= 1.0: self.state["smoothing"] = val
            else: system_logger.warning("Invalid smoothing value. Must be 0.0 - 1.0")
            
        if "pinch_threshold" in payload:
            val = float(payload["pinch_threshold"])
            if 0.01 <= val <= 0.3: self.state["pinch_threshold"] = val
            else: system_logger.warning("Invalid pinch_threshold. Must be 0.01 - 0.3")
            
        if "camera_id" in payload:
            val = int(payload["camera_id"])
            if val >= 0: self.state["camera_id"] = val
            else: system_logger.warning("Invalid camera_id. Must be >= 0")
            
        if "calibration" in payload:
            self.state["calibration"] = payload["calibration"]
