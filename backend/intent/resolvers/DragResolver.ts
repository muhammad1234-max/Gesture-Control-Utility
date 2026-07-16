import { IntentType, IntentState } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';

export class DragResolver implements IIntentResolver {
  resolve(ctx: ResolverContext): ResolverOutput | null {
    const { fsm, config, now } = ctx;
    
    const currentState = fsm.getCurrentState();
    
    // Drag requires being in CLICK_CONFIRMED or HOLD_PENDING first
    if (currentState === IntentState.CLICK_CONFIRMED || currentState === IntentState.HOLD_PENDING || currentState === IntentState.CLICK_CANDIDATE) {
      const elapsed = fsm.getElapsedTime(now);
      const movement = fsm.getMovementSinceStart({ x: ctx.pointerX, y: ctx.pointerY });

      // Adaptive trigger: Time OR Movement
      if (movement > config.dragActivationDistance || elapsed > config.dragActivationTimeMs) {
        fsm.requestTransition(IntentState.DRAG_PENDING, 'Drag Activation Threshold Reached', now, ctx.pointerX, ctx.pointerY);
      }
    } 
    else if (currentState === IntentState.DRAG_PENDING) {
      // Confirm drag start
      fsm.requestTransition(IntentState.DRAGGING, 'Drag Started', now, ctx.pointerX, ctx.pointerY);
      return { intent: IntentType.DRAG_START, confidence: 1.0 };
    } 
    else if (currentState === IntentState.DRAGGING) {
      // Update drag position
      return { intent: IntentType.DRAG_UPDATE, confidence: 1.0 };
    }

    return null; // Drag end is handled by ClickResolver releasing the pinch
  }
}
