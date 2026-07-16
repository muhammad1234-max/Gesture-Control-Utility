import { ExecutableAction, ExecutionResult } from '@shared/types';
import { IActionExecutor } from '../interfaces/IActionExecutor';
import { NativeBridge } from '../native/NativeBridge';

export class KeyboardExecutor implements IActionExecutor {
  private bridge = NativeBridge.getInstance();

  // Basic map of common keys to VK codes
  private vkMap: Record<string, number> = {
    'ArrowRight': 0x27,
    'ArrowLeft': 0x25,
    'ArrowUp': 0x26,
    'ArrowDown': 0x28,
    'Space': 0x20,
    'Enter': 0x0D,
    'Escape': 0x1B
  };

  public async execute(action: ExecutableAction): Promise<ExecutionResult> {
    const key = action.payload.key; 
    const event = action.payload.event || 'click'; // 'down', 'up', 'click'
    
    // In production, we'd have a robust VK mapping. For now, try map or fallback to charcode.
    let vk = this.vkMap[key];
    if (!vk && typeof key === 'string') {
        vk = key.toUpperCase().charCodeAt(0);
    }

    if (!vk) {
        return {
            success: false,
            actionId: action.id,
            executor: 'KeyboardExecutor',
            queueWaitTimeMs: 0,
            bridgeRttMs: 0,
            pythonProcessingTimeMs: 0,
            win32ExecutionTimeMs: 0,
            totalLatencyMs: 0,
            failureReason: `Unknown key: ${key}`
        };
    }

    try {
      if (event === 'down') {
        return await this.bridge.keyDown(vk, action.id);
      } else if (event === 'up') {
        return await this.bridge.keyUp(vk, action.id);
      } else {
        // click
        await this.bridge.keyDown(vk, action.id);
        return await this.bridge.keyUp(vk, action.id);
      }
    } catch (err: any) {
      return {
        success: false,
        actionId: action.id,
        executor: 'KeyboardExecutor',
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
