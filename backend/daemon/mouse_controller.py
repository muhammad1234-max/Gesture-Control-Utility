import ctypes
import time
from ctypes import wintypes
from diagnostic_buffer import diag_buffer

# Win32 Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
VK_CONTROL = 0x11
KEYEVENTF_KEYUP = 0x0002
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_HWHEEL = 0x1000

# C struct definitions for SendInput
class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wintypes.ULONG))
    ]

class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD)
    ]

class INPUT_I(ctypes.Union):
    _fields_ = [
        ("mi", MOUSEINPUT),
        ("ki", KEYBDINPUT),
        ("hi", HARDWAREINPUT)
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("ii", INPUT_I)
    ]

class MouseController:
    def __init__(self):
        self.left_pressed = False
        self.right_pressed = False
        self.ctrl_pressed = False
        self.dry_run = False

    def set_cursor_pos(self, x, y):
        if self.dry_run: return
        ctypes.windll.user32.SetCursorPos(int(x), int(y))

    def _send_mouse(self, flags, data=0):
        if self.dry_run: return
        try:
            from logger import system_logger
            system_logger.debug(f"ActionExecutor OS | Mouse | flags={hex(flags)}, data={data}")
            diag_buffer.append("ActionExecutor OS", "MOUSE_EVENT", {"flags": hex(flags), "data": data})
        except Exception:
            pass
        extra = ctypes.c_ulong(0)
        ii_ = INPUT_I()
        ii_.mi = MOUSEINPUT(0, 0, data, flags, 0, ctypes.pointer(extra))
        cmd = INPUT(INPUT_MOUSE, ii_)
        ctypes.windll.user32.SendInput(1, ctypes.pointer(cmd), ctypes.sizeof(cmd))
        
    def _send_keyboard(self, vk, flags):
        try:
            from logger import system_logger
            system_logger.debug(f"ActionExecutor OS | Keyboard | vk={hex(vk)}, flags={hex(flags)}")
            diag_buffer.append("ActionExecutor OS", "KEYBOARD_EVENT", {"vk": hex(vk), "flags": hex(flags)})
        except Exception:
            pass
        extra = ctypes.c_ulong(0)
        ii_ = INPUT_I()
        ii_.ki = KEYBDINPUT(vk, 0, flags, 0, ctypes.pointer(extra))
        cmd = INPUT(INPUT_KEYBOARD, ii_)
        ctypes.windll.user32.SendInput(1, ctypes.pointer(cmd), ctypes.sizeof(cmd))

    def left_down(self):
        if not self.left_pressed:
            self._send_mouse(MOUSEEVENTF_LEFTDOWN)
            self.left_pressed = True

    def left_up(self):
        if self.left_pressed:
            self._send_mouse(MOUSEEVENTF_LEFTUP)
            self.left_pressed = False

    def right_down(self):
        if not self.right_pressed:
            self._send_mouse(MOUSEEVENTF_RIGHTDOWN)
            self.right_pressed = True

    def right_up(self):
        if self.right_pressed:
            self._send_mouse(MOUSEEVENTF_RIGHTUP)
            self.right_pressed = False
            
    def ctrl_down(self):
        if not self.ctrl_pressed:
            self._send_keyboard(VK_CONTROL, 0)
            self.ctrl_pressed = True
            
    def ctrl_up(self):
        if self.ctrl_pressed:
            self._send_keyboard(VK_CONTROL, KEYEVENTF_KEYUP)
            self.ctrl_pressed = False

    def scroll(self, delta):
        self._send_mouse(MOUSEEVENTF_WHEEL, int(delta))

    def release_all(self):
        """OS Input Safety Guarantee: Release all mouse buttons & modifier keys unconditionally"""
        try:
            if self.left_pressed:
                self._send_mouse(MOUSEEVENTF_LEFTUP)
                self.left_pressed = False
            if self.right_pressed:
                self._send_mouse(MOUSEEVENTF_RIGHTUP)
                self.right_pressed = False
            # Middle button isn't tracked but if we want to be safe, don't blindly release it either
            # We never press middle button in this app
            
            if self.ctrl_pressed:
                self._send_keyboard(0x11, KEYEVENTF_KEYUP) # Ctrl up
                self.ctrl_pressed = False
        except Exception:
            pass
