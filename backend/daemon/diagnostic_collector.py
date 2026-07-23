import os
import zipfile
import json
import hashlib
import sys
import psutil

def compute_sha256(filepath):
    try:
        if not os.path.exists(filepath):
            return "NOT_FOUND"
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception as e:
        return f"ERROR: {str(e)}"

def collect_diagnostics(state_dump, config_dump, diag_buffer, output_dir=None):
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "logs")
    
    os.makedirs(output_dir, exist_ok=True)
    zip_path = os.path.join(output_dir, "diagnostic_bundle.zip")
    
    # Write memory buffer to disk
    trace_path = os.path.join(output_dir, "motion_trace.json")
    diag_buffer.flush_to_disk(trace_path)
    
    # Module Hashing
    module_hashes = {}
    for name, module in sys.modules.items():
        if hasattr(module, '__file__') and module.__file__:
            if module.__file__.endswith('.py') or module.__file__.endswith('.pyc'):
                module_hashes[name] = {
                    "path": module.__file__,
                    "sha256": compute_sha256(module.__file__)
                }
    
    # Process Info
    process_info = {}
    try:
        p = psutil.Process()
        process_info = {
            "pid": p.pid,
            "ppid": p.ppid(),
            "name": p.name(),
            "exe": p.exe(),
            "cmdline": p.cmdline(),
            "cwd": p.cwd(),
            "threads": p.num_threads(),
            "memory_mb": p.memory_info().rss / (1024 * 1024)
        }
    except Exception as e:
        process_info["error"] = str(e)

    # Write JSON files
    files_to_zip = [trace_path]
    
    json_dumps = {
        "module_hashes.json": module_hashes,
        "process_info.json": process_info,
        "runtime_config.json": config_dump,
        "state_dump.json": state_dump
    }
    
    for filename, data in json_dumps.items():
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        files_to_zip.append(filepath)
        
    # Append log files
    for logfile in ["daemon.log", "system.log", "main.log"]:
        path = os.path.join(output_dir, logfile)
        if os.path.exists(path):
            files_to_zip.append(path)
            
    # Zip everything
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for filepath in files_to_zip:
                if os.path.exists(filepath):
                    zf.write(filepath, os.path.basename(filepath))
        return zip_path
    except Exception as e:
        from logger import system_logger
        system_logger.error(f"Failed to create diagnostic_bundle.zip: {e}")
        return None
