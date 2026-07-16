import { ExecutableAction, IntentType } from '@shared/types';

export class ActionRegistry {
  private static instance: ActionRegistry;
  
  // Lookup key: ProfileID + ":" + IntentType
  // Value: Array of possible executable actions bound to this intent (for priority/conflict resolution)
  private compiledMappings = new Map<string, ExecutableAction[]>();

  private constructor() {}

  public static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /**
   * Directly sets the compiled actions for a specific profile and intent.
   * This is called by the ProfileManager when a profile is loaded or modified.
   */
  public registerAction(profileId: string, intent: IntentType, action: ExecutableAction) {
    const key = `${profileId}:${intent}`;
    const existing = this.compiledMappings.get(key) || [];
    existing.push(action);
    // Sort by priority (highest first)
    existing.sort((a, b) => b.priority - a.priority);
    this.compiledMappings.set(key, existing);
  }

  public clearProfile(profileId: string) {
    const prefix = `${profileId}:`;
    for (const key of this.compiledMappings.keys()) {
      if (key.startsWith(prefix)) {
        this.compiledMappings.delete(key);
      }
    }
  }

  /**
   * O(1) fast lookup for an intent within a profile.
   */
  public getActions(profileId: string, intent: IntentType): ExecutableAction[] {
    return this.compiledMappings.get(`${profileId}:${intent}`) || [];
  }

  public getSize(): number {
    let size = 0;
    for (const arr of this.compiledMappings.values()) {
      size += arr.length;
    }
    return size;
  }
}
