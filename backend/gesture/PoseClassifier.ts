import { FingerState, FingerExtensionState, FingerType, PinchStrength, GestureType } from '@shared/types';

export interface PoseClassificationResult {
  confidence: number;
}

export interface IPoseClassifier {
  classify(fingerStates: FingerState[], pinches: PinchStrength[]): PoseClassificationResult;
}

function getFinger(states: FingerState[], type: FingerType): FingerState {
  return states.find(s => s.finger === type) || states[type];
}

function getPinch(pinches: PinchStrength[], type: FingerType): PinchStrength {
  return pinches.find(p => p.finger === type) || pinches[type - 1]; // Offset because thumb has no pinch
}

export class OpenHandClassifier implements IPoseClassifier {
  classify(fingerStates: FingerState[]): PoseClassificationResult {
    let extendedCount = 0;
    let confidenceSum = 0;
    
    for (const fs of fingerStates) {
      if (fs.extension === FingerExtensionState.EXTENDED) {
        extendedCount++;
        confidenceSum += (1.0 - fs.curl); // straighter = better confidence
      }
    }
    
    // Require at least 4 fingers extended for a confident open hand
    if (extendedCount < 4) return { confidence: 0 };
    return { confidence: confidenceSum / extendedCount };
  }
}

export class FistClassifier implements IPoseClassifier {
  classify(fingerStates: FingerState[]): PoseClassificationResult {
    let curledCount = 0;
    let confidenceSum = 0;
    
    for (const fs of fingerStates) {
      if (fs.extension === FingerExtensionState.CURLED) {
        curledCount++;
        confidenceSum += fs.curl; // tighter curl = better confidence
      }
    }
    
    // Require at least 4 fingers curled
    if (curledCount < 4) return { confidence: 0 };
    return { confidence: confidenceSum / curledCount };
  }
}

export class VictoryClassifier implements IPoseClassifier {
  classify(fingerStates: FingerState[]): PoseClassificationResult {
    const index = getFinger(fingerStates, FingerType.INDEX);
    const middle = getFinger(fingerStates, FingerType.MIDDLE);
    const ring = getFinger(fingerStates, FingerType.RING);
    const pinky = getFinger(fingerStates, FingerType.PINKY);
    
    if (
      index.extension === FingerExtensionState.EXTENDED &&
      middle.extension === FingerExtensionState.EXTENDED &&
      ring.extension === FingerExtensionState.CURLED &&
      pinky.extension === FingerExtensionState.CURLED
    ) {
      // Base confidence on index/middle straightness and ring/pinky tightness
      const conf = ((1.0 - index.curl) + (1.0 - middle.curl) + ring.curl + pinky.curl) / 4.0;
      
      // Bonus: Check spread between index and middle
      const spreadBonus = index.spread > 0.2 ? 0.2 : 0;
      return { confidence: Math.min(1.0, conf + spreadBonus) };
    }
    return { confidence: 0 };
  }
}

export class PointingClassifier implements IPoseClassifier {
  classify(fingerStates: FingerState[]): PoseClassificationResult {
    const index = getFinger(fingerStates, FingerType.INDEX);
    const middle = getFinger(fingerStates, FingerType.MIDDLE);
    const ring = getFinger(fingerStates, FingerType.RING);
    const pinky = getFinger(fingerStates, FingerType.PINKY);
    
    if (
      index.extension === FingerExtensionState.EXTENDED &&
      middle.extension !== FingerExtensionState.EXTENDED &&
      ring.extension !== FingerExtensionState.EXTENDED &&
      pinky.extension !== FingerExtensionState.EXTENDED
    ) {
      const conf = ((1.0 - index.curl) + middle.curl + ring.curl + pinky.curl) / 4.0;
      return { confidence: conf };
    }
    return { confidence: 0 };
  }
}

export class ThumbUpClassifier implements IPoseClassifier {
  classify(fingerStates: FingerState[]): PoseClassificationResult {
    const thumb = getFinger(fingerStates, FingerType.THUMB);
    const index = getFinger(fingerStates, FingerType.INDEX);
    const middle = getFinger(fingerStates, FingerType.MIDDLE);
    const ring = getFinger(fingerStates, FingerType.RING);
    const pinky = getFinger(fingerStates, FingerType.PINKY);
    
    if (
      thumb.extension === FingerExtensionState.EXTENDED &&
      index.extension === FingerExtensionState.CURLED &&
      middle.extension === FingerExtensionState.CURLED &&
      ring.extension === FingerExtensionState.CURLED &&
      pinky.extension === FingerExtensionState.CURLED
    ) {
      const conf = ((1.0 - thumb.curl) + index.curl + middle.curl + ring.curl + pinky.curl) / 5.0;
      return { confidence: conf };
    }
    return { confidence: 0 };
  }
}

// Map Pinch Strengths to GestureTypes natively
export class PinchClassifiers {
  static index(pinches: PinchStrength[]): PoseClassificationResult {
    const p = getPinch(pinches, FingerType.INDEX);
    return { confidence: p.confidence };
  }
  static middle(pinches: PinchStrength[]): PoseClassificationResult {
    const p = getPinch(pinches, FingerType.MIDDLE);
    return { confidence: p.confidence };
  }
  static ring(pinches: PinchStrength[]): PoseClassificationResult {
    const p = getPinch(pinches, FingerType.RING);
    return { confidence: p.confidence };
  }
  static pinky(pinches: PinchStrength[]): PoseClassificationResult {
    const p = getPinch(pinches, FingerType.PINKY);
    return { confidence: p.confidence };
  }
}

export const CLASSIFIERS: Record<GestureType, (fs: FingerState[], p: PinchStrength[]) => PoseClassificationResult> = {
  [GestureType.NEUTRAL]: () => ({ confidence: 0.1 }), // Base threshold
  [GestureType.OPEN_HAND]: (fs) => new OpenHandClassifier().classify(fs),
  [GestureType.CLOSED_FIST]: (fs) => new FistClassifier().classify(fs),
  [GestureType.VICTORY]: (fs) => new VictoryClassifier().classify(fs),
  [GestureType.POINTING]: (fs) => new PointingClassifier().classify(fs),
  [GestureType.THUMB_UP]: (fs) => new ThumbUpClassifier().classify(fs),
  [GestureType.THUMB_DOWN]: () => ({ confidence: 0 }), // Needs wrist rotation vector math later
  [GestureType.SCROLL_POSE]: () => ({ confidence: 0 }), // Defined later by FSM
  [GestureType.INDEX_PINCH]: (fs, p) => PinchClassifiers.index(p),
  [GestureType.MIDDLE_PINCH]: (fs, p) => PinchClassifiers.middle(p),
  [GestureType.RING_PINCH]: (fs, p) => PinchClassifiers.ring(p),
  [GestureType.PINKY_PINCH]: (fs, p) => PinchClassifiers.pinky(p)
};
