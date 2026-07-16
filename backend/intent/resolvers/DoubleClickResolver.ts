import { IntentType, IntentState } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';

export class DoubleClickResolver implements IIntentResolver {
  private lastClickTimeMs: number = 0;
  private lastClickPos = { x: 0, y: 0 };

  resolve(ctx: ResolverContext): ResolverOutput | null {
    const { fsm, config, now } = ctx;
    
    // When a click is completed, check if we should enter DOUBLE_CLICK_PENDING
    if (fsm.getCurrentState() === IntentState.TRACKING && fsm.getLastReason() === 'Pinch Released') {
      const timeSinceLastClick = now - this.lastClickTimeMs;
      
      if (timeSinceLastClick < config.doubleClickWindowMs) {
        // Double click detected!
        fsm.requestTransition(IntentState.IDLE, 'Double Click Completed', now, ctx.pointerX, ctx.pointerY);
        this.lastClickTimeMs = 0; // reset
        return { intent: IntentType.DOUBLE_CLICK, confidence: 1.0 };
      } else {
        // Record this as the first click
        this.lastClickTimeMs = now;
        this.lastClickPos.x = ctx.pointerX;
        this.lastClickPos.y = ctx.pointerY;
        
        // Enter pending state
        fsm.requestTransition(IntentState.DOUBLE_CLICK_PENDING, 'Waiting for second click', now, ctx.pointerX, ctx.pointerY);
      }
    }
    
    // Check for double click timeout
    if (fsm.getCurrentState() === IntentState.DOUBLE_CLICK_PENDING) {
      if (fsm.getElapsedTime(now) > config.doubleClickWindowMs) {
        fsm.requestTransition(IntentState.TRACKING, 'Double Click Timeout', now, ctx.pointerX, ctx.pointerY);
      }
    }

    return null;
  }
}
