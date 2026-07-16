import { ExecutableAction, ExecutionResult } from '@shared/types';
import { IActionExecutor } from '../interfaces/IActionExecutor';
import { NativeBridge } from '../native/NativeBridge';

export class MouseExecutor implements IActionExecutor {
  private bridge = NativeBridge.getInstance();

  public async execute(action: ExecutableAction): Promise<ExecutionResult> {
    const event = action.payload.event; // 'move', 'click', 'double_click', 'down', 'up', 'scroll'
    const button = action.payload.button; // 'left', 'right'

    try {
      if (event === 'move' || event === 'drag') {
        const dx = action.payload.dx || 0;
        const dy = action.payload.dy || 0;
        return await this.bridge.moveMouse(dx, dy, action.id);
      } 
      else if (event === 'click') {
        if (button === 'left') {
          return await this.bridge.leftClick(true, true, action.id);
        } else if (button === 'right') {
          return await this.bridge.rightClick(true, true, action.id);
        }
      }
      else if (event === 'double_click') {
        if (button === 'left') {
          await this.bridge.leftClick(true, true, action.id);
          return await this.bridge.leftClick(true, true, action.id);
        }
      }
      else if (event === 'down') {
        if (button === 'left') {
          return await this.bridge.leftClick(true, false, action.id);
        } else if (button === 'right') {
          return await this.bridge.rightClick(true, false, action.id);
        }
      }
      else if (event === 'up') {
        if (button === 'left') {
          return await this.bridge.leftClick(false, true, action.id);
        } else if (button === 'right') {
          return await this.bridge.rightClick(false, true, action.id);
        }
      }
      else if (event === 'scroll') {
        const delta = action.payload.delta || (action.payload.direction === 'up' ? 120 : -120);
        return await this.bridge.scroll(delta, action.id);
      }
      
      throw new Error(`Unsupported mouse event: ${event}`);
      
    } catch (err: any) {
      return {
        success: false,
        actionId: action.id,
        executor: 'MouseExecutor',
        queueWaitTimeMs: 0,
        bridgeRttMs: 0,
        pythonProcessingTimeMs: 0,
        win32ExecutionTimeMs: 0,
        totalLatencyMs: 0,
        failureReason: err.message
      };
    }
  }
}
