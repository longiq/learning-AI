export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface CompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  tools?: unknown[];
}

export interface CompletionResult {
  content: string;
  finishReason: "stop" | "length" | "tool_calls" | "unknown";
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Raw provider response for provider-specific fields (logprobs, tool calls, etc.) */
  raw: unknown;
}

export interface LLMClient {
  complete(options: CompletionOptions): Promise<CompletionResult>;
  /**
   * Yields text delta chunks. The generator returns a CompletionResult when done,
   * accessible via collectStream() helper.
   */
  stream(options: CompletionOptions): AsyncGenerator<string, CompletionResult, unknown>;
  readonly provider: "openai" | "anthropic";
}

export interface OpenAIClientConfig {
  apiKey: string;
  /** Override for Ollama, Azure, LM Studio, Groq, etc. */
  baseURL?: string;
  defaultModel?: string;
  organization?: string;
  /** Custom fetch implementation (useful for testing) */
  fetch?: typeof globalThis.fetch;
}

export interface AnthropicClientConfig {
  apiKey: string;
  defaultModel?: string;
  baseURL?: string;
  /** Custom fetch implementation (useful for testing) */
  fetch?: typeof globalThis.fetch;
}
