import type { LLMClient, Message } from "@llm-series/llm-client";
import type { ToolCall, ToolResult, ToolRegistry } from "@llm-series/tool-registry";

export type { ToolCall, ToolResult };

export interface AgentOptions {
  client: LLMClient;
  registry: ToolRegistry;
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
