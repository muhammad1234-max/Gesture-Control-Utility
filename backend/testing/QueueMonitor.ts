import { ExecutionQueue } from '../executor/ExecutionQueue';
import { MovementQueue } from '../executor/MovementQueue';

export interface QueueStatus {
  executionQueueDepth: number;
  movementQueueDepth: number;
  isStarved: boolean;
  isBacklogged: boolean;
}

export class QueueMonitor {
  private static instance: QueueMonitor;

  private constructor() {}

  public static getInstance(): QueueMonitor {
    if (!QueueMonitor.instance) {
      QueueMonitor.instance = new QueueMonitor();
    }
    return QueueMonitor.instance;
  }

  public getStatus(): QueueStatus {
    // Note: We need ExecutionQueue and MovementQueue to expose getDepth() if they don't already.
    // For now, we'll access their state indirectly via Diagnostics if needed, but it's better to add getDepth()
    
    let execDepth = 0;
    try {
        const ExecutionDiagnostics = require('../executor/ExecutionDiagnostics').ExecutionDiagnostics;
        execDepth = ExecutionDiagnostics.getInstance().getTelemetry().queueDepth;
    } catch(e) {}
    
    let moveDepth = 0;
    try {
        const ExecutionDiagnostics = require('../executor/ExecutionDiagnostics').ExecutionDiagnostics;
        moveDepth = ExecutionDiagnostics.getInstance().getTelemetry().movementQueueDepth;
    } catch(e) {}

    return {
      executionQueueDepth: execDepth,
      movementQueueDepth: moveDepth,
      isStarved: execDepth === 0 && moveDepth === 0,
      isBacklogged: execDepth > 10
    };
  }
}
