import { LLMBridge, LLMRequest, LLMResponse } from '../LLMBridge';

export class OpenAIProvider implements LLMBridge {
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[OpenAIProvider] Generating cloud response...`);
    // Stub implementation
    return {
      content: '{"id": "workflow", "nodes": []}', // Mock DAG JSON
      tokensUsed: 450,
      model: 'gpt-4'
    };
  }

  public async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    throw new Error('Method not implemented.');
  }
}
