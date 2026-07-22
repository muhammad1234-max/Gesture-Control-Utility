# ipc_emitter.py
import json
import sys

class IPCEmitter:
    """
    Centralized IPC Emitter.
    Strictly reserves stdout for structured JSON IPC events.
    """
    @staticmethod
    def emit(event: str, payload=None):
        message = {"event": event}
        if payload is not None:
            message["payload"] = payload
            
        try:
            print(json.dumps(message), flush=True)
        except Exception as e:
            # If stdout is broken, we cannot emit. Write strictly to stderr.
            print(f"[IPC_ERROR] Failed to emit {event}: {e}", file=sys.stderr, flush=True)
