import { IntentDiagnosticsData, IntentState, IntentType } from '@shared/types';
import { IntentBus } from './IntentBus';
import { IntentConfigManager } from './IntentConfigManager';

export class IntentDiagnostics {
  private static instance: IntentDiagnostics;
  
  private data: IntentDiagnosticsData = {
    currentState: IntentState.IDLE,
    previousState: IntentState.IDLE,
    transitionReason: 'Init',
    stateDurationMs: 0,
    pipelineLatencyMs: 0,
    primaryIntent: IntentType.NONE,
    candidateIntents: [],
    confidence: 0,
    activeThresholds: {},
    movementDistance: 0,
    averageVelocity: 0,
    intentFps: 0,
    engineFps: 0,
    transitionCount: 0,
    confirmedClicks: 0,
    cancelledClicks: 0,
    dragConfirmations: 0,
    scrollActivations: 0,
    holdActivations: 0,
    doubleClicks: 0
  };

  private frameCount = 0;
  private lastFpsTime = Date.now();

  private constructor() {
    IntentBus.getInstance().subscribe(this.onIntentFrame.bind(this));
  }

  public static getInstance(): IntentDiagnostics {
    if (!IntentDiagnostics.instance) {
      IntentDiagnostics.instance = new IntentDiagnostics();
    }
    return IntentDiagnostics.instance;
  }

  public recordTransition(from: IntentState, to: IntentState, reason: string) {
    this.data.transitionCount++;
    this.data.previousState = from;
    this.data.currentState = to;
    this.data.transitionReason = reason;

    // Track intent specific metrics
    if (to === IntentState.CLICK_CONFIRMED) this.data.confirmedClicks++;
    if (to === IntentState.CANCELLED && from === IntentState.CLICK_CANDIDATE) this.data.cancelledClicks++;
    if (to === IntentState.DRAGGING && from === IntentState.DRAG_PENDING) this.data.dragConfirmations++;
    if (to === IntentState.SCROLLING && from === IntentState.SCROLL_PENDING) this.data.scrollActivations++;
    if (to === IntentState.HOLDING && from === IntentState.HOLD_PENDING) this.data.holdActivations++;
    if (to === IntentState.DOUBLE_CLICK_PENDING) this.data.doubleClicks++; // Simplified for now
  }

  private onIntentFrame(frame: any) {
    this.frameCount++;
    
    const now = Date.now();
    if (now - this.lastFpsTime >= 1000) {
      this.data.intentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
      
      // Update active thresholds for sandbox debugging
      this.data.activeThresholds = { ...IntentConfigManager.getInstance().getConfig() };
    }

    this.data.pipelineLatencyMs = frame.pipelineLatencyMs;
    this.data.stateDurationMs = frame.elapsedTimeInStateMs;
    this.data.primaryIntent = frame.primaryIntent;
    this.data.confidence = frame.confidence;
    this.data.movementDistance = frame.movementSinceStateStart;
    this.data.averageVelocity = frame.averageVelocity;
  }

  public getTelemetry(): IntentDiagnosticsData {
    return this.data;
  }
}
