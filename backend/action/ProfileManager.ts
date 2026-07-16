import { ActionRegistry } from './ActionRegistry';
import { ActionDiagnostics } from './ActionDiagnostics';
import { ActionType, ExecutableAction, IntentType } from '@shared/types';

export class ProfileManager {
  private static instance: ProfileManager;
  
  private activeProfileId: string = 'Desktop';
  
  private constructor() {
    this.seedDefaultProfiles();
  }

  public static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager();
    }
    return ProfileManager.instance;
  }

  public getActiveProfileId(): string {
    return this.activeProfileId;
  }

  public setActiveProfile(profileId: string) {
    this.activeProfileId = profileId;
    ActionDiagnostics.getInstance().updateRegistryInfo(this.activeProfileId, ActionRegistry.getInstance().getSize());
  }

  /**
   * Seeds the registry with some mock default profiles.
   * In a real application, these would be loaded from JSON or a Database.
   */
  private seedDefaultProfiles() {
    const registry = ActionRegistry.getInstance();
    
    // Desktop Profile
    registry.registerAction('Desktop', IntentType.SINGLE_CLICK, {
      id: 'desktop_click',
      type: ActionType.Mouse,
      payload: { button: 'left', event: 'click' },
      priority: 10,
      repeatable: false,
      sourceIntent: IntentType.SINGLE_CLICK,
      profileId: 'Desktop'
    });

    registry.registerAction('Desktop', IntentType.DOUBLE_CLICK, {
      id: 'desktop_dclick',
      type: ActionType.Mouse,
      payload: { button: 'left', event: 'double_click' },
      priority: 10,
      repeatable: false,
      sourceIntent: IntentType.DOUBLE_CLICK,
      profileId: 'Desktop'
    });

    registry.registerAction('Desktop', IntentType.DRAG_START, {
      id: 'desktop_drag_start',
      type: ActionType.Mouse,
      payload: { button: 'left', event: 'down' },
      priority: 10,
      repeatable: false,
      sourceIntent: IntentType.DRAG_START,
      profileId: 'Desktop'
    });

    registry.registerAction('Desktop', IntentType.DRAG_END, {
      id: 'desktop_drag_end',
      type: ActionType.Mouse,
      payload: { button: 'left', event: 'up' },
      priority: 10,
      repeatable: false,
      sourceIntent: IntentType.DRAG_END,
      profileId: 'Desktop'
    });

    registry.registerAction('Desktop', IntentType.SCROLL, {
      id: 'desktop_scroll',
      type: ActionType.Mouse,
      payload: { axis: 'y' },
      priority: 10,
      repeatable: true,
      sourceIntent: IntentType.SCROLL,
      profileId: 'Desktop'
    });

    // Presentation Profile
    registry.registerAction('Presentation', IntentType.SCROLL, {
      id: 'pres_next_slide',
      type: ActionType.Keyboard,
      payload: { key: 'ArrowRight' },
      priority: 10,
      repeatable: false, // Don't spam next slide
      sourceIntent: IntentType.SCROLL,
      profileId: 'Presentation'
    });
    
    // Update diagnostics
    ActionDiagnostics.getInstance().updateRegistryInfo(this.activeProfileId, registry.getSize());
  }
}
