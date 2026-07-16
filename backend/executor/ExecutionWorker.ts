import { ExecutionQueue, QueuedAction } from './ExecutionQueue';
import { MovementQueue } from './MovementQueue';
import { ExecutionEngine } from './ExecutionEngine';
import { ExecutionDiagnostics } from './ExecutionDiagnostics';
import { NativeBridge } from './native/NativeBridge';

export class ExecutionWorker {
  private static instance: ExecutionWorker;
  private engine = new ExecutionEngine();
  private isProcessing = false;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): ExecutionWorker {
    if (!ExecutionWorker.instance) {
      ExecutionWorker.instance = new ExecutionWorker();
    }
    return ExecutionWorker.instance;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    NativeBridge.getInstance().start();
    
    console.log('[ExecutionWorker] Native Windows Execution Engine started.');
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    NativeBridge.getInstance().stop();
    ExecutionQueue.getInstance().clear();
    MovementQueue.getInstance().clear();
    console.log('[ExecutionWorker] Native Windows Execution Engine stopped.');
  }

  private async loop() {
    if (!this.isRunning) return;
    
    if (this.isProcessing) {
      setImmediate(() => this.loop());
      return;
    }

    // 1. Drain Movement Queue first (highest priority, drops stale frames)
    let item = MovementQueue.getInstance().pop();
    
    // 2. If no movement, check standard FIFO queue
    if (!item) {
      item = ExecutionQueue.getInstance().pop();
    }

    if (item) {
      this.isProcessing = true;
      try {
        await this.processItem(item);
      } finally {
        this.isProcessing = false;
      }
    }

    // Yield to event loop, then continue
    setImmediate(() => this.loop());
  }

  private async processItem(item: QueuedAction) {
    const t0 = performance.now();
    const waitMs = t0 - item.enqueuedAt;

    // Execute via Registry
    const result = await this.engine.execute(item.action);

    // Record Diagnostics
    ExecutionDiagnostics.getInstance().recordExecution(
      result.actionId,
      result.success,
      waitMs,
      result.bridgeRttMs,
      result.pythonProcessingTimeMs,
      result.win32ExecutionTimeMs
    );
  }
}
