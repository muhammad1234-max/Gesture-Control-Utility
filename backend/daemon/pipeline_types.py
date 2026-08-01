from enum import Enum, auto
from collections import deque
import threading

class LockReason(Enum):
    NONE = auto()
    CLICK = auto()
    DRAG = auto()

class CursorLockManager:
    def __init__(self):
        self.locked = False
        self.reason = LockReason.NONE
        self.anchor_x = None
        self.anchor_y = None
        self.lock = threading.Lock()

    def acquire(self, reason: LockReason, x: float, y: float) -> bool:
        with self.lock:
            if self.locked and self.reason == reason:
                return True
            if not self.locked:
                self.locked = True
                self.reason = reason
                self.anchor_x = x
                self.anchor_y = y
                return True
            return False

    def replace_owner(self, new_reason: LockReason) -> bool:
        with self.lock:
            if not self.locked:
                return False
            self.reason = new_reason
            return True

    def release(self, reason: LockReason) -> bool:
        with self.lock:
            if self.locked and self.reason == reason:
                self.locked = False
                self.reason = LockReason.NONE
                self.anchor_x = None
                self.anchor_y = None
                return True
            return False

class IntentType(Enum):
    MOVE_CURSOR = auto()
    LEFT_CLICK = auto()
    RIGHT_CLICK = auto()
    DRAG = auto()
    SCROLL = auto()
    ZOOM = auto()
    NO_HAND = auto()
    TRACKING_LOST = auto()
    IDLE = auto()

class ClickEvent(Enum):
    NONE = auto()
    DOWN = auto()
    UP = auto()
    RIGHT_DOWN = auto()
    RIGHT_UP = auto()

class InteractionSession:
    __slots__ = ['interaction_id', 'pending_events', 'cursor_locked', 'unlock_time', 'is_active']
    def __init__(self, interaction_id: str = ""):
        self.interaction_id = interaction_id
        self.pending_events = deque()
        self.cursor_locked = False
        self.unlock_time = 0.0
        self.is_active = True

    def destroy(self):
        # Active cleanup enforcement (Stage 6B)
        self.pending_events.clear()
        self.cursor_locked = False
        self.is_active = False

class UserIntent:
    __slots__ = ['type', 'raw_x', 'raw_y', 'pinch_distance', 'confidence', 'timestamp', 'session']
    def __init__(self, type: IntentType, raw_x: float, raw_y: float, pinch_distance: float, confidence: float, timestamp: float, session: InteractionSession = None):
        self.type = type
        self.raw_x = raw_x
        self.raw_y = raw_y
        self.pinch_distance = pinch_distance
        self.confidence = confidence
        self.timestamp = timestamp
        self.session = session

class CommandType(Enum):
    MOVE_CURSOR = auto()
    DRAG = auto()
    LEFT_DOWN = auto()
    LEFT_UP = auto()
    RIGHT_DOWN = auto()
    RIGHT_UP = auto()
    SCROLL = auto()
    ZOOM = auto()
    NONE = auto()

class ActionCommand:
    __slots__ = ['type', 'x', 'y', 'ticks', 'velocity', 'interaction_id']
    def __init__(self, type: CommandType, x: float = 0.0, y: float = 0.0, ticks: int = 0, velocity: float = 0.0, interaction_id: str = ""):
        self.type = type
        self.x = x
        self.y = y
        self.ticks = ticks
        self.velocity = velocity
        self.interaction_id = interaction_id
