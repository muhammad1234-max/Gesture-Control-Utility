import { ActionDiagnosticsData } from '@shared/types';

export class ActionDiagnostics {
  private static instance: ActionDiagnostics;
  
  private data: ActionDiagnosticsData = {
    incomingIntents: 0,
    mappedActions: 0,
    rejectedActions: 0,
    conflictResolutions: 0,
    fallbackMappings: 0,
    averageLookupTimeMs: 0,
    averageValidationTimeMs: 0,
    currentActiveProfile: 'None',
    currentRegistrySize: 0,
    executionQueueDepth: 0
  };

  private totalLookupTime = 0;
  private lookupCount = 0;
  
  private totalValidationTime = 0;
  private validationCount = 0;

  private constructor() {}

  public static getInstance(): ActionDiagnostics {
    if (!ActionDiagnostics.instance) {
      ActionDiagnostics.instance = new ActionDiagnostics();
    }
    return ActionDiagnostics.instance;
  }

  public recordIntentReceived() {
    this.data.incomingIntents++;
  }

  public recordMappedAction() {
    this.data.mappedActions++;
  }

  public recordRejectedAction() {
    this.data.rejectedActions++;
  }

  public recordConflictResolution() {
    this.data.conflictResolutions++;
  }

  public recordFallbackMapping() {
    this.data.fallbackMappings++;
  }

  public recordLookupTime(ms: number) {
    this.lookupCount++;
    this.totalLookupTime += ms;
    // Fast moving average approx
    this.data.averageLookupTimeMs = this.totalLookupTime / this.lookupCount;
    if (this.lookupCount > 1000) {
      this.totalLookupTime = this.data.averageLookupTimeMs * 100;
      this.lookupCount = 100;
    }
  }

  public recordValidationTime(ms: number) {
    this.validationCount++;
    this.totalValidationTime += ms;
    this.data.averageValidationTimeMs = this.totalValidationTime / this.validationCount;
    if (this.validationCount > 1000) {
      this.totalValidationTime = this.data.averageValidationTimeMs * 100;
      this.validationCount = 100;
    }
  }

  public updateRegistryInfo(profileId: string, size: number) {
    this.data.currentActiveProfile = profileId;
    this.data.currentRegistrySize = size;
  }

  public setQueueDepth(depth: number) {
    this.data.executionQueueDepth = depth;
  }

  public getTelemetry(): ActionDiagnosticsData {
    return this.data;
  }
}
