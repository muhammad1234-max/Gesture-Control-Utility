import { ActionType } from '@shared/types';
import { IActionExecutor } from './interfaces/IActionExecutor';
import { MouseExecutor } from './executors/MouseExecutor';
import { KeyboardExecutor } from './executors/KeyboardExecutor';

export class ExecutorRegistry {
  private static instance: ExecutorRegistry;
  private executors = new Map<ActionType, IActionExecutor>();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ExecutorRegistry {
    if (!ExecutorRegistry.instance) {
      ExecutorRegistry.instance = new ExecutorRegistry();
    }
    return ExecutorRegistry.instance;
  }

  private registerDefaults() {
    this.executors.set(ActionType.Mouse, new MouseExecutor());
    this.executors.set(ActionType.Keyboard, new KeyboardExecutor());
    // Future: Media, Launch, Window, etc.
  }

  public register(type: ActionType, executor: IActionExecutor) {
    this.executors.set(type, executor);
  }

  public getExecutor(type: ActionType): IActionExecutor | undefined {
    return this.executors.get(type);
  }
}
