import mediapipe as mp

class HandTracker:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.hands = None

    def start(self):
        if self.hands is None:
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                model_complexity=0,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.7
            )

    def process(self, rgb_frame):
        if self.hands is None:
            return None
        return self.hands.process(rgb_frame)

    def stop(self):
        if self.hands is not None:
            self.hands.close()
            self.hands = None
