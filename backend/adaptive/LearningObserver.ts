import { FrameBus } from '../framebus/FrameBus';
import { GestureBus } from '../gesture/GestureBus';
import { IntentBus } from '../intent/IntentBus';
import { ActionBus } from '../action/ActionBus';
import { BehaviorAnalyzer } from './BehaviorAnalyzer';
import { Logger } from '../system/Logger';

export class LearningObserver {
  private static instance: LearningObserver;
  private isEnabled = true;

  private constructor() {
    this.subscribeAll();
  }

  public static getInstance(): LearningObserver {
    if (!LearningObserver.instance) {
      LearningObserver.instance = new LearningObserver();
    }
    return LearningObserver.instance;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  private subscribeAll() {
    // Note: We use setTimeout/setImmediate to ensure the observer NEVER blocks the main execution pipeline.
    
    FrameBus.getInstance().subscribe((frame) => {
      if (!this.isEnabled) return;
      setImmediate(() => {
        // Collect raw hand movement speeds, bounding box sizes (for lighting/distance)
        BehaviorAnalyzer.getInstance().analyzeFrame(frame);
      });
    });

    GestureBus.getInstance().subscribe((gestureEvent) => {
      if (!this.isEnabled) return;
      setImmediate(() => {
        // Collect pinch gaps, gesture durations, false positive flags
        BehaviorAnalyzer.getInstance().analyzeGesture(gestureEvent);
      });
    });

    IntentBus.getInstance().subscribe((intentEvent) => {
      if (!this.isEnabled) return;
      setImmediate(() => {
        // Collect resolved states (e.g., how long a drag was held)
        BehaviorAnalyzer.getInstance().analyzeIntent(intentEvent);
      });
    });

    ActionBus.getInstance().subscribe((actionEvent) => {
      if (!this.isEnabled) return;
      setImmediate(() => {
        // Collect execution success and latency
        BehaviorAnalyzer.getInstance().analyzeAction(actionEvent);
      });
    });

    Logger.info('Adaptive Learning Observer attached to all buses (Passive Mode).');
  }
}
