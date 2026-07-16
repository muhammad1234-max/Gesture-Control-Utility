import sys
import struct
import time
import ctypes
from ctypes import wintypes

# SendInput Win32 Structures
# ----------------------------------------------------
PUL = ctypes.POINTER(ctypes.c_ulong)

class KeyBdInput(ctypes.Structure):
    _fields_ = [("wVk", ctypes.c_ushort),
                ("wScan", ctypes.c_ushort),
                ("dwFlags", ctypes.c_ulong),
                ("time", ctypes.c_ulong),
                ("dwExtraInfo", PUL)]

class HardwareInput(ctypes.Structure):
    _fields_ = [("uMsg", ctypes.c_ulong),
                ("wParamL", ctypes.c_short),
                ("wParamH", ctypes.c_ushort)]

class MouseInput(ctypes.Structure):
    _fields_ = [("dx", ctypes.c_long),
                ("dy", ctypes.c_long),
                ("mouseData", ctypes.c_ulong),
                ("dwFlags", ctypes.c_ulong),
                ("time", ctypes.c_ulong),
                ("dwExtraInfo", PUL)]

class Input_I(ctypes.Union):
    _fields_ = [("ki", KeyBdInput),
                ("mi", MouseInput),
                ("hi", HardwareInput)]

class Input(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ulong),
                ("ii", Input_I)]

# Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_ABSOLUTE = 0x8000
KEYEVENTF_KEYUP = 0x0002

# Command Types
CMD_MOVE_MOUSE = 0
CMD_LEFT_CLICK = 1
CMD_RIGHT_CLICK = 2
CMD_SCROLL = 3
CMD_KEY_DOWN = 4
CMD_KEY_UP = 5

def send_input(inputs):
    nInputs = len(inputs)
    LPINPUT = Input * nInputs
    pInputs = LPINPUT(*inputs)
    cbSize = ctypes.c_int(ctypes.sizeof(Input))
    return ctypes.windll.user32.SendInput(nInputs, pInputs, cbSize)

def move_mouse(dx, dy):
    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    ii_.mi = MouseInput(dx, dy, 0, MOUSEEVENTF_MOVE, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(INPUT_MOUSE), ii_)
    send_input([x])

def left_click(down, up):
    inputs = []
    extra = ctypes.c_ulong(0)
    if down:
        ii_ = Input_I()
        ii_.mi = MouseInput(0, 0, 0, MOUSEEVENTF_LEFTDOWN, 0, ctypes.pointer(extra))
        inputs.append(Input(ctypes.c_ulong(INPUT_MOUSE), ii_))
    if up:
        ii_ = Input_I()
        ii_.mi = MouseInput(0, 0, 0, MOUSEEVENTF_LEFTUP, 0, ctypes.pointer(extra))
        inputs.append(Input(ctypes.c_ulong(INPUT_MOUSE), ii_))
    if inputs:
        send_input(inputs)

def right_click(down, up):
    inputs = []
    extra = ctypes.c_ulong(0)
    if down:
        ii_ = Input_I()
        ii_.mi = MouseInput(0, 0, 0, MOUSEEVENTF_RIGHTDOWN, 0, ctypes.pointer(extra))
        inputs.append(Input(ctypes.c_ulong(INPUT_MOUSE), ii_))
    if up:
        ii_ = Input_I()
        ii_.mi = MouseInput(0, 0, 0, MOUSEEVENTF_RIGHTUP, 0, ctypes.pointer(extra))
        inputs.append(Input(ctypes.c_ulong(INPUT_MOUSE), ii_))
    if inputs:
        send_input(inputs)

def scroll(delta):
    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    # mouseData holds wheel movement
    ii_.mi = MouseInput(0, 0, ctypes.c_ulong(delta), MOUSEEVENTF_WHEEL, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(INPUT_MOUSE), ii_)
    send_input([x])

def key_down(vk):
    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    ii_.ki = KeyBdInput(vk, 0, 0, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(INPUT_KEYBOARD), ii_)
    send_input([x])

def key_up(vk):
    extra = ctypes.c_ulong(0)
    ii_ = Input_I()
    ii_.ki = KeyBdInput(vk, 0, KEYEVENTF_KEYUP, 0, ctypes.pointer(extra))
    x = Input(ctypes.c_ulong(INPUT_KEYBOARD), ii_)
    send_input([x])

# ----------------------------------------------------
# Main Loop
# ----------------------------------------------------

import threading
import psutil # Optional, fallback to ctypes if missing
import time

stdout_lock = threading.Lock()

# Process Times structure
class FILETIME(ctypes.Structure):
    _fields_ = [("dwLowDateTime", ctypes.c_uint),
                ("dwHighDateTime", ctypes.c_uint)]

