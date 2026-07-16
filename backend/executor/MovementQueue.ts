import { ExecutableAction } from '@shared/types';
import { QueuedAction } from './ExecutionQueue';

/**
 * Dedicated queue for high-frequency cursor movement.
 * It retains ONLY the latest movement command and drops stale ones
 * to prevent cursor lag under load.
 */
export class MovementQueue {
  private static instance: MovementQueue;
  private latestAction: QueuedAction | null = null;

  private constructor() {}

  public static getInstance(): MovementQueue {
    if (!MovementQueue.instance) {
      MovementQueue.instance = new MovementQueue();
    }
    return MovementQueue.instance;
  }

  public push(action: ExecutableAction) {
    // Simply overwrite with the latest frame
    this.latestAction = { action, enqueuedAt: performance.now() };
  }

  public pop(): QueuedAction | null {
    const item = this.latestAction;
    this.latestAction = null;
    return item;
  }

  public getDepth(): number {
    return this.latestAction ? 1 : 0;
  }

  public clear() {
    this.latestAction = null;
  }
}
