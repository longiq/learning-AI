import { describe, it, expect } from "vitest";
import type { LLMClient, CompletionResult, CompletionOptions } from "@llm-series/llm-client";
import type { Message } from "../src/types.js";
import { AgentRouter } from "../src/AgentRouter.js";
import { RouterError, NoAgentsError, UnknownAgentError, AgentRunError } from "../src/errors.js";

function makeMockClient(
  responses: Array<{ content: string }>,
  provider: "openai" | "anthropic" = "openai",
): LLMClient {
  let i = 0;
  return {
    provider,
    async complete(): Promise<CompletionResult> {
      const r = responses[i++];
      if (!r) throw new Error("No more mock responses");
      return { content: r.content, finishReason: "stop", raw: {} };
    },
    async *stream() {
      throw new Error("not implemented");
    },
  };
}

function makeCapturingClient(
  responses: Array<{ content: string }>,
): { client: LLMClient; calls: CompletionOptions[] } {
  const calls: CompletionOptions[] = [];
  let i = 0;
  const client: LLMClient = {
    provider: "openai",
    async complete(opts): Promise<CompletionResult> {
      calls.push(opts);
      const r = responses[i++];
      if (!r) throw new Error("No more mock responses");
      return { content: r.content, finishReason: "stop", raw: {} };
    },
    async *stream() {
      throw new Error("not implemented");
    },
  };
  return { client, calls };
}

const routeTo = (name: string): { content: string } => ({
  content: `{"agent":"${name}"}`,
});

const baseMessages: Message[] = [{ role: "user", content: "What is 2+2?" }];

describe("AgentRouter — register()", () => {
  it("returns this for fluent chaining", () => {
    const router = new AgentRouter({
      client: makeMockClient([]),
      model: "gpt-4o",
    });
    const result = router.register({
      name: "a",
      description: "d",
      run: async () => "ok",
    });
    expect(result).toBe(router);
  });

  it("throws RouterError on duplicate agent name", () => {
    const router = new AgentRouter({
      client: makeMockClient([]),
      model: "gpt-4o",
    });
    router.register({ name: "a", description: "d", run: async () => "ok" });
    expect(() =>
      router.register({ name: "a", description: "d2", run: async () => "ok2" }),
    ).toThrow(RouterError);
  });

  it("registers agents passed in constructor", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("math")]),
      model: "gpt-4o",
      agents: [
        { name: "math", description: "handles math", run: async () => "4" },
      ],
    });
    const result = await router.route(baseMessages);
    expect(result.agentName).toBe("math");
  });

  it("constructor respects duplicate detection for agents array", () => {
    expect(
      () =>
        new AgentRouter({
          client: makeMockClient([]),
          model: "gpt-4o",
          agents: [
            { name: "a", description: "d", run: async () => "ok" },
            { name: "a", description: "d2", run: async () => "ok2" },
          ],
        }),
    ).toThrow(RouterError);
  });
});

describe("AgentRouter — route() — NoAgentsError", () => {
  it("throws NoAgentsError when no agents are registered", async () => {
    const router = new AgentRouter({
      client: makeMockClient([]),
      model: "gpt-4o",
    });
    await expect(router.route(baseMessages)).rejects.toBeInstanceOf(NoAgentsError);
  });
});

describe("AgentRouter — route() — successful routing", () => {
  it("routes to the correct agent and returns its answer", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("math")]),
      model: "gpt-4o",
    });
    router.register({ name: "math", description: "handles math", run: async () => "4" });
    router.register({ name: "code", description: "handles code", run: async () => "const x = 1" });

    const result = await router.route(baseMessages);
    expect(result.answer).toBe("4");
    expect(result.agentName).toBe("math");
  });

  it("passes original messages to agent.run()", async () => {
    const originalMessages: Message[] = [{ role: "user", content: "original question" }];
    let receivedMessages: Message[] | undefined;

    const router = new AgentRouter({
      client: makeMockClient([routeTo("a")]),
      model: "gpt-4o",
    });
    router.register({
      name: "a",
      description: "d",
      run: async (msgs) => {
        receivedMessages = msgs;
        return "ok";
      },
    });

    await router.route(originalMessages);
    expect(receivedMessages).toEqual(originalMessages);
  });

  it("sends only last user message content to LLM classifier", async () => {
    const messages: Message[] = [
      { role: "user", content: "first message" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "last message" },
    ];
    const { client, calls } = makeCapturingClient([routeTo("a")]);

    const router = new AgentRouter({ client, model: "gpt-4o" });
    router.register({ name: "a", description: "d", run: async () => "ok" });

    await router.route(messages);

    const routingCall = calls[0];
    const userMsg = routingCall?.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toBe("last message");
  });

  it("RouterResult contains correct answer and agentName", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("writer")]),
      model: "gpt-4o",
    });
    router.register({
      name: "writer",
      description: "writes text",
      run: async () => "Once upon a time",
    });

    const result = await router.route(baseMessages);
    expect(result).toEqual({ answer: "Once upon a time", agentName: "writer" });
  });
});

