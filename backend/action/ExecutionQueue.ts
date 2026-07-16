import { ExecutableAction } from '@shared/types';
import { ActionBus } from './ActionBus';
import { ActionDiagnostics } from './ActionDiagnostics';

const MAX_QUEUE_SIZE = 100;

export class ExecutionQueue {
  private static instance: ExecutionQueue;
  private queue: ExecutableAction[] = [];

  private constructor() {
    ActionBus.getInstance().subscribe((action) => {
      this.push(action);
    });
  }

  public static getInstance(): ExecutionQueue {
    if (!ExecutionQueue.instance) {
      ExecutionQueue.instance = new ExecutionQueue();
    }
    return ExecutionQueue.instance;
  }

  private push(action: ExecutableAction) {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Drop oldest action to prevent memory leak if Executor is dead
      this.queue.shift();
    }
    this.queue.push(action);
    ActionDiagnostics.getInstance().setQueueDepth(this.queue.length);
  }

  public pop(): ExecutableAction | undefined {
    const action = this.queue.shift();
    ActionDiagnostics.getInstance().setQueueDepth(this.queue.length);
    return action;
  }

  public peek(): ExecutableAction | undefined {
    return this.queue[0];
  }

  public clear() {
    this.queue = [];
    ActionDiagnostics.getInstance().setQueueDepth(0);
  }
}
