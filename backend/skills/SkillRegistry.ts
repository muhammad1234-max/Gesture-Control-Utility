import { SkillManifest } from './SkillManifest';

export class SkillRegistry {
  private static instance: SkillRegistry;
  private loadedSkills: Map<string, SkillManifest> = new Map();

  private constructor() {}

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  public register(manifest: SkillManifest): void {
    console.log(`[SkillRegistry] Registered skill: ${manifest.name} v${manifest.version}`);
    this.loadedSkills.set(manifest.id, manifest);
  }

  public getSkill(id: string): SkillManifest | undefined {
    return this.loadedSkills.get(id);
  }

  public getAllSkills(): SkillManifest[] {
    return Array.from(this.loadedSkills.values());
  }
}
