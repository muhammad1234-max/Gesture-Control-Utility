import cv2

class CameraStream:
    def __init__(self):
        self.cap = None
        
    def open(self, index):
        if self.cap is not None:
            self.cap.release()
        self.cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        return self.cap.isOpened()
        
    def read(self):
        if self.cap is None: return False, None
        success, frame = self.cap.read()
        if success:
            return True, cv2.cvtColor(cv2.flip(frame, 1), cv2.COLOR_BGR2RGB)
        return False, None
        
    def close(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None
