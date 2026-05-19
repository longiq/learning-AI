import type { LLMClient, Message } from "@llm-series/llm-client";

// Local interface mirrors @llm-series/tool-registry ToolCall shape
export interface ToolCall {
  id: string;
  name: string;
  argsJson: string;
}

// Local interface mirrors @llm-series/tool-registry ToolResult shape
export interface ToolResult {
  id: string;
  name: string;
  output: unknown;
  error?: string;
}

// Minimal ToolRegistry interface — compatible with @llm-series/tool-registry ToolRegistry class
export interface ToolRegistryLike {
  execute(name: string, argsJson: string): Promise<ToolResult>;
  toOpenAITools(): unknown[];
  toAnthropicTools(): unknown[];
}

export interface AgentOptions {
  client: LLMClient;
  registry: ToolRegistryLike;
  messages: Message[];
  model: string;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
}

export type AgentStep =
  | { type: "tool_call"; calls: ToolCall[]; results: ToolResult[] }
  | { type: "finish"; text: string };

export interface AgentResult {
  answer: string;
  steps: AgentStep[];
  iterations: number;
}
