import { IntentType, IntentState, GestureType } from '@shared/types';
import { IIntentResolver, ResolverContext, ResolverOutput } from './types';

export class HoldResolver implements IIntentResolver {
  resolve(ctx: ResolverContext): ResolverOutput | null {
    const { fsm, config, frame, now } = ctx;
    
    const isHoldingPose = frame.activeGestures.includes(GestureType.CLOSED_FIST);
    
    const currentState = fsm.getCurrentState();

    if (isHoldingPose) {
      if (currentState === IntentState.TRACKING) {
        fsm.requestTransition(IntentState.HOLD_PENDING, 'Hold Started', now, ctx.pointerX, ctx.pointerY);
      } else if (currentState === IntentState.HOLD_PENDING) {
        if (fsm.getElapsedTime(now) > config.holdActivationTimeMs) {
          fsm.requestTransition(IntentState.HOLDING, 'Hold Confirmed', now, ctx.pointerX, ctx.pointerY);
        }
      } else if (currentState === IntentState.HOLDING) {
        return { intent: IntentType.HOLD, confidence: 0.9 };
      }
    } else {
      if (currentState === IntentState.HOLD_PENDING || currentState === IntentState.HOLDING) {
        fsm.requestTransition(IntentState.TRACKING, 'Hold Released', now, ctx.pointerX, ctx.pointerY);
      }
    }

    return null;
  }
}
