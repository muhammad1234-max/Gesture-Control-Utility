import math
import time

def dist_3d(p1, p2):
    return math.sqrt((p1["x"] - p2["x"])**2 + (p1["y"] - p2["y"])**2 + (p1.get("z", 0) - p2.get("z", 0))**2)

def calc_angle(p1, p2, p3):
    # Vector p2->p1 and p2->p3
    v1 = (p1["x"] - p2["x"], p1["y"] - p2["y"])
    v2 = (p3["x"] - p2["x"], p3["y"] - p2["y"])
    dot = v1[0]*v2[0] + v1[1]*v2[1]
    mag1 = math.sqrt(v1[0]**2 + v1[1]**2)
    mag2 = math.sqrt(v2[0]**2 + v2[1]**2)
    if mag1 * mag2 == 0: return 180.0
    cosine = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cosine))

class GestureIntentRecognizer:
    def __init__(self):
        self.history = [] # Rolling 10-frame landmarks
        self.wrist_history = [] # Rolling 5-frame wrist coords
        
    def evaluate(self, landmarks, hand_scale):
        if not landmarks or len(landmarks) < 21:
            return self._empty_response()

        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        index_mcp = landmarks[5]
        index_pip = landmarks[6]
        index_tip = landmarks[8]
        middle_mcp = landmarks[9]
        middle_pip = landmarks[10]
        middle_tip = landmarks[12]
        ring_mcp = landmarks[13]
        ring_pip = landmarks[14]
        ring_tip = landmarks[16]
        pinky_mcp = landmarks[17]
        pinky_pip = landmarks[18]
        pinky_tip = landmarks[20]

        # Update histories
        self.history.append(landmarks)
        if len(self.history) > 10: self.history.pop(0)
        
        self.wrist_history.append(wrist)
        if len(self.wrist_history) > 5: self.wrist_history.pop(0)

        # 1. Wrist Stability (0-100%)
        if len(self.wrist_history) >= 2:
            wrist_deltas = [dist_3d(self.wrist_history[i], self.wrist_history[i-1]) for i in range(1, len(self.wrist_history))]
            avg_wrist_move = sum(wrist_deltas) / len(wrist_deltas)
            wrist_stability = max(0.0, min(100.0, (1.0 - (avg_wrist_move / 0.05)) * 100.0))
        else:
            wrist_stability = 95.0

        # 2. Joint Extension Angles (Straight = ~160°-180°, Bent = < 110°)
        index_angle = calc_angle(index_mcp, index_pip, index_tip)
        middle_angle = calc_angle(middle_mcp, middle_pip, middle_tip)
        ring_angle = calc_angle(ring_mcp, ring_pip, ring_tip)
        pinky_angle = calc_angle(pinky_mcp, pinky_pip, pinky_tip)

        # Distances normalized to hand scale
        dist_thumb_index = dist_3d(thumb_tip, index_tip) / (hand_scale / 0.1)
        dist_thumb_middle = dist_3d(thumb_tip, middle_tip) / (hand_scale / 0.1)
        dist_thumb_index_pip = dist_3d(thumb_tip, index_pip) / (hand_scale / 0.1)

        # Evaluate Individual Gestures

        # A. OPEN HAND
        open_hand_conf = min(100.0, max(0.0, ((index_angle + middle_angle + ring_angle + pinky_angle) / 720.0) * 100.0))
        open_hand_stab = wrist_stability
        open_hand_reason = f"Joint angles straight ({int(index_angle)}°, {int(middle_angle)}°), relaxed open palm"

        # B. LEFT CLICK (Index + Thumb Pinch)
        pinch_closeness = max(0.0, min(1.0, (0.06 - dist_thumb_index) / 0.04))
        left_click_conf = round(pinch_closeness * 100.0, 1)
        left_click_stab = round(wrist_stability * 0.9 + 10.0, 1)
        left_click_reason = f"Thumb-Index pinch distance {dist_thumb_index:.3f} (< 0.05), angle {int(index_angle)}°"

        # C. RIGHT CLICK (Middle + Thumb Pinch)
        middle_closeness = max(0.0, min(1.0, (0.06 - dist_thumb_middle) / 0.04))
        right_click_conf = round(middle_closeness * 100.0, 1)
        right_click_stab = round(wrist_stability * 0.9 + 10.0, 1)
        right_click_reason = f"Thumb-Middle pinch distance {dist_thumb_middle:.3f} (< 0.05)"

        # D. SCROLL MODE (Index & Middle Extended, Ring & Pinky Folded)
        scroll_ext_score = (index_angle > 140.0) and (middle_angle > 140.0)
        scroll_fold_score = (ring_angle < 120.0) and (pinky_angle < 120.0)
        scroll_intent = 1.0 if (scroll_ext_score and scroll_fold_score and dist_thumb_index_pip > 0.06) else 0.0
        scroll_conf = round(scroll_intent * 95.0 + (index_angle / 360.0) * 5.0, 1) if scroll_intent > 0 else 5.0
        scroll_stab = round(wrist_stability, 1)
        scroll_reason = f"Index/Middle extended ({int(index_angle)}°/{int(middle_angle)}°), Ring/Pinky folded ({int(ring_angle)}°/{int(pinky_angle)}°)"

        # E. ZOOM MODE (Closed Fist: All fingers folded)
        fist_score = (index_angle < 120.0) and (middle_angle < 120.0) and (ring_angle < 120.0) and (pinky_angle < 120.0)
        zoom_intent = 1.0 if fist_score else 0.0
        zoom_conf = round(zoom_intent * 98.0, 1) if zoom_intent > 0 else 1.0
        zoom_stab = round(wrist_stability, 1)
        zoom_reason = f"All fingers folded ({int(index_angle)}°/{int(middle_angle)}°/{int(ring_angle)}°/{int(pinky_angle)}°)"

        return {
            "OPEN_HAND": {
                "confidence": round(open_hand_conf, 1),
                "stability": round(open_hand_stab, 1),
                "intent_score": round(open_hand_conf / 100.0, 2),
                "activation_reason": open_hand_reason
            },
            "LEFT_CLICK": {
                "confidence": left_click_conf,
                "stability": left_click_stab,
                "intent_score": round(left_click_conf / 100.0, 2),
                "activation_reason": left_click_reason
            },
            "RIGHT_CLICK": {
                "confidence": right_click_conf,
                "stability": right_click_stab,
                "intent_score": round(right_click_conf / 100.0, 2),
                "activation_reason": right_click_reason
            },
            "SCROLL": {
                "confidence": scroll_conf,
                "stability": scroll_stab,
                "intent_score": round(scroll_conf / 100.0, 2),
                "activation_reason": scroll_reason
            },
            "ZOOM": {
                "confidence": zoom_conf,
                "stability": zoom_stab,
                "intent_score": round(zoom_conf / 100.0, 2),
                "activation_reason": zoom_reason
            }
        }

    def _empty_response(self):
        empty_item = {"confidence": 0.0, "stability": 0.0, "intent_score": 0.0, "activation_reason": "No hand landmark data"}
        return {k: dict(empty_item) for k in ["OPEN_HAND", "LEFT_CLICK", "RIGHT_CLICK", "SCROLL", "ZOOM"]}
