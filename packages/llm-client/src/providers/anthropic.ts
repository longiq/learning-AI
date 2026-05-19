import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMClient,
  AnthropicClientConfig,
  CompletionOptions,
  CompletionResult,
  Message,
} from "../types.js";
import {
  LLMAuthError,
  LLMContextLengthError,
  LLMProviderError,
  LLMRateLimitError,
} from "../errors.js";

function normalizeFinishReason(
  reason: string | null | undefined,
): CompletionResult["finishReason"] {
  switch (reason) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return "unknown";
  }
}

function wrapError(err: unknown, provider: "anthropic"): never {
  if (err instanceof Anthropic.APIError) {
    const msg = err.message;
    if (err.status === 401) throw new LLMAuthError(msg, provider, err);
    if (err.status === 429) {
      const raw = err.headers?.["retry-after"] ?? err.headers?.get?.("retry-after");
      const retryAfter = raw != null ? Number(raw) : undefined;
      throw new LLMRateLimitError(msg, provider, retryAfter, err);
    }
    if (
      err.status === 400 &&
      (msg.toLowerCase().includes("too long") || msg.toLowerCase().includes("context"))
    ) {
      throw new LLMContextLengthError(msg, provider, err);
    }
    throw new LLMProviderError(msg, provider, err.status, err);
  }
  throw new LLMProviderError(String(err), provider, undefined, err);
}

function splitSystemMessages(messages: Message[]): {
  system: string | undefined;
  messages: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const rest: Anthropic.MessageParam[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(msg.content);
    } else {
      rest.push({ role: msg.role, content: msg.content });
    }
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n") : undefined,
    messages: rest,
  };
}

export class AnthropicClient implements LLMClient {
  readonly provider = "anthropic" as const;
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(config: AnthropicClientConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      fetch: config.fetch,
      maxRetries: 0,
    });
    this.defaultModel = config.defaultModel ?? "claude-haiku-4-5";
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const { system, messages } = splitSystemMessages(options.messages);

    try {
      const response = await this.client.messages.create({
        model: options.model ?? this.defaultModel,
        messages,
        max_tokens: options.maxTokens ?? 4096,
        ...(system !== undefined && { system }),
        ...(options.temperature !== undefined && {
          temperature: Math.min(1, options.temperature),
        }),
        ...(options.stop !== undefined && { stop_sequences: options.stop }),
        ...(options.tools ? { tools: options.tools as never } : {}),
        stream: false,
      });

      const block = response.content[0];
      const content = block?.type === "text" ? block.text : "";

      return {
        content,
        finishReason: normalizeFinishReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        raw: response,
      };
    } catch (err) {
      wrapError(err, "anthropic");
    }
  }

  async *stream(
    options: CompletionOptions,
  ): AsyncGenerator<string, CompletionResult, unknown> {
    const { system, messages } = splitSystemMessages(options.messages);
    let accumulated = "";
    let finishReason: CompletionResult["finishReason"] = "unknown";
    let usage: CompletionResult["usage"];
    let rawLast: unknown;

    try {
      const streamResponse = this.client.messages.stream({
        model: options.model ?? this.defaultModel,
        messages,
        max_tokens: options.maxTokens ?? 4096,
        ...(system !== undefined && { system }),
        ...(options.temperature !== undefined && {
          temperature: Math.min(1, options.temperature),
        }),
        ...(options.stop !== undefined && { stop_sequences: options.stop }),
      });

      for await (const event of streamResponse) {
        rawLast = event;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const text = event.delta.text;
          accumulated += text;
          yield text;
        }
        if (event.type === "message_delta") {
          finishReason = normalizeFinishReason(event.delta.stop_reason);
          if (event.usage) {
            usage = {
              promptTokens: 0,
              completionTokens: event.usage.output_tokens,
              totalTokens: event.usage.output_tokens,
            };
          }
        }
        if (event.type === "message_start" && event.message.usage) {
          const inputTokens = event.message.usage.input_tokens;
          usage = {
            promptTokens: inputTokens,
            completionTokens: usage?.completionTokens ?? 0,
            totalTokens: inputTokens + (usage?.completionTokens ?? 0),
          };
        }
      }
    } catch (err) {
      wrapError(err, "anthropic");
    }

    if (usage) {
      usage = {
        ...usage,
        totalTokens: usage.promptTokens + usage.completionTokens,
      };
    }

    return {
      content: accumulated,
      finishReason,
      ...(usage !== undefined && { usage }),
      raw: rawLast,
    };
  }
}
