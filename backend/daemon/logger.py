# logger.py
import logging
import os
from logging.handlers import RotatingFileHandler
import json

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "subsystem": getattr(record, "subsystem", "System"),
            "severity": record.levelname,
            "message": record.getMessage()
        }
        
        if hasattr(record, "event_id"):
            log_obj["event_id"] = record.event_id
        if hasattr(record, "error_code"):
            log_obj["error_code"] = record.error_code
        if hasattr(record, "duration"):
            log_obj["duration"] = record.duration
            
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_obj)

def get_logger(name="GestureDaemon"):
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        
        # Ensure log directory exists
        log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "daemon.log")
        
        handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        
    return logger

system_logger = get_logger()
