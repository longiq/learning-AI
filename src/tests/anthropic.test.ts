import { describe, it, expect } from "vitest";
import { AnthropicClient } from "../providers/anthropic.js";
import { LLMAuthError, LLMRateLimitError, LLMProviderError } from "../errors.js";
import { createMockAnthropicFetch } from "./fixtures/mock-anthropic.js";

const BASE_OPTS = {
  model: "claude-haiku-4-5",
  messages: [{ role: "user" as const, content: "Hello" }],
};

describe("AnthropicClient", () => {
  describe("complete()", () => {
    it("returns normalized CompletionResult", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Hi there", inputTokens: 10, outputTokens: 3 }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.content).toBe("Hi there");
      expect(result.finishReason).toBe("stop");
      expect(result.usage?.promptTokens).toBe(10);
      expect(result.usage?.completionTokens).toBe(3);
      expect(result.usage?.totalTokens).toBe(13);
    });

    it("maps stop_reason 'max_tokens' to 'length'", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Cut", stopReason: "max_tokens" }) as typeof fetch,
      });
      const result = await client.complete(BASE_OPTS);
      expect(result.finishReason).toBe("length");
    });

    it("extracts system message from messages array", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Ok" }) as typeof fetch,
      });
      const result = await client.complete({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hi" },
        ],
      });
      expect(result.content).toBe("Ok");
    });

    it("clamps temperature to 1.0 for Anthropic", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Ok" }) as typeof fetch,
      });
      // Should not throw even with temperature > 1
      const result = await client.complete({ ...BASE_OPTS, temperature: 1.5 });
      expect(result.content).toBe("Ok");
    });

    it("throws LLMAuthError on 401", async () => {
      const client = new AnthropicClient({
        apiKey: "bad-key",
        fetch: createMockAnthropicFetch({ content: "", statusCode: 401, errorMessage: "Invalid key" }) as typeof fetch,
      });
      await expect(client.complete(BASE_OPTS)).rejects.toBeInstanceOf(LLMAuthError);
    });

    it("throws LLMRateLimitError on 429 with retryAfter", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "", statusCode: 429, errorMessage: "Rate limited" }) as typeof fetch,
      });
      const err = await client.complete(BASE_OPTS).catch((e) => e);
      expect(err).toBeInstanceOf(LLMRateLimitError);
      expect((err as LLMRateLimitError).retryAfter).toBe(30);
    });

    it("throws LLMProviderError on 500", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "", statusCode: 500, errorMessage: "Server error" }) as typeof fetch,
      });
      await expect(client.complete(BASE_OPTS)).rejects.toBeInstanceOf(LLMProviderError);
    });
  });

  describe("stream()", () => {
    it("yields text chunks progressively", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Hello" }) as typeof fetch,
      });
      const chunks: string[] = [];
      for await (const chunk of client.stream(BASE_OPTS)) {
        chunks.push(chunk);
      }
      expect(chunks.join("")).toBe("Hello");
    });

    it("returns CompletionResult as TReturn after stream ends", async () => {
      const client = new AnthropicClient({
        apiKey: "test",
        fetch: createMockAnthropicFetch({ content: "Hi" }) as typeof fetch,
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
      expect(result?.finishReason).toBe("stop");
    });
  });

  describe("provider field", () => {
    it("is 'anthropic'", () => {
      const client = new AnthropicClient({ apiKey: "test" });
      expect(client.provider).toBe("anthropic");
    });
  });
});
