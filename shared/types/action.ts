import { Handedness } from './tracking';
import { IntentType } from './intent';

export enum ActionType {
  Mouse = 'Mouse',
  Keyboard = 'Keyboard',
  Media = 'Media',
  LaunchApplication = 'LaunchApplication',
  LaunchURL = 'LaunchURL',
  System = 'System',
  WindowManagement = 'WindowManagement',
  Macro = 'Macro',
  TextInsertion = 'TextInsertion',
  Custom = 'Custom'
}

export interface ActionCondition {
  activeAppRegex?: string;     // e.g., "chrome\.exe"
  fullscreenOnly?: boolean;
  requiredModifiers?: string[]; // e.g., ["CTRL"]
  requiredHand?: Handedness;
  minConfidence?: number;
}

export interface ExecutableAction {
  id: string;
  type: ActionType;
  payload: Record<string, any>;
  priority: number;
  repeatable: boolean;
  conditions?: ActionCondition[];
  
  // Traceability
  sourceIntent: IntentType;
  profileId: string;
}

export interface ValidatedAction {
  isValid: true;
  action: ExecutableAction;
}

export interface RejectedAction {
  isValid: false;
  action: ExecutableAction;
  reason: string;
}

export type ValidationResult = ValidatedAction | RejectedAction;

export interface ActionDiagnosticsData {
  incomingIntents: number;
  mappedActions: number;
  rejectedActions: number;
  conflictResolutions: number;
  fallbackMappings: number;
  
  averageLookupTimeMs: number;
  averageValidationTimeMs: number;
  
  currentActiveProfile: string;
  currentRegistrySize: number;
  
  executionQueueDepth: number;
}
