import type { CompletionResult } from "@llm-series/llm-client";
import type { ToolCall, ToolResult } from "./types.js";

interface OpenAIRaw {
  choices: Array<{
    message: {
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
  }>;
}

interface AnthropicRaw {
  content: Array<{
    type: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
}

export function extractToolCalls(result: CompletionResult, provider: "openai" | "anthropic"): ToolCall[] {
  if (result.finishReason !== "tool_calls") return [];

  if (provider === "openai") {
    const raw = result.raw as OpenAIRaw;
    const toolCalls = raw.choices[0]?.message.tool_calls;
    if (!toolCalls) return [];
    return toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      argsJson: tc.function.arguments,
    }));
  } else {
    const raw = result.raw as AnthropicRaw;
    return raw.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        id: block.id ?? "",
        name: block.name ?? "",
        argsJson: JSON.stringify(block.input ?? {}),
      }));
  }
}

export function buildAssistantToolMessage(result: CompletionResult, provider: "openai" | "anthropic"): unknown {
  if (provider === "openai") {
    const raw = result.raw as OpenAIRaw;
    const msg = raw.choices[0]?.message;
    return { role: "assistant", content: result.content || null, tool_calls: msg?.tool_calls };
  } else {
    const raw = result.raw as AnthropicRaw;
    return { role: "assistant", content: raw.content };
  }
}

export function buildToolResultMessages(
  calls: ToolCall[],
  results: ToolResult[],
  provider: "openai" | "anthropic"
): unknown[] {
  if (provider === "openai") {
    return results.map((r, i) => ({
      role: "tool",
      tool_call_id: calls[i]?.id ?? r.id,
      content: r.error != null ? `Error: ${r.error}` : JSON.stringify(r.output),
    }));
  } else {
    return [
      {
        role: "user",
        content: results.map((r, i) => ({
          type: "tool_result",
          tool_use_id: calls[i]?.id ?? r.id,
          content: r.error != null ? `Error: ${r.error}` : JSON.stringify(r.output),
          is_error: r.error != null,
        })),
      },
    ];
  }
}
