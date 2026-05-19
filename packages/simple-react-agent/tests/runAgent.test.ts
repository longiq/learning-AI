import { describe, it, expect } from "vitest";
import type { LLMClient, CompletionResult } from "@llm-series/llm-client";
import type { ToolRegistryLike, ToolResult } from "../src/types.js";
import { runAgent } from "../src/runAgent.js";
import { MaxIterationsError } from "../src/errors.js";

function makeMockClient(responses: CompletionResult[], provider: "openai" | "anthropic" = "openai"): LLMClient {
  let callCount = 0;
  return {
    provider,
    async complete() {
      const response = responses[callCount++];
      if (!response) throw new Error("No more mock responses");
      return response;
    },
    async *stream() {
      throw new Error("not implemented");
    },
  };
}

function makeMockRegistry(tools: Record<string, (argsJson: string) => Promise<unknown>>): ToolRegistryLike {
  return {
    toOpenAITools: () => [],
    toAnthropicTools: () => [],
    async execute(name, argsJson): Promise<ToolResult> {
      const fn = tools[name];
      if (!fn) throw new Error(`Tool not found: ${name}`);
      const output = await fn(argsJson);
      return { id: "result_1", name, output };
    },
  };
}

const stopResponse = (content: string): CompletionResult => ({
  content,
  finishReason: "stop",
  raw: {},
});

const openAIToolCallResponse = (toolName: string, toolArgs: string, callId = "call_1"): CompletionResult => ({
  content: "",
  finishReason: "tool_calls",
  raw: {
    choices: [
      {
        message: {
          tool_calls: [
            {
              id: callId,
              type: "function",
              function: { name: toolName, arguments: toolArgs },
            },
          ],
        },
      },
    ],
  },
});

const anthropicToolCallResponse = (toolName: string, toolInput: Record<string, unknown>, callId = "tu_1"): CompletionResult => ({
  content: "",
  finishReason: "tool_calls",
  raw: {
    content: [
      {
        type: "tool_use",
        id: callId,
        name: toolName,
        input: toolInput,
      },
    ],
  },
});

const baseMessages = [{ role: "user" as const, content: "Hello" }];

describe("runAgent", () => {
  it("finishes in 1 iteration when LLM returns stop", async () => {
    const client = makeMockClient([stopResponse("42")]);
    const registry = makeMockRegistry({});

    const result = await runAgent({
      client,
      registry,
      messages: baseMessages,
      model: "gpt-4o",
    });

    expect(result.answer).toBe("42");
    expect(result.iterations).toBe(1);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.type).toBe("finish");
  });

  it("calls one tool then finishes (OpenAI)", async () => {
    const client = makeMockClient([
      openAIToolCallResponse("add", '{"a":1,"b":2}'),
      stopResponse("The answer is 3"),
    ]);
    const registry = makeMockRegistry({
      add: async (argsJson) => {
        const { a, b } = JSON.parse(argsJson) as { a: number; b: number };
        return a + b;
      },
    });

    const result = await runAgent({
      client,
      registry,
      messages: baseMessages,
      model: "gpt-4o",
    });

    expect(result.answer).toBe("The answer is 3");
    expect(result.iterations).toBe(2);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.type).toBe("tool_call");
    if (result.steps[0]?.type === "tool_call") {
      expect(result.steps[0].calls[0]?.name).toBe("add");
      expect(result.steps[0].results[0]?.output).toBe(3);
    }
    expect(result.steps[1]?.type).toBe("finish");
  });

  it("calls multiple tools in sequence then finishes", async () => {
    const client = makeMockClient([
      openAIToolCallResponse("getWeather", '{"city":"Hanoi"}', "call_1"),
      openAIToolCallResponse("getTime", '{"tz":"Asia/Ho_Chi_Minh"}', "call_2"),
      stopResponse("Weather is sunny, time is noon"),
    ]);
    const registry = makeMockRegistry({
      getWeather: async () => "sunny",
      getTime: async () => "12:00",
    });

    const result = await runAgent({
      client,
      registry,
      messages: baseMessages,
      model: "gpt-4o",
    });

    expect(result.answer).toBe("Weather is sunny, time is noon");
    expect(result.iterations).toBe(3);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]?.type).toBe("tool_call");
    expect(result.steps[1]?.type).toBe("tool_call");
    expect(result.steps[2]?.type).toBe("finish");
  });

  it("throws MaxIterationsError when loop exceeds maxIterations", async () => {
    // Every response is a tool_call so it never finishes
    const responses = Array.from({ length: 5 }, () =>
      openAIToolCallResponse("loop", "{}")
    );
    const client = makeMockClient(responses);
    const registry = makeMockRegistry({
      loop: async () => "looping",
    });

    await expect(
      runAgent({
        client,
        registry,
        messages: baseMessages,
        model: "gpt-4o",
        maxIterations: 3,
      })
    ).rejects.toBeInstanceOf(MaxIterationsError);
  });

  it("sends tool execution error back to LLM as error field", async () => {
    const client = makeMockClient([
      openAIToolCallResponse("broken", '{}'),
      stopResponse("I got an error from the tool"),
    ]);
    const registry = makeMockRegistry({
      broken: async () => {
        throw new Error("tool failed");
      },
    });

    const result = await runAgent({
      client,
      registry,
      messages: baseMessages,
      model: "gpt-4o",
    });

    expect(result.answer).toBe("I got an error from the tool");
    expect(result.steps[0]?.type).toBe("tool_call");
    if (result.steps[0]?.type === "tool_call") {
      expect(result.steps[0].results[0]?.error).toBe("tool failed");
      expect(result.steps[0].results[0]?.output).toBeNull();
    }
  });

  it("works with Anthropic provider tool calls", async () => {
    const client = makeMockClient(
      [
        anthropicToolCallResponse("multiply", { x: 3, y: 4 }),
        stopResponse("Result is 12"),
      ],
      "anthropic"
    );
    const registry = makeMockRegistry({
      multiply: async (argsJson) => {
        const { x, y } = JSON.parse(argsJson) as { x: number; y: number };
        return x * y;
      },
    });

    const result = await runAgent({
      client,
      registry,
      messages: baseMessages,
      model: "claude-haiku-4-5",
    });

    expect(result.answer).toBe("Result is 12");
    expect(result.iterations).toBe(2);
    if (result.steps[0]?.type === "tool_call") {
      expect(result.steps[0].results[0]?.output).toBe(12);
    }
  });
});
