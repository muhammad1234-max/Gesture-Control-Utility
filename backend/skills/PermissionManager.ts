export enum PermissionAction {
  Allow = 'Allow',
  Ask = 'Ask',
  AlwaysConfirm = 'AlwaysConfirm',
  Deny = 'Deny'
}

export class PermissionManager {
  private static instance: PermissionManager;
  private policies: Map<string, PermissionAction> = new Map();

  private constructor() {
    // Default strict policies
    this.policies.set('Browser', PermissionAction.Allow);
    this.policies.set('Explorer', PermissionAction.Allow);
    this.policies.set('PowerShell', PermissionAction.Ask);
    this.policies.set('Registry', PermissionAction.Ask);
    this.policies.set('DeleteFiles', PermissionAction.AlwaysConfirm);
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  public evaluate(permissionRequest: string): PermissionAction {
    return this.policies.get(permissionRequest) || PermissionAction.Deny;
  }
}
