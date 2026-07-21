import threading
import time
import math

class InputInjector:
    def __init__(self, mouse):
        self.mouse = mouse
        self.running = True
        
        self.scroll_velocity = 0.0
        self.zoom_velocity = 0.0
        
        self.scroll_active = False
        self.zoom_active = False
        
        self.momentum_k = 2.0 # Decay rate
        
        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        
    def velocity_callback(self, vel, is_zoom=False):
        if is_zoom:
            self.set_zoom_velocity(vel)
        else:
            self.set_scroll_velocity(vel)
        
    def set_scroll_velocity(self, vel):
        with self.lock:
            if vel is None:
                self.scroll_active = False
            else:
                self.scroll_active = True
                self.scroll_velocity = vel
                
    def set_zoom_velocity(self, vel):
        with self.lock:
            if vel is None:
                self.zoom_active = False
                self.mouse.ctrl_up()
            else:
                self.zoom_active = True
                self.zoom_velocity = vel
                self.mouse.ctrl_down()

    def stop(self):
        self.running = False
        self.thread.join()

    def get_adaptive_dt(self, max_vel):
        v = abs(max_vel)
        if v < 0.1 and not self.scroll_active and not self.zoom_active:
            return 1.0 / 20.0  # Idle 20Hz
        elif v < 50:
            return 1.0 / 60.0  # Slow 60Hz
        elif v < 150:
            return 1.0 / 90.0  # Medium 90Hz
        elif v < 300:
            return 1.0 / 120.0 # Fast 120Hz
        else:
            return 1.0 / 150.0 # Extreme 150Hz

    def _loop(self):
        last_time = time.perf_counter()
        while self.running:
            with self.lock:
                max_vel = max(abs(self.scroll_velocity), abs(self.zoom_velocity))
                dt = self.get_adaptive_dt(max_vel)
            
            # Adaptive sleep
            t_curr = time.perf_counter()
            elapsed = t_curr - last_time
            sleep_time = max(0, dt - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
            
            last_time = time.perf_counter()
            real_dt = max(last_time - t_curr + sleep_time, 0.001)

            with self.lock:
                # Process Scroll
                if self.scroll_active:
                    if abs(self.scroll_velocity) > 0.1:
                        self.mouse.scroll(-self.scroll_velocity * real_dt * 100)
                else:
                    if abs(self.scroll_velocity) > 0.1:
                        self.scroll_velocity *= math.exp(-self.momentum_k * real_dt)
                        self.mouse.scroll(-self.scroll_velocity * real_dt * 100)
                    else:
                        self.scroll_velocity = 0.0
                        
                # Process Zoom
                if self.zoom_active:
                    if abs(self.zoom_velocity) > 0.1:
                        self.mouse.scroll(-self.zoom_velocity * real_dt * 100)
                else:
                    if abs(self.zoom_velocity) > 0.1:
                        self.mouse.ctrl_down()
                        self.zoom_velocity *= math.exp(-self.momentum_k * real_dt)
                        self.mouse.scroll(-self.zoom_velocity * real_dt * 100)
                    else:
                        self.zoom_velocity = 0.0
                        self.mouse.ctrl_up()
