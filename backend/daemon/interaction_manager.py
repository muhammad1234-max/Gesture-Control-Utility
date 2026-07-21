import time
import json

class InteractionModule:
    def __init__(self, name, priority, manager):
        self.name = name
        self.priority = priority
        self.manager = manager
        self.is_active = False

    def get_priority(self):
        return self.priority if self.is_active else 0

    def process(self, landmarks, confidence, t_curr, dt):
        """Analyze hand data and update internal state/is_active"""
        pass

    def execute(self, t_curr, dt):
        """Execute the actual OS injections if this module won arbitration"""
        pass
        
    def recover(self):
        """Emergency reset"""
        self.is_active = False

class PriorityManager:
    def __init__(self):
        self.modules = []
        self.active_module = None
        self.last_seen_hand_time = time.perf_counter()
        self.SAFETY_TIMEOUT = 0.25
        self.recovery_mode = False

    def register_module(self, module):
        self.modules.append(module)
        # Sort descending by priority so highest evaluates first
        self.modules.sort(key=lambda m: m.priority, reverse=True)

    def update_hand_presence(self, has_hand, t_curr):
        if has_hand:
            self.last_seen_hand_time = t_curr
            if self.recovery_mode:
                self.recovery_mode = False
        else:
            if t_curr - self.last_seen_hand_time > self.SAFETY_TIMEOUT:
                if not self.recovery_mode:
                    self.emergency_recover()

    def arbitrate_and_execute(self, t_curr, dt):
        if self.recovery_mode:
            return

        # 2. Arbitrate highest priority
        highest_mod = None
        highest_prio = 0
        
        for m in self.modules:
            p = m.get_priority()
            if p > highest_prio:
                highest_prio = p
                highest_mod = m
                
        self.active_module = highest_mod
        
        # 3. Execute the winner
        if self.active_module:
            self.active_module.execute(t_curr, dt)

    def emergency_recover(self):
        print(json.dumps({"event": "EMERGENCY_RECOVER"}), flush=True)
        self.recovery_mode = True
        self.active_module = None
        for m in self.modules:
            m.recover()
