import { describe, it, expect } from "vitest";
import { createClient, collectStream } from "../client.js";
import { OpenAIClient } from "../providers/openai.js";
import { AnthropicClient } from "../providers/anthropic.js";
import type { LLMClient } from "../types.js";
import { createMockOpenAIFetch } from "./fixtures/mock-openai.js";

describe("createClient()", () => {
  it("returns OpenAIClient for provider='openai'", () => {
    const client = createClient("openai", { apiKey: "test" });
    expect(client.provider).toBe("openai");
    expect(client).toBeInstanceOf(OpenAIClient);
  });

  it("returns AnthropicClient for provider='anthropic'", () => {
    const client = createClient("anthropic", { apiKey: "test" });
    expect(client.provider).toBe("anthropic");
    expect(client).toBeInstanceOf(AnthropicClient);
  });

  it("satisfies LLMClient interface", () => {
    const client: LLMClient = createClient("openai", { apiKey: "test" });
    expect(typeof client.complete).toBe("function");
    expect(typeof client.stream).toBe("function");
    expect(typeof client.provider).toBe("string");
  });
});

describe("collectStream()", () => {
  it("accumulates chunks into full text", async () => {
    const client = createClient("openai", {
      apiKey: "test",
      fetch: createMockOpenAIFetch({ content: "Hello world" }) as typeof fetch,
    });
    const { text } = await collectStream(
      client.stream({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hi" }] }),
    );
    expect(text).toBe("Hello world");
  });

  it("returns CompletionResult with finishReason", async () => {
    const client = createClient("openai", {
      apiKey: "test",
      fetch: createMockOpenAIFetch({ content: "Done" }) as typeof fetch,
    });
    const { result } = await collectStream(
      client.stream({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hi" }] }),
    );
    expect(result.finishReason).toBeDefined();
    expect(result.content).toBe("Done");
  });

  it("handles empty content stream", async () => {
    const client = createClient("openai", {
      apiKey: "test",
      fetch: createMockOpenAIFetch({ content: "" }) as typeof fetch,
    });
    const { text } = await collectStream(
      client.stream({ model: "gpt-4o-mini", messages: [{ role: "user", content: "Hi" }] }),
    );
    expect(text).toBe("");
  });
});
