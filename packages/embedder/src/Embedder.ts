import type { EmbedderConfig, EmbeddingResult } from "./types.js";
import {
  EmbedderAuthError,
  EmbedderError,
  EmbedderProviderError,
  EmbedderRateLimitError,
} from "./errors.js";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

export class Embedder {
  readonly #config: Readonly<EmbedderConfig>;
  readonly #fetch: typeof globalThis.fetch;
  readonly #baseURL: string;
  readonly #model: string;

  constructor(config: EmbedderConfig) {
    this.#config = config;
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#baseURL = (config.baseURL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#model = config.model ?? DEFAULT_MODEL;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.#request([text]);
    const first = results[0];
    if (first === undefined) throw new EmbedderError("No embedding returned");
    return first;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];
    return this.#request(texts);
  }

  async #request(inputs: string[]): Promise<EmbeddingResult[]> {
    const response = await this.#fetch(`${this.#baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#config.apiKey}`,
      },
      body: JSON.stringify({ model: this.#model, input: inputs }),
    });

    if (!response.ok) {
      await this.#throwForStatus(response);
    }

    const body = (await response.json()) as OpenAIEmbeddingResponse;

    return body.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((item) => ({
        vector: item.embedding,
        model: body.model,
        usage: {
          promptTokens: body.usage.prompt_tokens,
          totalTokens: body.usage.total_tokens,
        },
      }));
  }

  async #throwForStatus(response: Response): Promise<never> {
    const text = await response.text().catch(() => "");

    if (response.status === 401) {
      throw new EmbedderAuthError(`Authentication failed: ${text}`);
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfter = retryAfterHeader !== null ? Number(retryAfterHeader) : undefined;
      throw new EmbedderRateLimitError(`Rate limited: ${text}`, retryAfter);
    }

    throw new EmbedderProviderError(
      `Provider error ${response.status}: ${text}`,
      response.status,
    );
  }
}
