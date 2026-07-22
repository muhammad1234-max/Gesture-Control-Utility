import time
import json
import os

class ValidationReporter:
    def __init__(self):
        self.is_active = False
        self.start_time = 0.0
        self.end_time = 0.0
        
        self.frame_times = []
        self.jitter_rms_samples = []
        self.jitter_pk_pk_samples = []
        
        self.left_attempts = 0
        self.left_successes = 0
        self.right_attempts = 0
        self.right_successes = 0
        
        self.dropped_frames = 0
        self.exception_count = 0
        
    def start_session(self):
        self.is_active = True
        self.start_time = time.time()
        self.end_time = 0.0
        self.frame_times = []
        self.jitter_rms_samples = []
        self.jitter_pk_pk_samples = []
        self.left_attempts = 0
        self.left_successes = 0
        self.right_attempts = 0
        self.right_successes = 0
        self.dropped_frames = 0
        self.exception_count = 0

    def record_frame(self, frame_time_ms, jitter_metrics=None, dropped=False):
        if not self.is_active: return
        self.frame_times.append(frame_time_ms)
        if dropped:
            self.dropped_frames += 1
        if jitter_metrics and jitter_metrics.get("samples", 0) >= 10:
            self.jitter_rms_samples.append(jitter_metrics["rms_px"])
            self.jitter_pk_pk_samples.append(jitter_metrics["pk_pk_px"])

    def record_click_event(self, click_type, is_success):
        if not self.is_active: return
        if "LEFT" in click_type.upper():
            self.left_attempts += 1
            if is_success: self.left_successes += 1
        elif "RIGHT" in click_type.upper():
            self.right_attempts += 1
            if is_success: self.right_successes += 1

    def record_exception(self):
        if not self.is_active: return
        self.exception_count += 1

    def stop_session(self):
        if not self.is_active: return None
        self.is_active = False
        self.end_time = time.time()
        duration_sec = self.end_time - self.start_time
        
        avg_frame_ms = sum(self.frame_times) / len(self.frame_times) if self.frame_times else 0.0
        peak_frame_ms = max(self.frame_times) if self.frame_times else 0.0
        avg_fps = 1000.0 / avg_frame_ms if avg_frame_ms > 0 else 0.0
        
        avg_rms = sum(self.jitter_rms_samples) / len(self.jitter_rms_samples) if self.jitter_rms_samples else 0.0
        avg_pk_pk = sum(self.jitter_pk_pk_samples) / len(self.jitter_pk_pk_samples) if self.jitter_pk_pk_samples else 0.0
        
        passed = (
            self.exception_count == 0 and
            (avg_rms < 0.25 or len(self.jitter_rms_samples) == 0) and
            (avg_pk_pk < 1.0 or len(self.jitter_pk_pk_samples) == 0)
        )
        
        report = {
            "duration_min": round(duration_sec / 60.0, 2),
            "duration_sec": round(duration_sec, 1),
            "avg_fps": round(avg_fps, 1),
            "avg_processing_ms": round(avg_frame_ms, 2),
            "peak_processing_ms": round(peak_frame_ms, 2),
            "cursor_rms_px": round(avg_rms, 3),
            "peak_to_peak_px": round(avg_pk_pk, 3),
            "left_click_success": f"{self.left_successes} / {self.left_attempts}",
            "right_click_success": f"{self.right_successes} / {self.right_attempts}",
            "dropped_frames": self.dropped_frames,
            "exceptions": self.exception_count,
            "status": "PASS" if passed else "FAIL"
        }
        
        text_report = (
            "==========================================\n"
            "         HARDWARE VALIDATION REPORT       \n"
            "==========================================\n"
            f"Duration:           {report['duration_min']} minutes ({report['duration_sec']} s)\n"
            f"Average FPS:        {report['avg_fps']} FPS\n"
            f"Avg Processing Time:{report['avg_processing_ms']} ms\n"
            f"Peak Processing Time:{report['peak_processing_ms']} ms\n"
            f"Cursor RMS Jitter:  {report['cursor_rms_px']} px (Target < 0.25 px)\n"
            f"Peak-to-Peak:       {report['peak_to_peak_px']} px (Target < 1.00 px)\n"
            f"Left Click Success: {report['left_click_success']}\n"
            f"Right Click Success:{report['right_click_success']}\n"
            f"Dropped Frames:     {report['dropped_frames']}\n"
            f"Exceptions:         {report['exceptions']}\n"
            "------------------------------------------\n"
            f"FINAL STATUS:       {report['status']}\n"
            "==========================================\n"
        )
        
        report["formatted_text"] = text_report
        return report
