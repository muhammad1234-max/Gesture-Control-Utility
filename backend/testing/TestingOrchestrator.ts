import { FrameBus } from '../framebus/FrameBus';
import { LandmarkBus } from '../tracking/LandmarkBus';
import { GestureBus } from '../gesture/GestureBus';
import { IntentBus } from '../intent/IntentBus';
import { ActionBus } from '../action/ActionBus';
import { LatencyProfiler } from './LatencyProfiler';
import { FPSSynchronizer } from './FPSSynchronizer';

export class TestingOrchestrator {
  private static instance: TestingOrchestrator;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): TestingOrchestrator {
    if (!TestingOrchestrator.instance) {
      TestingOrchestrator.instance = new TestingOrchestrator();
    }
    return TestingOrchestrator.instance;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Observer Pattern: Attach to buses without interfering with downstream consumers
    
    // 1. Camera / FrameBus
    FrameBus.getInstance().subscribe((frame) => {
      FPSSynchronizer.getInstance().tick('camera');
      // Latency profiler needs a frame ID. Let's just track capture time if available.
    });

    // 2. Tracking / LandmarkBus
    LandmarkBus.getInstance().subscribe((frame) => {
      FPSSynchronizer.getInstance().tick('tracking');
      const now = performance.now();
      const trackingLatency = now - frame.timestamp; // rough estimate since timestamp is creation
      LatencyProfiler.getInstance().recordLatency('Tracking', trackingLatency, frame.id);
    });

    // 3. Gesture / GestureBus
    GestureBus.getInstance().subscribe((frame) => {
      FPSSynchronizer.getInstance().tick('gesture');
      // Gesture latency is already measured in GestureEngine, but we can observer the bus arrival time delta
    });

    // 4. Intent / IntentBus
    IntentBus.getInstance().subscribe((frame) => {
      FPSSynchronizer.getInstance().tick('intent');
    });

    // 5. Action / ActionBus
    ActionBus.getInstance().subscribe((action) => {
      FPSSynchronizer.getInstance().tick('action');
    });

    // Execution FPS is driven by ExecutionWorker, which we'll have to rely on ExecutionDiagnostics for,
    // or we can just tick here assuming everything on ActionBus gets executed.
    
    console.log('[TestingOrchestrator] Observer Framework attached to all Event Buses.');
  }

  public stop() {
    this.isRunning = false;
    console.log('[TestingOrchestrator] Observer Framework detached.');
  }
}
