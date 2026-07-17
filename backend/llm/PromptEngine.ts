import { ContextEngine } from '../context/ContextEngine';
import { SkillRegistry } from '../skills/SkillRegistry';
import { SessionMemory } from '../memory/SessionMemory';
import { ProfileMemory } from '../memory/ProfileMemory';
import { AdaptiveMemory } from '../memory/AdaptiveMemory';
import { KnowledgeBase } from '../knowledge/KnowledgeBase';
import * as fs from 'fs';
import * as path from 'path';

export class PromptEngine {
  private sessionMemory = new SessionMemory();
  private profileMemory = new ProfileMemory();
  private adaptiveMemory = new AdaptiveMemory();

  public async buildPlanningPrompt(userIntent: string): Promise<string> {
    const templatePath = path.join(__dirname, 'PromptLibrary', 'Planning.prompt');
    let template = fs.readFileSync(templatePath, 'utf-8');

    const context = ContextEngine.getInstance().getCurrentContext();
    const skills = SkillRegistry.getInstance().getAllSkills().map(s => `${s.name}: ${s.description}`).join('\n');
    
    // Memory integration
    const profilePrefs = this.profileMemory.getProfilePreferences(context.profileId || 'default');
    const adaptiveLimits = this.adaptiveMemory.getLearnedThresholds();
    const recentEvents = this.sessionMemory.getRecentEvents(5);
    
    // Knowledge Base integration
    const activeApp = context.activeApp || 'Unknown';
    const kbMetadata = KnowledgeBase.getInstance().getApplicationMetadata(activeApp);

    // Assembly
    const assembledContext = JSON.stringify({
      systemState: context,
      userPreferences: profilePrefs,
      adaptiveLearnings: adaptiveLimits,
      recentHistory: recentEvents,
      applicationKnowledge: kbMetadata
    }, null, 2);

    template = template.replace('{{CURRENT_CONTEXT}}', assembledContext);
    template = template.replace('{{AVAILABLE_SKILLS}}', skills);
    template = template.replace('{{USER_INTENT}}', userIntent);

    return template;
  }
}
