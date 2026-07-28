from enum import Enum, auto

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

class UserIntent:
    __slots__ = ['type', 'raw_x', 'raw_y', 'pinch_distance', 'confidence', 'timestamp', 'is_engaging', 'interaction_id']
    def __init__(self, type: IntentType, raw_x: float, raw_y: float, pinch_distance: float, confidence: float, timestamp: float, is_engaging: bool = False, interaction_id: str = ""):
        self.type = type
        self.raw_x = raw_x
        self.raw_y = raw_y
        self.pinch_distance = pinch_distance
        self.confidence = confidence
        self.timestamp = timestamp
        self.is_engaging = is_engaging
        self.interaction_id = interaction_id

class CommandType(Enum):
    MOVE_CURSOR = auto()
    DRAG = auto()
    LEFT_DOWN = auto()
    LEFT_UP = auto()
    RIGHT_CLICK = auto()
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
