import { OpenAIClient } from "./providers/openai.js";
import { AnthropicClient } from "./providers/anthropic.js";
import type {
  LLMClient,
  OpenAIClientConfig,
  AnthropicClientConfig,
  CompletionResult,
} from "./types.js";

export function createClient(provider: "openai", config: OpenAIClientConfig): LLMClient;
export function createClient(
  provider: "anthropic",
  config: AnthropicClientConfig,
): LLMClient;
export function createClient(
  provider: "openai" | "anthropic",
  config: OpenAIClientConfig | AnthropicClientConfig,
): LLMClient {
  switch (provider) {
    case "openai":
      return new OpenAIClient(config as OpenAIClientConfig);
    case "anthropic":
      return new AnthropicClient(config as AnthropicClientConfig);
  }
}

export async function collectStream(
  gen: AsyncGenerator<string, CompletionResult, unknown>,
): Promise<{ text: string; result: CompletionResult }> {
  let text = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await gen.next();
    if (done) {
      return { text, result: value as CompletionResult };
    }
    text += value as string;
  }
}
