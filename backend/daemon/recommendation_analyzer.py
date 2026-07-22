import time

class RecommendationAnalyzer:
    def __init__(self):
        self.history_size = 30 * 30 # 30 seconds at 30 fps
        self.x_history = []
        self.y_history = []
        self.last_recommendation_time = 0.0
        
    def process_coordinates(self, index_x, index_y, t_curr):
        self.x_history.append(index_x)
        self.y_history.append(index_y)
        
        if len(self.x_history) > self.history_size:
            self.x_history.pop(0)
            self.y_history.pop(0)
            
    def get_recommendation(self, t_curr):
        if len(self.x_history) < self.history_size:
            return None
            
        # Only recommend once every 60 seconds
        if t_curr - self.last_recommendation_time < 60.0:
            return None
            
        min_x = min(self.x_history)
        max_x = max(self.x_history)
        min_y = min(self.y_history)
        max_y = max(self.y_history)
        
        # Analyze if user is not using the edges
        if min_x > 0.3 or max_x < 0.7 or min_y > 0.3 or max_y < 0.7:
            self.last_recommendation_time = t_curr
            return {
                "type": "WORKING_AREA",
                "suggested": {
                    "minX": max(0.0, min_x - 0.1),
                    "maxX": min(1.0, max_x + 0.1),
                    "minY": max(0.0, min_y - 0.1),
                    "maxY": min(1.0, max_y + 0.1)
                }
            }
            
        return None
