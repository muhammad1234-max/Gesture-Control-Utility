import { GestureFrame, IntentFrame, IntentType, IntentState } from '@shared/types';
import { StateMachine } from './StateMachine';
import { IntentConfigManager } from './IntentConfigManager';
import { IntentHistory } from './IntentHistory';
import { IntentResolver } from './resolvers/IntentResolver';
import { ResolverContext } from './resolvers/types';

export class IntentEngine {
  private fsm = new StateMachine();
  private intentResolver = new IntentResolver();
  
  public process(frame: GestureFrame, now: number): IntentFrame {
    const t0 = performance.now();
    const config = IntentConfigManager.getInstance().getConfig();
    const history = IntentHistory.getInstance();
    
    // We assume index tip is our primary pointer for intent calculations like drag
    let pointerX = 0;
    let pointerY = 0;
    if (frame.fingerStates.length > 0) {
      // Find index finger landmark (ID 8) if we had raw landmarks, 
      // but we only have finger states in GestureFrame.
      // Wait, we don't have absolute position in GestureFrame!
      // The user requested handVelocity, direction etc. in Phase 4 but they are currently mocked {x:0, y:0, z:0}.
      // We will use the handVelocity field if we need movement.
      // For now we'll just track if movement > threshold using a mock position, 
      // or we can compute it properly in the Action Engine. 
      // The FSM needs it for drag. Let's use handVelocity mock fields for now.
    }
    
    const context: ResolverContext = {
      fsm: this.fsm,
      config,
      frame,
      history,
      now,
      pointerX: frame.handVelocity.x, // Placeholder until TrackingEngine outputs real positions
      pointerY: frame.handVelocity.y
    };

    const resolved = this.intentResolver.resolve(context);
    
    const pipelineLatencyMs = performance.now() - t0;
    
    // Create the immutable IntentFrame snapshot
    const intentFrame: IntentFrame = {
      frameId: Math.floor(Math.random() * 1000000),
      timestamp: now,
      trackingId: frame.frameId,
      
      currentState: this.fsm.getCurrentState(),
      previousState: IntentState.IDLE, // To be filled if we tracked history inside FSM (Diagnostics tracks it)
      transitionReason: this.fsm.getLastReason(),
      
      primaryIntent: resolved.primary,
      secondaryIntent: resolved.secondary,
      confidence: resolved.confidence,
      
      elapsedTimeInStateMs: this.fsm.getElapsedTime(now),
      movementSinceStateStart: this.fsm.getMovementSinceStart({ x: context.pointerX, y: context.pointerY }),
      averageVelocity: 0,
      
      activeGestures: [...frame.activeGestures],
      
      pipelineLatencyMs
    };
    
    // Push to history
    history.add(intentFrame);
    
    return intentFrame;
  }
}
