import * as os from 'os';

export class AgentScheduler {
  private static instance: AgentScheduler;
  private taskQueue: any[] = [];
  private activeTasks: number = 0;
  private readonly MAX_CONCURRENT_TASKS = 4;

  private constructor() {
    setInterval(() => this.tick(), 1000);
  }

  public static getInstance(): AgentScheduler {
    if (!AgentScheduler.instance) {
      AgentScheduler.instance = new AgentScheduler();
    }
    return AgentScheduler.instance;
  }

  public schedule(task: any): void {
    this.taskQueue.push(task);
  }

  private tick(): void {
    if (this.taskQueue.length === 0) return;
    if (this.activeTasks >= this.MAX_CONCURRENT_TASKS) return;

    // Resource check
    const freeMem = os.freemem() / (1024 * 1024); // MB
    if (freeMem < 500) {
      console.warn('[AgentScheduler] Low memory. Delaying agent task execution.');
      return;
    }

    // Schedule next task
    const task = this.taskQueue.shift();
    if (task) {
      this.activeTasks++;
      this.executeTask(task).finally(() => {
        this.activeTasks--;
      });
    }
  }

  private async executeTask(task: any): Promise<void> {
    try {
      await task.run();
    } catch (e) {
      console.error('[AgentScheduler] Task execution failed:', e);
    }
  }
}
