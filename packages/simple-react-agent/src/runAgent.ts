import type { AgentOptions, AgentResult, AgentStep, ToolResult } from "./types.js";
import { MaxIterationsError } from "./errors.js";
import { extractToolCalls, buildAssistantToolMessage, buildToolResultMessages } from "./adapters.js";

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
  const { client, registry, model, maxIterations = 10, temperature, maxTokens } = options;
  const history = [...options.messages] as unknown[];
  const steps: AgentStep[] = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const tools = client.provider === "openai"
      ? registry.toOpenAITools()
      : registry.toAnthropicTools();

    const result = await client.complete({
      model,
      messages: history as never,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      tools,
    });

    if (result.finishReason === "stop" || result.finishReason === "length") {
      steps.push({ type: "finish", text: result.content });
      return { answer: result.content, steps, iterations: iteration + 1 };
    }

    if (result.finishReason === "tool_calls") {
      const calls = extractToolCalls(result, client.provider);
      if (calls.length === 0) {
        steps.push({ type: "finish", text: result.content });
        return { answer: result.content, steps, iterations: iteration + 1 };
      }

      const results: ToolResult[] = await Promise.all(
        calls.map(async (call) => {
          try {
            return await registry.execute(call.name, call.argsJson);
          } catch (err) {
            return {
              id: call.id,
              name: call.name,
              output: null,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        })
      );

      steps.push({ type: "tool_call", calls, results });

      history.push(buildAssistantToolMessage(result, client.provider));
      buildToolResultMessages(calls, results, client.provider).forEach((m) => history.push(m));
    }
  }

  throw new MaxIterationsError(maxIterations);
}
