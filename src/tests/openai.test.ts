import { describe, it, expect } from "vitest";
import { OpenAIClient } from "../providers/openai.js";
import { LLMAuthError, LLMRateLimitError, LLMProviderError } from "../errors.js";
import { createMockOpenAIFetch } from "./fixtures/mock-openai.js";

const BASE_OPTS = {
  model: "gpt-4o-mini",
  messages: [{ role: "user" as const, content: "Hello" }],
};

describe("OpenAIClient", () => {
  describe("complete()", () => {
    it("returns normalized CompletionResult", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "Hi there", promptTokens: 10, completionTokens: 3 }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.content).toBe("Hi there");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(3);
      expect(result.usage?.totalTokens).toBe(13);
    });

    it("maps finishReason 'length' correctly", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "Truncated", finishReason: "length" }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.finishReason).toBe("length");
    });

    it("maps finishReason 'tool_calls' correctly", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "", finishReason: "tool_calls" }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.finishReason).toBe("tool_calls");
    });

    it("exposes raw provider response", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "Raw" }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.raw).toBeDefined();
    });

    it("throws LLMAuthError on 401", async () => {
      const client = new OpenAIClient({
        apiKey: "bad-key",
        fetch: createMockOpenAIFetch({ content: "", statusCode: 401, errorMessage: "Invalid API key" }) as typeof fetch,
      });
      await expect(client.complete(BASE_OPTS)).rejects.toBeInstanceOf(LLMAuthError);
    });

    it("throws LLMRateLimitError on 429 with retryAfter", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "", statusCode: 429, errorMessage: "Rate limited" }) as typeof fetch,
      });
      const err = await client.complete(BASE_OPTS).catch((e) => e);
      expect(err).toBeInstanceOf(LLMRateLimitError);
      expect((err as LLMRateLimitError).retryAfter).toBe(30);
    });

    it("throws LLMProviderError on 500", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "", statusCode: 500, errorMessage: "Server error" }) as typeof fetch,
      });
      await expect(client.complete(BASE_OPTS)).rejects.toBeInstanceOf(LLMProviderError);
    });
  });

  describe("stream()", () => {
    it("yields text chunks progressively", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "Hello" }) as typeof fetch,
      });
      const chunks: string[] = [];
      const gen = client.stream(BASE_OPTS);
      for await (const chunk of gen) {
        chunks.push(chunk);
      }
      expect(chunks.join("")).toBe("Hello");
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("returns CompletionResult as TReturn after stream ends", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "Hi" }) as typeof fetch,
      });
      const gen = client.stream(BASE_OPTS);
      let result;
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          result = value;
          break;
        }
      }
      expect(result?.content).toBe("Hi");
      expect(result?.finishReason).toBeDefined();
    });

    it("throws LLMRateLimitError on 429 during stream", async () => {
      const client = new OpenAIClient({
        apiKey: "test",
        fetch: createMockOpenAIFetch({ content: "", statusCode: 429, errorMessage: "Rate limited" }) as typeof fetch,
      });
      const gen = client.stream(BASE_OPTS);
      await expect(gen.next()).rejects.toBeInstanceOf(LLMRateLimitError);
    });
  });

  describe("provider field", () => {
    it("is 'openai'", () => {
      const client = new OpenAIClient({ apiKey: "test" });
      expect(client.provider).toBe("openai");
    });
  });
});