describe("AgentRouter — route() — UnknownAgentError", () => {
  it("throws UnknownAgentError when LLM returns name not in registry", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("nonexistent")]),
      model: "gpt-4o",
    });
    router.register({ name: "real", description: "d", run: async () => "ok" });

    await expect(router.route(baseMessages)).rejects.toBeInstanceOf(UnknownAgentError);
  });

  it("UnknownAgentError.agentName equals the LLM returned name", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("ghost")]),
      model: "gpt-4o",
    });
    router.register({ name: "real", description: "d", run: async () => "ok" });

    const err = await router.route(baseMessages).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnknownAgentError);
    expect((err as UnknownAgentError).agentName).toBe("ghost");
  });

  it("propagates StructuredOutputError when LLM returns invalid JSON", async () => {
    const router = new AgentRouter({
      client: makeMockClient([{ content: "not valid json at all" }]),
      model: "gpt-4o",
    });
    router.register({ name: "a", description: "d", run: async () => "ok" });

    await expect(router.route(baseMessages)).rejects.toThrow();
  });
});

describe("AgentRouter — route() — AgentRunError", () => {
  it("wraps agent.run() Error in AgentRunError with .cause", async () => {
    const originalError = new Error("agent failed");
    const router = new AgentRouter({
      client: makeMockClient([routeTo("a")]),
      model: "gpt-4o",
    });
    router.register({
      name: "a",
      description: "d",
      run: async () => {
        throw originalError;
      },
    });

    const err = await router.route(baseMessages).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AgentRunError);
    expect((err as AgentRunError).cause).toBe(originalError);
  });

  it("wraps non-Error throws in AgentRunError with .cause", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("a")]),
      model: "gpt-4o",
    });
    router.register({
      name: "a",
      description: "d",
      run: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string error";
      },
    });

    const err = await router.route(baseMessages).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AgentRunError);
    expect((err as AgentRunError).cause).toBe("string error");
  });

  it("AgentRunError.agentName identifies which agent failed", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("faulty")]),
      model: "gpt-4o",
    });
    router.register({
      name: "faulty",
      description: "d",
      run: async () => {
        throw new Error("boom");
      },
    });

    const err = await router.route(baseMessages).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AgentRunError);
    expect((err as AgentRunError).agentName).toBe("faulty");
  });
});

describe("AgentRouter — maxTokens option", () => {
  it("passes maxTokens to client.complete() when set", async () => {
    const { client, calls } = makeCapturingClient([routeTo("a")]);
    const router = new AgentRouter({ client, model: "gpt-4o", maxTokens: 100 });
    router.register({ name: "a", description: "d", run: async () => "ok" });

    await router.route(baseMessages);
    expect(calls[0]?.maxTokens).toBe(100);
  });

  it("does not include maxTokens key when not configured", async () => {
    const { client, calls } = makeCapturingClient([routeTo("a")]);
    const router = new AgentRouter({ client, model: "gpt-4o" });
    router.register({ name: "a", description: "d", run: async () => "ok" });

    await router.route(baseMessages);
    expect("maxTokens" in (calls[0] ?? {})).toBe(false);
  });
});

describe("AgentRouter — multi-agent scenarios", () => {
  it("routes correctly when 3 agents are registered", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("code")]),
      model: "gpt-4o",
    });
    router
      .register({ name: "math", description: "math", run: async () => "math answer" })
      .register({ name: "code", description: "code", run: async () => "code answer" })
      .register({ name: "search", description: "search", run: async () => "search answer" });

    const result = await router.route([{ role: "user", content: "write a function" }]);
    expect(result.agentName).toBe("code");
    expect(result.answer).toBe("code answer");
  });

  it("second route() call can select a different agent", async () => {
    const router = new AgentRouter({
      client: makeMockClient([routeTo("math"), routeTo("code")]),
      model: "gpt-4o",
    });
    router
      .register({ name: "math", description: "math", run: async () => "4" })
      .register({ name: "code", description: "code", run: async () => "const x = 2" });

    const r1 = await router.route([{ role: "user", content: "What is 2+2?" }]);
    const r2 = await router.route([{ role: "user", content: "Write a variable" }]);

    expect(r1.agentName).toBe("math");
    expect(r2.agentName).toBe("code");
  });
});
