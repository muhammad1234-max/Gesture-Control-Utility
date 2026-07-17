export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface LLMBridge {
  generate(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest, onChunk: (chunk: string) => void): Promise<LLMResponse>;
}
