/**
 * Official SDK for building AI Skills.
 * Version: 1.0.0
 */

export interface ISkillContext {
  activeApplication: string;
  permissionsGranted: string[];
}

export interface ISkillAction {
  name: string;
  description: string;
  execute: (args: Record<string, any>, ctx: ISkillContext) => Promise<any>;
  rollback?: (args: Record<string, any>, ctx: ISkillContext) => Promise<void>;
}

export interface ISkill {
  id: string;
  version: string;
  author: string;
  capabilities: string[];
  actions: ISkillAction[];
}
