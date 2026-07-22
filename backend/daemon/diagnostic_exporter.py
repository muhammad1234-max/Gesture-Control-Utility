# diagnostic_exporter.py
import os
import zipfile
import json
import platform
from version import get_version_info

class DiagnosticExporter:
    @staticmethod
    def export_bundle(config_state, perf_stats, output_path="diagnostic_bundle.zip"):
        bundle_dir = os.path.dirname(os.path.abspath(output_path))
        os.makedirs(bundle_dir, exist_ok=True)
        
        # Collect system info
        system_info = {
            "os": platform.system(),
            "os_release": platform.release(),
            "os_version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version()
        }
        
        log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
        
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Write config
            zipf.writestr("config.json", json.dumps(config_state, indent=2))
            
            # Write versions
            zipf.writestr("version.json", json.dumps(get_version_info(), indent=2))
            
            # Write system info
            zipf.writestr("hardware.json", json.dumps(system_info, indent=2))
            
            # Write performance stats
            zipf.writestr("performance.json", json.dumps(perf_stats, indent=2))
            
            # Write logs (stripping any accidental PII just in case)
            if os.path.exists(log_dir):
                for root, dirs, files in os.walk(log_dir):
                    for file in files:
                        if file.endswith(".log"):
                            zipf.write(os.path.join(root, file), f"logs/{file}")
                            
        return output_path