def get_cpu_mem():
    # Use ctypes to avoid psutil dependency
    kernel32 = ctypes.windll.kernel32
    psapi = ctypes.windll.psapi
    
    # Memory
    class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
        _fields_ = [("cb", ctypes.c_uint),
                    ("PageFaultCount", ctypes.c_uint),
                    ("PeakWorkingSetSize", ctypes.c_size_t),
                    ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t),
                    ("PeakPagefileUsage", ctypes.c_size_t)]
                    
    counters = PROCESS_MEMORY_COUNTERS()
    counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
    hProcess = kernel32.GetCurrentProcess()
    psapi.GetProcessMemoryInfo(hProcess, ctypes.pointer(counters), counters.cb)
    mem_rss = counters.WorkingSetSize
    
    # CPU Time
    creation, exit_t, kernel, user = FILETIME(), FILETIME(), FILETIME(), FILETIME()
    kernel32.GetProcessTimes(hProcess, ctypes.pointer(creation), ctypes.pointer(exit_t), ctypes.pointer(kernel), ctypes.pointer(user))
    
    def to_100ns(ft):
        return (ft.dwHighDateTime << 32) + ft.dwLowDateTime
        
    cpu_time_100ns = to_100ns(kernel) + to_100ns(user)
    return cpu_time_100ns, mem_rss

def telemetry_loop(start_time):
    # Telemetry Packet: Type(B)=1, CpuPct(f), Mem(Q), Uptime(f), Healthy(B)
    FMT = "<B f Q f B"
    
    last_cpu_time, _ = get_cpu_mem()
    last_real_time = time.perf_counter()
    
    while True:
        time.sleep(1.0)
        try:
            curr_cpu_time, mem_rss = get_cpu_mem()
            curr_real_time = time.perf_counter()
            
            # delta in 100ns intervals
            cpu_delta = curr_cpu_time - last_cpu_time
            real_delta = (curr_real_time - last_real_time) * 10_000_000
            
            cpu_pct = (cpu_delta / real_delta) * 100.0 if real_delta > 0 else 0.0
            
            last_cpu_time = curr_cpu_time
            last_real_time = curr_real_time
            
            uptime = time.perf_counter() - start_time
            
            packet = struct.pack(FMT, 1, cpu_pct, mem_rss, uptime, 1)
            
            with stdout_lock:
                sys.stdout.buffer.write(packet)
                sys.stdout.buffer.flush()
        except:
            pass

def main():
    if sys.platform == "win32":
        import msvcrt
        import os
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)

    start_time = time.perf_counter()
    
    # Start telemetry thread
    t_thread = threading.Thread(target=telemetry_loop, args=(start_time,), daemon=True)
    t_thread.start()

    # Pre-allocate read buffer
    HEADER_FMT = "<IBI"
    HEADER_SIZE = struct.calcsize(HEADER_FMT)

    # Response: Type(B)=0, CommandID (I), Success (B), PythonTimeNs (Q), Win32TimeNs (Q)
    RESP_FMT = "<B IBQQ"
    
    while True:
        try:
            # 1. Read Header
            header_bytes = sys.stdin.buffer.read(HEADER_SIZE)
            if not header_bytes or len(header_bytes) < HEADER_SIZE:
                break
                
            cmd_id, cmd_type, payload_len = struct.unpack(HEADER_FMT, header_bytes)
            
            # 2. Read Payload
            payload_bytes = sys.stdin.buffer.read(payload_len)
            if len(payload_bytes) < payload_len:
                break
                
            t0 = time.perf_counter_ns()
            success = 1
            
            t1 = time.perf_counter_ns()
            
            # 3. Execute
            if cmd_type == CMD_MOVE_MOUSE:
                dx, dy = struct.unpack("<ii", payload_bytes)
                move_mouse(dx, dy)
            elif cmd_type == CMD_LEFT_CLICK:
                down, up = struct.unpack("<BB", payload_bytes)
                left_click(down, up)
            elif cmd_type == CMD_RIGHT_CLICK:
                down, up = struct.unpack("<BB", payload_bytes)
                right_click(down, up)
            elif cmd_type == CMD_SCROLL:
                delta, = struct.unpack("<i", payload_bytes)
                scroll(delta)
            elif cmd_type == CMD_KEY_DOWN:
                vk, = struct.unpack("<H", payload_bytes)
                key_down(vk)
            elif cmd_type == CMD_KEY_UP:
                vk, = struct.unpack("<H", payload_bytes)
                key_up(vk)
            else:
                success = 0
                
            t2 = time.perf_counter_ns()
            
            python_time = t1 - t0
            win32_time = t2 - t1
            
            # 4. Write Response
            resp = struct.pack(RESP_FMT, 0, cmd_id, success, python_time, win32_time)
            with stdout_lock:
                sys.stdout.buffer.write(resp)
                sys.stdout.buffer.flush()
            
        except Exception as e:
            try:
                resp = struct.pack(RESP_FMT, 0, cmd_id, 0, 0, 0)
                with stdout_lock:
                    sys.stdout.buffer.write(resp)
                    sys.stdout.buffer.flush()
            except:
                pass

if __name__ == '__main__':
    main()
