import { RecommendationEngine } from './RecommendationEngine';

export class AdaptiveScheduler {
  private static instance: AdaptiveScheduler;
  private lastActivity = Date.now();
  private pendingTasks: (() => void)[] = [];

  private constructor() {
    // Check every 5 seconds if system is idle
    setInterval(() => {
      if (Date.now() - this.lastActivity > 2000) {
        this.executePendingTasks();
      }
    }, 5000);
  }

  public static getInstance(): AdaptiveScheduler {
    if (!AdaptiveScheduler.instance) {
      AdaptiveScheduler.instance = new AdaptiveScheduler();
    }
    return AdaptiveScheduler.instance;
  }

  public notifyActivity() {
    this.lastActivity = Date.now();
  }

  public scheduleTask(task: () => void) {
    this.pendingTasks.push(task);
  }

  private executePendingTasks() {
    if (this.pendingTasks.length === 0) return;
    
    const tasksToRun = [...this.pendingTasks];
    this.pendingTasks = [];
    
    for (const task of tasksToRun) {
      task();
    }
  }
}
