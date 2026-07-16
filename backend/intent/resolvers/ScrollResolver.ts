import { IntentType, IntentState, GestureType } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';

export class ScrollResolver implements IIntentResolver {
  resolve(ctx: ResolverContext): ResolverOutput | null {
    const { fsm, config, frame, now } = ctx;
    
    const isScrollPose = frame.activeGestures.includes(GestureType.SCROLL_POSE) || 
                         frame.activeGestures.includes(GestureType.VICTORY) || 
                         frame.activeGestures.includes(GestureType.INDEX_PINCH);
                         // Using PINCH for scrolling for now as a fallback if custom pose isn't registered

    const currentState = fsm.getCurrentState();

    // Ensure we don't hijack clicks or drags
    if (currentState !== IntentState.TRACKING && currentState !== IntentState.SCROLL_PENDING && currentState !== IntentState.SCROLLING) {
       return null;
    }

    if (isScrollPose && frame.activeGestures.includes(GestureType.VICTORY)) {
      if (currentState === IntentState.TRACKING) {
        fsm.requestTransition(IntentState.SCROLL_PENDING, 'Scroll Pose Detected', now, ctx.pointerX, ctx.pointerY);
      } else if (currentState === IntentState.SCROLL_PENDING) {
        const movement = fsm.getMovementSinceStart({ x: ctx.pointerX, y: ctx.pointerY });
        if (movement > config.scrollDeadzone) {
          fsm.requestTransition(IntentState.SCROLLING, 'Scroll Deadzone Cleared', now, ctx.pointerX, ctx.pointerY);
        }
      } else if (currentState === IntentState.SCROLLING) {
        return { intent: IntentType.SCROLL, confidence: 1.0 };
      }
    } else {
      if (currentState === IntentState.SCROLL_PENDING || currentState === IntentState.SCROLLING) {
        fsm.requestTransition(IntentState.TRACKING, 'Scroll Pose Lost', now, ctx.pointerX, ctx.pointerY);
      }
    }

    return null;
  }
}
