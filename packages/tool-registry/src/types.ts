import type { ZodObject, ZodRawShape } from "zod";

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  schema: ZodObject<ZodRawShape>;
  execute(input: TInput): Promise<TOutput> | TOutput;
}

export interface ToolCall {
  id: string;
  name: string;
  argsJson: string;
}

export interface ToolResult {
  id: string;
  name: string;
  output: unknown;
  error?: string;
}

export interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
