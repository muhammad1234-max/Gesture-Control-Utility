import { NormalizedLandmark, FingerType, PinchStrength } from '@shared/types';
import { MathUtils } from './math';

const PINCH_THRESHOLDS = {
  ACTIVATION: 0.04,  // normalized distance
  RELEASE: 0.07      // hysteresis
};

export class PinchDetector {
  /**
   * Solves pinch state (distance, velocity, closing speed, strength, confidence) 
   * into the provided `outPinch` array.
   * Assumes `outPinch` is pre-populated with exactly 4 mutable PinchStrength objects.
   */
  public static detect(
    currentLandmarks: NormalizedLandmark[],
    previousLandmarks: NormalizedLandmark[] | null,
    deltaTimeMs: number,
    outPinch: PinchStrength[]
  ): void {
    const thumbTip = currentLandmarks[4];
    const prevThumbTip = previousLandmarks ? previousLandmarks[4] : null;

    const fingerTips = [
      { type: FingerType.INDEX, current: currentLandmarks[8], prev: previousLandmarks ? previousLandmarks[8] : null },
      { type: FingerType.MIDDLE, current: currentLandmarks[12], prev: previousLandmarks ? previousLandmarks[12] : null },
      { type: FingerType.RING, current: currentLandmarks[16], prev: previousLandmarks ? previousLandmarks[16] : null },
      { type: FingerType.PINKY, current: currentLandmarks[20], prev: previousLandmarks ? previousLandmarks[20] : null }
    ];

    for (let i = 0; i < 4; i++) {
      const target = fingerTips[i];
      const distance = MathUtils.distance(thumbTip, target.current);
      
      let closingSpeed = 0;
      let relativeVelocity = 0;

      if (prevThumbTip && target.prev && deltaTimeMs > 0) {
        const prevDistance = MathUtils.distance(prevThumbTip, target.prev);
        // Positive closing speed means fingers are getting closer
        closingSpeed = (prevDistance - distance) / (deltaTimeMs / 1000.0);
        
        // Relative velocity of the target finger tip in space
        const v = MathUtils.distance(target.current, target.prev) / (deltaTimeMs / 1000.0);
        relativeVelocity = v;
      }

      // Hysteresis State Machine
      const state = outPinch[i];
      const wasPinching = state.isPinching;
      let isPinching = wasPinching;

      if (!wasPinching && distance < PINCH_THRESHOLDS.ACTIVATION) {
        // Require positive closing speed or stationary to activate, 
        // avoiding false triggers when moving apart rapidly
        if (closingSpeed >= -0.1) {
          isPinching = true;
        }
      } else if (wasPinching && distance > PINCH_THRESHOLDS.RELEASE) {
        isPinching = false;
      }

      // Strength normalized 0-1
      const strength = Math.max(0, Math.min(1, 1.0 - (distance / PINCH_THRESHOLDS.RELEASE)));
      
      // Confidence heuristic
      let confidence = strength;
      if (isPinching && closingSpeed > 0.5) confidence += 0.2; // High closing speed boosts confidence
      if (isPinching && relativeVelocity > 2.0) confidence -= 0.3; // High absolute movement reduces confidence (motion blur)
      confidence = Math.max(0, Math.min(1, confidence));

      // Output
      state.finger = target.type;
      state.distance = distance;
      state.strength = strength;
      state.velocity = relativeVelocity;
      state.closingSpeed = closingSpeed;
      state.confidence = confidence;
      state.isPinching = isPinching;
    }
  }
}
