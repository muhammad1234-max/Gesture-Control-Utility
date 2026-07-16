import { FingerState, FingerType, FingerExtensionState, NormalizedLandmark } from '@shared/types';
import { MathUtils } from './math';

const FINGER_INDICES = {
  [FingerType.THUMB]: [0, 1, 2, 3, 4],
  [FingerType.INDEX]: [0, 5, 6, 7, 8],
  [FingerType.MIDDLE]: [0, 9, 10, 11, 12],
  [FingerType.RING]: [0, 13, 14, 15, 16],
  [FingerType.PINKY]: [0, 17, 18, 19, 20]
};

export class FingerStateSolver {
  /**
   * Solves finger state (extension, curl, spread, velocity) into the provided `outState` array.
   * Assumes `outState` is pre-populated with exactly 5 mutable FingerState objects.
   */
  public static solve(
    currentLandmarks: NormalizedLandmark[],
    previousLandmarks: NormalizedLandmark[] | null,
    deltaTimeMs: number,
    outState: FingerState[]
  ): void {
    
    for (let i = 0; i < 5; i++) {
      const fingerType = i as FingerType;
      const indices = FINGER_INDICES[fingerType];
      
      const mcp = currentLandmarks[indices[1]];
      const pip = currentLandmarks[indices[2]];
      const dip = currentLandmarks[indices[3]];
      const tip = currentLandmarks[indices[4]];
      const wrist = currentLandmarks[0];

      // 1. Calculate Curl & Extension
      // Sum the interior joint angles (MCP, PIP, DIP)
      const mcpAngle = MathUtils.angleBetweenPoints(wrist, mcp, pip);
      const pipAngle = MathUtils.angleBetweenPoints(mcp, pip, dip);
      const dipAngle = MathUtils.angleBetweenPoints(pip, dip, tip);
      
      const totalCurlAngle = mcpAngle + pipAngle + dipAngle;
      
      // Map curl angle to 0.0 (straight) -> 1.0 (fully curled)
      // Max possible sum is roughly 3 * pi = 9.42 radians, but realistically ~ 4-5 radians max
      const maxRealisticCurl = Math.PI * 1.5;
      let curl = totalCurlAngle / maxRealisticCurl;
      if (curl < 0) curl = 0;
      if (curl > 1) curl = 1;
      
      let extension = FingerExtensionState.UNKNOWN;
      if (curl < 0.3) {
        extension = FingerExtensionState.EXTENDED;
      } else if (curl > 0.7) {
        extension = FingerExtensionState.CURLED;
      } else {
        extension = FingerExtensionState.BENT;
      }
      
      // Thumb has different mechanics
      if (fingerType === FingerType.THUMB) {
        // Simple distance metric for thumb extension since it rotates
        const distTipWrist = MathUtils.distance(tip, wrist);
        const distMcpWrist = MathUtils.distance(mcp, wrist);
        const thumbRatio = distTipWrist / distMcpWrist;
        
        if (thumbRatio > 2.0) {
          extension = FingerExtensionState.EXTENDED;
          curl = 0.1;
        } else if (thumbRatio < 1.2) {
          extension = FingerExtensionState.CURLED;
          curl = 0.9;
        } else {
          extension = FingerExtensionState.BENT;
          curl = 0.5;
        }
      }

      // 2. Calculate Spread (Angle between this MCP-TIP vector and the adjacent finger's MCP-TIP vector)
      let spread = 0;
      if (fingerType !== FingerType.THUMB && fingerType !== FingerType.PINKY) {
        // Compare with next finger
        const nextIndices = FINGER_INDICES[(i + 1) as FingerType];
        const nextMcp = currentLandmarks[nextIndices[1]];
        const nextTip = currentLandmarks[nextIndices[4]];
        
        const thisVector = { x: tip.x - mcp.x, y: tip.y - mcp.y, z: tip.z - mcp.z };
        const nextVector = { x: nextTip.x - nextMcp.x, y: nextTip.y - nextMcp.y, z: nextTip.z - nextMcp.z };
        
        MathUtils.normalize(thisVector, thisVector);
        MathUtils.normalize(nextVector, nextVector);
        
        const dotProd = MathUtils.dot(thisVector, nextVector);
        spread = Math.acos(Math.max(-1, Math.min(1, dotProd))); // radians
      }
      
      // 3. Calculate Velocity
      let velocity = 0;
      if (previousLandmarks && deltaTimeMs > 0) {
        const prevTip = previousLandmarks[indices[4]];
        const dist = MathUtils.distance(tip, prevTip);
        velocity = dist / (deltaTimeMs / 1000.0); // units per second
      }

      // Write output without allocation
      const state = outState[i];
      state.finger = fingerType;
      state.extension = extension;
      state.curl = curl;
      state.spread = spread;
      state.velocity = velocity;
    }
  }
}
