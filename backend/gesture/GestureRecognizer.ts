import { TrackingFrame, GestureFrame, FingerState, PinchStrength, FingerType, FingerExtensionState, Handedness } from '@shared/types';
import { FingerStateSolver } from './FingerStateSolver';
import { PinchDetector } from './PinchDetector';
import { TemporalStabilityFilter } from './TemporalStabilityFilter';
import { GestureResolver } from './GestureResolver';

export class GestureRecognizer {
  private stabilityFilter = new TemporalStabilityFilter();
  private resolver = new GestureResolver();

  // Internal Object Pools (Mutable working states)
  private fingerStates: FingerState[] = [];
  private pinchStrengths: PinchStrength[] = [];
  
  private lastTrackingFrame: TrackingFrame | null = null;
  
  constructor() {
    this.initPools();
  }

  private initPools() {
    for (let i = 0; i < 5; i++) {
      this.fingerStates.push({
        finger: i as FingerType,
        extension: FingerExtensionState.UNKNOWN,
        curl: 0,
        spread: 0,
        velocity: 0
      });
    }
    for (let i = 0; i < 4; i++) {
      this.pinchStrengths.push({
        finger: (i + 1) as FingerType, // Index to Pinky
        distance: 1.0,
        strength: 0,
        velocity: 0,
        closingSpeed: 0,
        confidence: 0,
        isPinching: false
      });
    }
  }

  /**
   * Pure pipeline execution. Returns a freshly allocated immutable snapshot
   * as requested to decouple bus subscribers from internal ring buffers.
   */
  public recognize(frame: TrackingFrame, deltaTimeMs: number): GestureFrame | null {
    if (!frame.hands || frame.hands.length === 0) {
      this.stabilityFilter.reset();
      this.lastTrackingFrame = frame;
      return null;
    }

    // We only process the primary hand for now (first detected)
    const primaryHand = frame.hands[0];
    const prevHand = this.lastTrackingFrame?.hands[0] || null;

    // 1. Validation (Ensures landmarks exist)
    if (primaryHand.landmarks.length < 21) return null;

    const t0 = performance.now();

    // 2. Finger State Solver
    FingerStateSolver.solve(
      primaryHand.landmarks,
      prevHand ? prevHand.landmarks : null,
      deltaTimeMs,
      this.fingerStates
    );

    // 3. Pinch Detector
    PinchDetector.detect(
      primaryHand.landmarks,
      prevHand ? prevHand.landmarks : null,
      deltaTimeMs,
      this.pinchStrengths
    );

    // 4 & 5. Pose Classifier & Resolver
    const resolved = this.resolver.resolve(this.fingerStates, this.pinchStrengths);

    // 6. Temporal Stability Filter
    const activeGestures = this.stabilityFilter.filter(resolved.candidateGestures, deltaTimeMs);

    const pipelineLatency = performance.now() - t0;

    this.lastTrackingFrame = frame;

    // 7. Output Immutable Snapshot (Allocated explicitly for decoupling)
    return this.createImmutableSnapshot(
      frame,
      primaryHand.handedness === Handedness.LEFT ? 'left' : 'right',
      primaryHand.score,
      resolved.candidateGestures,
      activeGestures,
      resolved.gestureConfidences,
      pipelineLatency
    );
  }

  private createImmutableSnapshot(
    trackingFrame: TrackingFrame,
    dominantHand: 'left' | 'right',
    trackingConfidence: number,
    candidates: string[],
    active: string[],
    confidences: Record<string, number>,
    pipelineLatency: number
  ): GestureFrame {
    
    // Deep clone internal state to guarantee immutability for the bus
    const clonedFingers = this.fingerStates.map(f => ({ ...f }));
    const clonedPinches = this.pinchStrengths.map(p => ({ ...p }));
    const clonedConfidences = { ...confidences };
    
    return {
      frameId: Math.floor(Math.random() * 1000000), // Unique ID for traceability
      captureTimestamp: trackingFrame.timestamp,    // Pass-through
      trackingTimestamp: trackingFrame.timestamp,   // Pass-through
      recognitionTimestamp: Date.now(),
      pipelineLatency,
      trackingConfidence,
      
      dominantHand,
      activeGestures: [...active] as any,
      candidateGestures: [...candidates] as any,
      gestureConfidences: clonedConfidences,
      
      fingerStates: clonedFingers,
      pinchStrengths: clonedPinches,
      
      handVelocity: { x: 0, y: 0, z: 0 }, // Future math
      handDirection: { x: 0, y: 0, z: 0 }, // Future math
      handRotation: { x: 0, y: 0, z: 0 }, // Future math
      handScale: 1.0 // Future math
    };
  }
}
