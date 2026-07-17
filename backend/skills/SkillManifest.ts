export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
  requiredPermissions: string[];
  entryPoint: string;
}
