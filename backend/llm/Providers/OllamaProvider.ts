import { LLMBridge, LLMRequest, LLMResponse } from '../LLMBridge';

export class OllamaProvider implements LLMBridge {
  public async generate(request: LLMRequest): Promise<LLMResponse> {
    console.log(`[OllamaProvider] Generating local response...`);
    // Stub implementation
    return {
      content: '{"id": "workflow", "nodes": []}', // Mock DAG JSON
      tokensUsed: 150,
      model: 'ollama-llama3'
    };
  }

  public async stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse> {
    throw new Error('Method not implemented.');
  }
}
