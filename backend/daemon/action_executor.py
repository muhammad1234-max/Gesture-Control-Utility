import threading
import time
import math
from pipeline_types import CommandType, ActionCommand

class ActionExecutor:
    def __init__(self, mouse_controller):
        self.mouse = mouse_controller
        self.is_left_down = False
        
        # Async Injector State
        self.running = True
        self.scroll_velocity = 0.0
        self.zoom_velocity = 0.0
        self.scroll_active = False
        self.zoom_active = False
        self.scroll_accumulator = 0.0
        self.zoom_accumulator = 0.0
        self.WHEEL_DELTA = 120.0
        self.momentum_k = 2.0
        
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def get_adaptive_dt(self, max_vel):
        v = abs(max_vel)
        if v < 0.1 and not self.scroll_active and not self.zoom_active:
            return 1.0 / 20.0
        elif v < 50: return 1.0 / 60.0
        elif v < 150: return 1.0 / 90.0
        elif v < 300: return 1.0 / 120.0
        else: return 1.0 / 150.0

    def _loop(self):
        last_time = time.perf_counter()
        while self.running:
            with self.lock:
                max_vel = max(abs(self.scroll_velocity), abs(self.zoom_velocity))
                dt = self.get_adaptive_dt(max_vel)
            
            t_curr = time.perf_counter()
            elapsed = t_curr - last_time
            sleep_time = max(0, dt - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
            
            last_time = time.perf_counter()
            real_dt = max(last_time - t_curr + sleep_time, 0.001)

            with self.lock:
                if self.scroll_active: pass
                else:
                    if abs(self.scroll_velocity) > 0.1: self.scroll_velocity *= math.exp(-self.momentum_k * real_dt)
                    else: self.scroll_velocity = 0.0
                        
                if abs(self.scroll_velocity) > 0.1:
                    self.scroll_accumulator += self.scroll_velocity * real_dt * 1500.0
                    if abs(self.scroll_accumulator) >= self.WHEEL_DELTA:
                        ticks = int(self.scroll_accumulator / self.WHEEL_DELTA) * int(self.WHEEL_DELTA)
                        self.mouse.scroll(-ticks)
                        self.scroll_accumulator -= ticks
                        
                if self.zoom_active: pass
                else:
                    if abs(self.zoom_velocity) > 0.1:
                        self.mouse.ctrl_down()
                        self.zoom_velocity *= math.exp(-self.momentum_k * real_dt)
                    else:
                        self.zoom_velocity = 0.0
                        self.mouse.ctrl_up()

                if abs(self.zoom_velocity) > 0.1:
                    self.zoom_accumulator += self.zoom_velocity * real_dt * 1500.0
                    if abs(self.zoom_accumulator) >= self.WHEEL_DELTA:
                        ticks = int(self.zoom_accumulator / self.WHEEL_DELTA) * int(self.WHEEL_DELTA)
                        self.mouse.scroll(-ticks)
                        self.zoom_accumulator -= ticks

    def stop(self):
        self.running = False
        if self.thread.is_alive():
            self.thread.join()

    def execute(self, command: ActionCommand):
        if command.type == CommandType.NONE:
            with self.lock:
                self.scroll_active = False
                self.zoom_active = False
            return

        # Handled asynchronously
        if command.type == CommandType.SCROLL:
            with self.lock:
                self.scroll_active = True
                self.scroll_velocity = getattr(command, "velocity", 0.0)
            return
            
        if command.type == CommandType.ZOOM:
            with self.lock:
                self.zoom_active = True
                self.zoom_velocity = getattr(command, "velocity", 0.0)
                self.mouse.ctrl_down()
            return
            
        # Cancel async scrolling if we're doing something else
        with self.lock:
            self.scroll_active = False
            self.zoom_active = False

        if command.type == CommandType.MOVE_CURSOR:
            if self.is_left_down:
                self.mouse.left_up()
                self.is_left_down = False
            self.mouse.set_cursor_pos(command.x, command.y)
            return
            
        if command.type == CommandType.DRAG:
            if not self.is_left_down:
                self.mouse.left_down()
                self.is_left_down = True
            self.mouse.set_cursor_pos(command.x, command.y)
            return

        if command.type == CommandType.LEFT_DOWN:
            if not self.is_left_down:
                self.mouse.left_down()
                self.is_left_down = True
            return

        if command.type == CommandType.LEFT_UP:
            if self.is_left_down:
                self.mouse.left_up()
                self.is_left_down = False
            return

        if command.type == CommandType.RIGHT_CLICK:
            self.mouse.right_down()
            self.mouse.right_up()
            return
