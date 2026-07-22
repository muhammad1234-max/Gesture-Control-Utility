export interface GestureDefinition {
  id: string;
  name: string;
  icon: string;
  activation_rule: string;
  priority: number;
  confidence_threshold: number;
  cooldown_ms: number;
  description: string;
  help_text: string;
  parameters: Record<string, any>;
}

export const GestureRegistry: Record<string, GestureDefinition> = {
  OPEN_HAND: {
    id: "OPEN_HAND",
    name: "Cursor Tracking",
    icon: "Hand",
    activation_rule: "Relaxed open palm with extended fingers",
    priority: 10,
    confidence_threshold: 0.50,
    cooldown_ms: 0,
    description: "Smooth 1€ filtered cursor movement following index fingertip.",
    help_text: "Keep your palm facing the camera and extend your index finger to move the mouse.",
    parameters: { smoothing_min_cutoff: 0.05, beta: 0.8 }
  },
  LEFT_CLICK: {
    id: "LEFT_CLICK",
    name: "Left Click & Drag",
    icon: "MousePointerClick",
    activation_rule: "Index finger + Thumb tip pinch (< 0.05 dist)",
    priority: 50,
    confidence_threshold: 0.80,
    cooldown_ms: 150,
    description: "Triggers Left Down on pinch and Left Up on release. Full continuous cursor movement during drag.",
    help_text: "Pinch index and thumb together to click or hold to drag items.",
    parameters: { pinch_distance: 0.05, hold_drag_enabled: true }
  },
  RIGHT_CLICK: {
    id: "RIGHT_CLICK",
    name: "Right Click Context Menu",
    icon: "MousePointer2",
    activation_rule: "Middle finger + Thumb tip pinch (< 0.05 dist)",
    priority: 50,
    confidence_threshold: 0.80,
    cooldown_ms: 300,
    description: "Triggers single Right Click context menu emission.",
    help_text: "Pinch middle finger and thumb together to open context menus.",
    parameters: { pinch_distance: 0.05 }
  },
  SCROLL: {
    id: "SCROLL",
    name: "Touchpad Smart Scroll",
    icon: "Move",
    activation_rule: "Index & Middle extended, Ring & Pinky folded (150ms hold)",
    priority: 70,
    confidence_threshold: 0.85,
    cooldown_ms: 200,
    description: "Locks cursor position and translates vertical hand motion to smooth analog scroll with momentum.",
    help_text: "Extend index and middle finger, fold ring and pinky. Hold for 150ms to lock cursor and scroll.",
    parameters: { hold_ms: 150, accel_cap: 2000.0, deadzone: 0.015 }
  },
  ZOOM: {
    id: "ZOOM",
    name: "Analog Ctrl Zoom",
    icon: "ZoomIn",
    activation_rule: "Index & Middle extended + Thumb touching Ring finger/PIP",
    priority: 80,
    confidence_threshold: 0.85,
    cooldown_ms: 200,
    description: "Translates vertical hand motion to Ctrl + Mouse Wheel zoom in/out with instant Ctrl key release.",
    help_text: "Extend index & middle finger and touch thumb to ring finger. Move hand vertically to zoom.",
    parameters: { sensitivity: 1.2 }
  }
};
