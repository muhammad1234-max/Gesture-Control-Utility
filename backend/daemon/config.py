class BackendConfig:
    def __init__(self):
        self.state = {
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

    def update(self, payload):
        if "sensitivity" in payload: self.state["sensitivity"] = payload["sensitivity"]
        if "smoothing" in payload: self.state["smoothing"] = payload["smoothing"]
        if "pinch_threshold" in payload: self.state["pinch_threshold"] = payload["pinch_threshold"]
        if "camera_id" in payload: self.state["camera_id"] = payload["camera_id"]
        if "calibration" in payload: self.state["calibration"] = payload["calibration"]
