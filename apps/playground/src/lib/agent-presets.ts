import type { RouterAgent } from "@llm-series/agent-router";
import { getClient } from "./client-factory";
import { env } from "./env";

export function buildPresetAgents(provider?: "openai" | "anthropic"): RouterAgent[] {
  const model = env.DEFAULT_MODEL;

  return [
    {
      name: "math-agent",
      description: "Handles arithmetic, calculations, percentages, algebra, and numerical reasoning",
      run: async (messages) => {
        const client = getClient(provider);
        const systemMsg = {
          role: "system" as const,
          content: "You are a math expert. Solve problems step by step, show your work clearly.",
        };
        const result = await client.complete({ model, messages: [systemMsg, ...messages] });
        return result.content;
      },
    },
    {
      name: "writing-agent",
      description:
        "Helps with writing, grammar correction, text editing, summarization, and language tasks",
      run: async (messages) => {
        const client = getClient(provider);
        const systemMsg = {
          role: "system" as const,
          content:
            "You are a professional writing assistant. Help with grammar, style, clarity, and composition.",
        };
        const result = await client.complete({ model, messages: [systemMsg, ...messages] });
        return result.content;
      },
    },
    {
      name: "code-agent",
      description:
        "Answers programming questions, explains code, debugs issues, and writes code examples",
      run: async (messages) => {
        const client = getClient(provider);
        const systemMsg = {
          role: "system" as const,
          content:
            "You are a senior software engineer. Provide clear code examples with explanations. Use TypeScript when language is unspecified.",
        };
        const result = await client.complete({ model, messages: [systemMsg, ...messages] });
        return result.content;
      },
    },
  ];
}
