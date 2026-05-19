import type { LLMClient, Message } from "@llm-series/llm-client";

export type { Message };

export interface RouterAgent {
  name: string;
  description: string;
  run(messages: Message[]): Promise<string>;
}

export interface RouterOptions {
  client: LLMClient;
  model: string;
  agents?: RouterAgent[];
  maxTokens?: number;
}

export interface RouterResult {
  answer: string;
  agentName: string;
}
