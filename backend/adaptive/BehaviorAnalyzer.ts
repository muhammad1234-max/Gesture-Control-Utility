import { UserProfiler } from './UserProfiler';
import { AdaptiveScheduler } from './AdaptiveScheduler';

export class BehaviorAnalyzer {
  private static instance: BehaviorAnalyzer;

  private constructor() {}

  public static getInstance(): BehaviorAnalyzer {
    if (!BehaviorAnalyzer.instance) {
      BehaviorAnalyzer.instance = new BehaviorAnalyzer();
    }
    return BehaviorAnalyzer.instance;
  }

  public analyzeFrame(frame: any) {
    // Analyze cursor movement, tremor jitter, lighting
    // Calculate metrics and update UserProfiler buffers
  }

  public analyzeGesture(gestureEvent: any) {
    // For pinch: measure the exact Euclidean distance of the gap
    if (gestureEvent.type === 'PINCH') {
      const gap = gestureEvent.gapDistance || 0.05; 
      UserProfiler.getInstance().recordMetric('pinch.gap', gap);
      AdaptiveScheduler.getInstance().notifyActivity();
    }
  }

  public analyzeIntent(intentEvent: any) {
    // Measure drag hold times, scroll velocities
  }

  public analyzeAction(actionEvent: any) {
    // Measure click success (was there a rapid double-click that was unintended?)
  }
}
