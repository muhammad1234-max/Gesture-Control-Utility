import { FingerState, PinchStrength, GestureType } from '@shared/types';
import { CLASSIFIERS } from './PoseClassifier';

export interface ResolveResult {
  candidateGestures: GestureType[];
  gestureConfidences: Record<GestureType, number>;
}

export class GestureResolver {
  // Use a preallocated object to avoid per-frame GC
  private outResult: ResolveResult = {
    candidateGestures: [],
    gestureConfidences: {} as Record<GestureType, number>
  };

  public resolve(fingerStates: FingerState[], pinchStrengths: PinchStrength[]): ResolveResult {
    this.outResult.candidateGestures.length = 0;
    
    // Clear previous confidences cleanly without allocating new objects
    for (const key of Object.keys(this.outResult.gestureConfidences)) {
      this.outResult.gestureConfidences[key as GestureType] = 0;
    }

    const gestureKeys = Object.keys(CLASSIFIERS) as GestureType[];
    
    for (const gesture of gestureKeys) {
      const classifier = CLASSIFIERS[gesture];
      const result = classifier(fingerStates, pinchStrengths);
      
      this.outResult.gestureConfidences[gesture] = result.confidence;

      if (result.confidence > 0.5) { // Activation threshold for candidates
        this.outResult.candidateGestures.push(gesture);
      }
    }

    return this.outResult;
  }
}
