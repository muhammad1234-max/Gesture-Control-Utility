import { AIEventBus, AIEventType } from '../ai/AIEventBus';

export class ContextCache {
  private static instance: ContextCache;
  private currentContext: Record<string, any> = {};

  private constructor() {}

  public static getInstance(): ContextCache {
    if (!ContextCache.instance) {
      ContextCache.instance = new ContextCache();
    }
    return ContextCache.instance;
  }

  /**
   * Updates context and publishes an event only if the diff is non-empty.
   */
  public updateContext(diff: Record<string, any>): void {
    let changed = false;
    for (const key of Object.keys(diff)) {
      if (this.currentContext[key] !== diff[key]) {
        this.currentContext[key] = diff[key];
        changed = true;
      }
    }

    if (changed) {
      AIEventBus.getInstance().publish({
        type: AIEventType.ContextUpdated,
        timestamp: Date.now(),
        payload: { newContext: this.currentContext, diff }
      });
    }
  }

  public getContext(): Record<string, any> {
    return { ...this.currentContext };
  }
}
