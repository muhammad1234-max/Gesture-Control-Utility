import { ActionType } from '@shared/types';

export class ActionInjectorService {
  public injectAction(type: ActionType, target: string) {
    // Placeholder for C++ SendInput / System bindings
    console.log(`Injecting action [${type}]: ${target}`);
  }
}
