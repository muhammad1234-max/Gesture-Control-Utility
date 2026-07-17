import { LLMBridge, LLMRequest, LLMResponse } from './LLMBridge';
import { OllamaProvider } from './Providers/OllamaProvider';
import { OpenAIProvider } from './Providers/OpenAIProvider';
import { KnowledgeBase } from '../knowledge/KnowledgeBase';

export class ModelRouter {
  private localBridge: LLMBridge = new OllamaProvider();
  private cloudBridge: LLMBridge = new OpenAIProvider();
  private responseCache: Map<string, LLMResponse> = new Map();

  public async routeRequest(request: LLMRequest, currentContext: Record<string, any>): Promise<LLMResponse> {
    console.log(`[ModelRouter] Routing evaluation started for prompt length: ${request.userPrompt.length}`);
    
    // 1. Cached Response
    const cacheKey = this.hashRequest(request, currentContext);
    if (this.responseCache.has(cacheKey)) {
      console.log(`[ModelRouter] Selected CACHED response.`);
      return this.responseCache.get(cacheKey)!;
    }

    // 2. Knowledge Base (Fast path bypassing LLMs if simple retrieval)
    if (request.userPrompt.toLowerCase().includes('what is the shortcut')) {
       // Mocking the extraction of app name for this example
       const appMeta = KnowledgeBase.getInstance().getApplicationMetadata(currentContext.activeApp || '');
       if (appMeta) {
         console.log(`[ModelRouter] Selected KNOWLEDGE BASE response.`);
         return {
           content: JSON.stringify(appMeta),
           tokensUsed: 0,
           model: 'knowledge-base-v1'
         };
       }
    }

    // 3. Privacy Mode Override -> Local Model
    if (currentContext.privacyModeStrict || !currentContext.networkAvailable) {
      console.log(`[ModelRouter] Selected LOCAL model due to privacy/network constraints.`);
      return this.executeAndCache(this.localBridge, request, cacheKey);
    }

    // 4. Complexity / Token limits -> Cloud Model (Fallback only)
    const estimatedTokens = request.userPrompt.length / 4; 
    if (currentContext.isComplexGoal || estimatedTokens > 4000) {
      console.log(`[ModelRouter] Selected CLOUD model due to high complexity / large context.`);
      return this.executeAndCache(this.cloudBridge, request, cacheKey);
    }

    // Default: Local Model
    console.log(`[ModelRouter] Selected LOCAL model as default.`);
    return this.executeAndCache(this.localBridge, request, cacheKey);
  }

  private async executeAndCache(bridge: LLMBridge, request: LLMRequest, cacheKey: string): Promise<LLMResponse> {
    const res = await bridge.generate(request);
    this.responseCache.set(cacheKey, res);
    return res;
  }

  private hashRequest(request: LLMRequest, context: any): string {
    // Simple hash for demo
    return request.userPrompt + (context.activeApp || '');
  }
}
