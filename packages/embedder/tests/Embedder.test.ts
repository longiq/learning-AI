import { describe, it, expect } from "vitest";
import {
  Embedder,
  EmbedderAuthError,
  EmbedderRateLimitError,
  EmbedderProviderError,
} from "../src/index.js";

function makeVector(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i / n);
}

function mockFetch(status: number, body: unknown, headers?: Record<string, string>): typeof globalThis.fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
}

function makeSuccessResponse(
  inputs: string[],
  model = "text-embedding-3-small",
): ReturnType<typeof mockFetch> {
  return mockFetch(200, {
    data: inputs.map((_, i) => ({ embedding: makeVector(4), index: i })),
    model,
    usage: { prompt_tokens: 10, total_tokens: 10 },
  });
}

describe("Embedder — embed()", () => {
  it("returns EmbeddingResult with vector, model, and usage", async () => {
    const embedder = new Embedder({
      apiKey: "sk-test",
      fetch: makeSuccessResponse(["hello"]),
    });
    const result = await embedder.embed("hello");
    expect(result.vector).toHaveLength(4);
    expect(result.model).toBe("text-embedding-3-small");
    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.totalTokens).toBe(10);
  });

  it("sends POST to /embeddings with correct body", async () => {
    let captured: { url: string; body: unknown } | undefined;
    const fetch: typeof globalThis.fetch = async (input, init) => {
      captured = {
        url: input.toString(),
        body: JSON.parse(init?.body as string),
      };
      return new Response(
        JSON.stringify({
          data: [{ embedding: [0.1], index: 0 }],
          model: "text-embedding-3-small",
          usage: { prompt_tokens: 1, total_tokens: 1 },
        }),
        { status: 200 },
      );
    };
    const embedder = new Embedder({ apiKey: "sk-test", fetch });
    await embedder.embed("test");
    expect(captured?.url).toContain("/embeddings");
    expect((captured?.body as { input: string[] }).input).toEqual(["test"]);
  });

  it("uses custom model when provided", async () => {
    let capturedBody: { model: string } | undefined;
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as { model: string };
      return new Response(
        JSON.stringify({
          data: [{ embedding: [0.1], index: 0 }],
          model: "text-embedding-ada-002",
          usage: { prompt_tokens: 1, total_tokens: 1 },
        }),
        { status: 200 },
      );
    };
    const embedder = new Embedder({ apiKey: "sk-test", model: "text-embedding-ada-002", fetch });
    await embedder.embed("hi");
    expect(capturedBody?.model).toBe("text-embedding-ada-002");
  });

  it("uses custom baseURL when provided", async () => {
    let capturedUrl = "";
    const fetch: typeof globalThis.fetch = async (input) => {
      capturedUrl = input.toString();
      return new Response(
        JSON.stringify({
          data: [{ embedding: [0.1], index: 0 }],
          model: "nomic-embed-text",
          usage: { prompt_tokens: 1, total_tokens: 1 },
        }),
        { status: 200 },
      );
    };
    const embedder = new Embedder({
      apiKey: "ollama",
      baseURL: "http://localhost:11434/v1",
      fetch,
    });
    await embedder.embed("hello");
    expect(capturedUrl).toBe("http://localhost:11434/v1/embeddings");
  });
});

describe("Embedder — embedBatch()", () => {
  it("returns empty array for empty input", async () => {
    const embedder = new Embedder({
      apiKey: "sk-test",
      fetch: makeSuccessResponse([]),
    });
    const result = await embedder.embedBatch([]);
    expect(result).toEqual([]);
  });

  it("returns one result per input text", async () => {
    const texts = ["one", "two", "three"];
    const embedder = new Embedder({
      apiKey: "sk-test",
      fetch: makeSuccessResponse(texts),
    });
    const result = await embedder.embedBatch(texts);
    expect(result).toHaveLength(3);
  });

  it("results are ordered by input index regardless of response order", async () => {
    const fetch: typeof globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          // response returns index 2 first, then 0, then 1 (out of order)
          data: [
            { embedding: [0.3], index: 2 },
            { embedding: [0.1], index: 0 },
            { embedding: [0.2], index: 1 },
          ],
          model: "text-embedding-3-small",
          usage: { prompt_tokens: 3, total_tokens: 3 },
        }),
        { status: 200 },
      );
    const embedder = new Embedder({ apiKey: "sk-test", fetch });
    const result = await embedder.embedBatch(["a", "b", "c"]);
    expect(result[0]!.vector).toEqual([0.1]);
    expect(result[1]!.vector).toEqual([0.2]);
    expect(result[2]!.vector).toEqual([0.3]);
  });
});

describe("Embedder — error handling", () => {
  it("throws EmbedderAuthError on 401", async () => {
    const embedder = new Embedder({
      apiKey: "bad-key",
      fetch: mockFetch(401, { error: "Unauthorized" }),
    });
    await expect(embedder.embed("hello")).rejects.toThrow(EmbedderAuthError);
  });

  it("throws EmbedderRateLimitError on 429", async () => {
    const embedder = new Embedder({
      apiKey: "sk-test",
      fetch: mockFetch(429, { error: "Rate limited" }, { "retry-after": "30" }),
    });
    const err = await embedder.embed("hello").catch((e) => e);
    expect(err).toBeInstanceOf(EmbedderRateLimitError);
    expect((err as EmbedderRateLimitError).retryAfter).toBe(30);
  });

  it("throws EmbedderProviderError on 500", async () => {
    const embedder = new Embedder({
      apiKey: "sk-test",
      fetch: mockFetch(500, { error: "Server error" }),
    });
    const err = await embedder.embed("hello").catch((e) => e);
    expect(err).toBeInstanceOf(EmbedderProviderError);
    expect((err as EmbedderProviderError).statusCode).toBe(500);
  });
});
