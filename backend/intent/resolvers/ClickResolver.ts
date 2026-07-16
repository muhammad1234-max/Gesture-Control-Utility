import { IntentType, IntentState, GestureType } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';

export class ClickResolver implements IIntentResolver {
  resolve(ctx: ResolverContext): ResolverOutput | null {
    const { fsm, config, frame, now } = ctx;
    
    // Check if pinching
    const isPinching = frame.activeGestures.includes(GestureType.INDEX_PINCH) || 
                       frame.activeGestures.includes(GestureType.MIDDLE_PINCH);
                       
    const currentState = fsm.getCurrentState();

    if (isPinching) {
      if (currentState === IntentState.TRACKING) {
        // Just started pinch
        fsm.requestTransition(IntentState.CLICK_CANDIDATE, 'Pinch Started', now, ctx.pointerX, ctx.pointerY);
        return { intent: IntentType.NONE, confidence: 0 };
      } 
      else if (currentState === IntentState.CLICK_CANDIDATE) {
        // Wait for stability frames. We use elapsed time mapped to config.
        // Assuming 60fps, 3 frames = ~50ms.
        const elapsed = fsm.getElapsedTime(now);
        if (elapsed > (config.clickStabilityFrames * 16)) { // 16ms per frame
           fsm.requestTransition(IntentState.CLICK_CONFIRMED, 'Pinch Stable', now, ctx.pointerX, ctx.pointerY);
           return { intent: IntentType.SINGLE_CLICK, confidence: 0.9 };
        }
      }
      else if (currentState === IntentState.CLICK_CONFIRMED) {
         // Keep holding the click down natively? Or transition to drag?
         // DragResolver will handle transitioning out of CLICK_CONFIRMED to DRAG_PENDING if needed.
         return { intent: IntentType.SINGLE_CLICK, confidence: 1.0 };
      }
    } else {
      // Released
      if (currentState === IntentState.CLICK_CANDIDATE) {
        fsm.requestTransition(IntentState.CANCELLED, 'Pinch Released Early', now, ctx.pointerX, ctx.pointerY);
      } else if (currentState === IntentState.CLICK_CONFIRMED || currentState === IntentState.CANCELLED) {
        fsm.requestTransition(IntentState.TRACKING, 'Pinch Released', now, ctx.pointerX, ctx.pointerY);
      }
    }

    return null;
  }
}
