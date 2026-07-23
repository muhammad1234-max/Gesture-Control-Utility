import collections
import time
import json
import os

class DiagnosticBuffer:
    def __init__(self, maxlen=3000):
        self.buffer = collections.deque(maxlen=maxlen)
        self.start_time = time.time()
        
    def append(self, module, data_type, payload):
        entry = {
            "ts": time.time(),
            "module": module,
            "type": data_type,
            "data": payload
        }
        self.buffer.append(entry)
        
    def flush_to_disk(self, output_path):
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                f.write("[\n")
                buf_len = len(self.buffer)
                for i, entry in enumerate(self.buffer):
                    json.dump(entry, f)
                    if i < buf_len - 1:
                        f.write(",\n")
                    else:
                        f.write("\n")
                f.write("]\n")
        except Exception as e:
            from logger import system_logger
            system_logger.error(f"Failed to flush diagnostic buffer: {e}")

# Global instance
diag_buffer = DiagnosticBuffer()
