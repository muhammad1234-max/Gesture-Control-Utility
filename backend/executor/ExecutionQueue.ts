import { ExecutableAction } from '@shared/types';
import { ExecutionDiagnostics } from './ExecutionDiagnostics';
import { ActionBus } from '../action/ActionBus';
import { MovementQueue } from './MovementQueue';

export interface QueuedAction {
  action: ExecutableAction;
  enqueuedAt: number;
}

const MAX_QUEUE_SIZE = 100;

export class ExecutionQueue {
  private static instance: ExecutionQueue;
  private queue: QueuedAction[] = [];

  private constructor() {
    ActionBus.getInstance().subscribe((action) => {
      // Check if this is a high-frequency movement action
      if (this.isMovementAction(action)) {
        MovementQueue.getInstance().push(action);
      } else {
        this.push(action);
      }
    });
  }

  public static getInstance(): ExecutionQueue {
    if (!ExecutionQueue.instance) {
      ExecutionQueue.instance = new ExecutionQueue();
    }
    return ExecutionQueue.instance;
  }

  private isMovementAction(action: ExecutableAction): boolean {
    return action.type === 'Mouse' && 
           (action.payload.event === 'move' || action.payload.event === 'drag');
  }

  private push(action: ExecutableAction) {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift(); // Drop oldest
    }
    this.queue.push({ action, enqueuedAt: performance.now() });
    ExecutionDiagnostics.getInstance().setQueueDepths(this.queue.length, MovementQueue.getInstance().getDepth());
  }

  public pop(): QueuedAction | undefined {
    const item = this.queue.shift();
    ExecutionDiagnostics.getInstance().setQueueDepths(this.queue.length, MovementQueue.getInstance().getDepth());
    return item;
  }

  public clear() {
    this.queue = [];
    ExecutionDiagnostics.getInstance().setQueueDepths(0, MovementQueue.getInstance().getDepth());
  }
}
