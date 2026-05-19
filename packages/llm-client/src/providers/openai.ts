import OpenAI from "openai";
import type {
  LLMClient,
  OpenAIClientConfig,
  CompletionOptions,
  CompletionResult,
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
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
    case "function_call":
      return "tool_calls";
    default:
      return "unknown";
  }
}

function wrapError(err: unknown, provider: "openai"): never {
  if (err instanceof OpenAI.APIError) {
    const msg = err.message;
    if (err.status === 401) throw new LLMAuthError(msg, provider, err);
    if (err.status === 429) {
      const retryAfter = err.headers?.["retry-after"]
        ? Number(err.headers["retry-after"])
        : undefined;
      throw new LLMRateLimitError(msg, provider, retryAfter, err);
    }
    if (err.status === 400 && msg.toLowerCase().includes("context")) {
      throw new LLMContextLengthError(msg, provider, err);
    }
    throw new LLMProviderError(msg, provider, err.status, err);
  }
  throw new LLMProviderError(String(err), provider, undefined, err);
}

export class OpenAIClient implements LLMClient {
  readonly provider = "openai" as const;
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(config: OpenAIClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetch: config.fetch as any,
      maxRetries: 0,
    });
    this.defaultModel = config.defaultModel ?? "gpt-4o-mini";
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model ?? this.defaultModel,
        messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        ...(options.stop !== undefined && { stop: options.stop }),
        ...(options.tools ? { tools: options.tools as never } : {}),
        stream: false,
      });

      const choice = response.choices[0];
      return {
        content: choice?.message.content ?? "",
        finishReason: normalizeFinishReason(choice?.finish_reason),
        ...(response.usage && {
          usage: {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          },
        }),
        raw: response,
      };
    } catch (err) {
      wrapError(err, "openai");
    }
  }

  async *stream(
    options: CompletionOptions,
  ): AsyncGenerator<string, CompletionResult, unknown> {
    let accumulated = "";
    let finishReason: CompletionResult["finishReason"] = "unknown";
    let usage: CompletionResult["usage"];
    let rawLast: unknown;

    try {
      const streamResponse = await this.client.chat.completions.create({
        model: options.model ?? this.defaultModel,
        messages: options.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.maxTokens !== undefined && { max_tokens: options.maxTokens }),
        ...(options.stop !== undefined && { stop: options.stop }),
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of streamResponse) {
        rawLast = chunk;
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          yield delta;
        }
        const reason = chunk.choices[0]?.finish_reason;
        if (reason) finishReason = normalizeFinishReason(reason);
        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          };
        }
      }
    } catch (err) {
      wrapError(err, "openai");
    }

    return {
      content: accumulated,
      finishReason,
      ...(usage !== undefined && { usage }),
      raw: rawLast,
    };
  }
}
