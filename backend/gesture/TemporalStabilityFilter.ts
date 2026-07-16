import { GestureType } from '@shared/types';

const CONFIRMATION_TIME_MS = 60; // Require gesture to be stable for 60ms
const RELEASE_TIME_MS = 100;     // Require gesture to be lost for 100ms before clearing

export class TemporalStabilityFilter {
  // We use object pooling or simple primitives for states to avoid GC
  private activeGestures: Set<GestureType> = new Set();
  
  // Track continuous presence and absence times
  private presenceTimes: Map<GestureType, number> = new Map();
  private absenceTimes: Map<GestureType, number> = new Map();

  public filter(candidateGestures: GestureType[], deltaTimeMs: number): GestureType[] {
    // 1. Update presence times for candidates
    for (const gesture of candidateGestures) {
      const currentPresence = this.presenceTimes.get(gesture) || 0;
      this.presenceTimes.set(gesture, currentPresence + deltaTimeMs);
      
      // Reset absence counter because it is present
      this.absenceTimes.set(gesture, 0);

      // Promote to active if stable
      if (!this.activeGestures.has(gesture) && this.presenceTimes.get(gesture)! >= CONFIRMATION_TIME_MS) {
        this.activeGestures.add(gesture);
      }
    }

    // 2. Update absence times for active gestures not in candidates
    // We create a static array to iterate over the Set to avoid iterator allocation if needed,
    // but Set iterator allocation is minimal. 
    for (const gesture of Array.from(this.activeGestures)) {
      if (!candidateGestures.includes(gesture)) {
        const currentAbsence = this.absenceTimes.get(gesture) || 0;
        this.absenceTimes.set(gesture, currentAbsence + deltaTimeMs);
        
        // Reset presence counter because it is absent
        this.presenceTimes.set(gesture, 0);

        // Demote if lost for too long
        if (this.absenceTimes.get(gesture)! >= RELEASE_TIME_MS) {
          this.activeGestures.delete(gesture);
        }
      }
    }
    
    // Fallback logic
    if (this.activeGestures.size === 0 && candidateGestures.length === 0) {
      this.activeGestures.add(GestureType.NEUTRAL);
    } else {
      this.activeGestures.delete(GestureType.NEUTRAL);
    }

    return Array.from(this.activeGestures);
  }
  
  public reset() {
    this.activeGestures.clear();
    this.presenceTimes.clear();
    this.absenceTimes.clear();
  }
}
