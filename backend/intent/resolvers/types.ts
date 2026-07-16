import { IntentType, IntentConfig, GestureFrame } from '@shared/types';
import { StateMachine } from '../StateMachine';
import { IntentHistory } from '../IntentHistory';

export interface ResolverContext {
  fsm: StateMachine;
  config: IntentConfig;
  frame: GestureFrame;
  history: IntentHistory;
  now: number;
  pointerX: number; // Normalized X of primary pointer (e.g. Index Tip)
  pointerY: number; // Normalized Y
}

export interface ResolverOutput {
  intent: IntentType;
  confidence: number;
}

export interface IIntentResolver {
  resolve(ctx: ResolverContext): ResolverOutput | null;
}
