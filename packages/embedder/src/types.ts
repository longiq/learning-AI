export interface EmbedderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
}

export interface EmbeddingResult {
  vector: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}
