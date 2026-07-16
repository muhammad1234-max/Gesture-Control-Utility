import { ExecutableAction } from '@shared/types';

export type ActionSubscriber = (action: ExecutableAction) => void;

export class ActionBus {
  private static instance: ActionBus;
  private subscribers: Set<ActionSubscriber> = new Set();
  
  private constructor() {}

  public static getInstance(): ActionBus {
    if (!ActionBus.instance) {
      ActionBus.instance = new ActionBus();
    }
    return ActionBus.instance;
  }

  public subscribe(handler: ActionSubscriber): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  public publish(action: ExecutableAction): void {
    Object.freeze(action);
    Object.freeze(action.payload);
    
    for (const sub of this.subscribers) {
      try {
        sub(action);
      } catch (err) {
        console.error('[ActionBus] Subscriber error:', err);
      }
    }
  }
}
