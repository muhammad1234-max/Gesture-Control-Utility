import { IntentState, GestureFrame } from '@shared/types';
import { IntentDiagnostics } from './IntentDiagnostics';

// Table-driven valid transitions
const VALID_TRANSITIONS: Record<IntentState, Set<IntentState>> = {
  [IntentState.IDLE]: new Set([
    IntentState.TRACKING
  ]),
  [IntentState.TRACKING]: new Set([
    IntentState.IDLE,
    IntentState.CLICK_CANDIDATE,
    IntentState.SCROLL_PENDING,
    IntentState.HOLD_PENDING
  ]),
  [IntentState.CLICK_CANDIDATE]: new Set([
    IntentState.TRACKING, // Cancelled
    IntentState.CLICK_CONFIRMED,
    IntentState.DRAG_PENDING,
    IntentState.HOLD_PENDING
  ]),
  [IntentState.CLICK_CONFIRMED]: new Set([
    IntentState.TRACKING, // Click finished
    IntentState.DOUBLE_CLICK_PENDING
  ]),
  [IntentState.DOUBLE_CLICK_PENDING]: new Set([
    IntentState.TRACKING, // Timeout, single click completed
    IntentState.CLICK_CANDIDATE // Second click started
  ]),
  [IntentState.DRAG_PENDING]: new Set([
    IntentState.TRACKING, // Cancelled
    IntentState.DRAGGING
  ]),
  [IntentState.DRAGGING]: new Set([
    IntentState.TRACKING // Drag released
  ]),
  [IntentState.SCROLL_PENDING]: new Set([
    IntentState.TRACKING,
    IntentState.SCROLLING
  ]),
  [IntentState.SCROLLING]: new Set([
    IntentState.TRACKING // Scroll released
  ]),
  [IntentState.HOLD_PENDING]: new Set([
    IntentState.TRACKING,
    IntentState.HOLDING
  ]),
  [IntentState.HOLDING]: new Set([
    IntentState.TRACKING,
    IntentState.DRAG_PENDING // Hold turns into drag
  ]),
  [IntentState.CANCELLED]: new Set([
    IntentState.TRACKING
  ])
};

export class StateMachine {
  private currentState: IntentState = IntentState.IDLE;
  private stateStartTimeMs: number = 0;
  private lastTransitionReason: string = 'Init';
  
  // To track movement inside a state (e.g. for drag threshold)
  private stateStartPosition = { x: 0, y: 0 };

  public getCurrentState(): IntentState {
    return this.currentState;
  }

  public getElapsedTime(now: number): number {
    return now - this.stateStartTimeMs;
  }

  public getLastReason(): string {
    return this.lastTransitionReason;
  }

  public getMovementSinceStart(currentPosition: { x: number, y: number }): number {
    const dx = currentPosition.x - this.stateStartPosition.x;
    const dy = currentPosition.y - this.stateStartPosition.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public updateStartPos(x: number, y: number) {
    this.stateStartPosition.x = x;
    this.stateStartPosition.y = y;
  }

  /**
   * Attempts to transition to a new state.
   * Returns true if successful, false if invalid transition.
   */
  public requestTransition(
    toState: IntentState,
    reason: string,
    now: number,
    currentX: number = 0,
    currentY: number = 0
  ): boolean {
    if (this.currentState === toState) {
      return true; // Already in state
    }

    const validNextStates = VALID_TRANSITIONS[this.currentState];
    if (!validNextStates || !validNextStates.has(toState)) {
      // Allow forced reset to tracking if hand lost
      if (toState === IntentState.IDLE) {
         this.forceState(toState, reason, now, currentX, currentY);
         return true;
      }
      return false; // Invalid transition
    }

    this.forceState(toState, reason, now, currentX, currentY);
    return true;
  }

  private forceState(toState: IntentState, reason: string, now: number, currentX: number, currentY: number) {
    IntentDiagnostics.getInstance().recordTransition(this.currentState, toState, reason);
    
    this.currentState = toState;
    this.stateStartTimeMs = now;
    this.lastTransitionReason = reason;
    this.stateStartPosition.x = currentX;
    this.stateStartPosition.y = currentY;
  }
}
