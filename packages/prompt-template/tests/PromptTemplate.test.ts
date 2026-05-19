import { describe, it, expect } from "vitest";
import { PromptTemplate } from "../src/PromptTemplate.js";
import { TemplateRenderError } from "../src/types.js";

describe("constructor", () => {
  it("exposes .variables from system and user combined", () => {
    const t = new PromptTemplate({ system: "You are {{role}}", user: "{{question}}" });
    expect(t.variables).toEqual(["role", "question"]);
  });

  it("deduplicates variables appearing in both system and user", () => {
    const t = new PromptTemplate({ system: "{{lang}} assistant", user: "Explain {{lang}}" });
    expect(t.variables).toEqual(["lang"]);
  });

  it("stores examples defensively — mutating input array after construction has no effect", () => {
    const examples = [{ user: "Q", assistant: "A" }];
    const t = new PromptTemplate({ user: "{{q}}", examples });
    examples.push({ user: "Q2", assistant: "A2" });
    const messages = t.render({ q: "hello" });
    // Only 3 messages: example user + example assistant + live user
    expect(messages.length).toBe(3);
  });
});

describe("render — message structure", () => {
  it("produces [system, user] when system is set", () => {
    const t = new PromptTemplate({ system: "sys", user: "usr" });
    const msgs = t.render();
    expect(msgs).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "usr" },
    ]);
  });

  it("produces [user] when system is not set", () => {
    const t = new PromptTemplate({ user: "hello" });
    expect(t.render()).toEqual([{ role: "user", content: "hello" }]);
  });

  it("with examples and no system: [user, assistant, user]", () => {
    const t = new PromptTemplate({
      user: "live",
      examples: [{ user: "ex-u", assistant: "ex-a" }],
    });
    expect(t.render()).toEqual([
      { role: "user", content: "ex-u" },
      { role: "assistant", content: "ex-a" },
      { role: "user", content: "live" },
    ]);
  });

  it("with examples and system: [system, user, assistant, user]", () => {
    const t = new PromptTemplate({
      system: "sys",
      user: "live",
      examples: [{ user: "ex-u", assistant: "ex-a" }],
    });
    expect(t.render()).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "ex-u" },
      { role: "assistant", content: "ex-a" },
      { role: "user", content: "live" },
    ]);
  });

  it("multiple examples produce correct alternating pairs before final user turn", () => {
    const t = new PromptTemplate({
      user: "live",
      examples: [
        { user: "u1", assistant: "a1" },
        { user: "u2", assistant: "a2" },
      ],
    });
    const msgs = t.render();
    expect(msgs.map((m) => `${m.role}:${m.content}`)).toEqual([
      "user:u1", "assistant:a1",
      "user:u2", "assistant:a2",
      "user:live",
    ]);
  });

  it("render() with no args works when template has no variables", () => {
    const t = new PromptTemplate({ user: "static message" });
    expect(() => t.render()).not.toThrow();
    expect(t.render()[0].content).toBe("static message");
  });
});

describe("render — variable interpolation", () => {
  it("interpolates system variables", () => {
    const t = new PromptTemplate({ system: "You are {{role}}", user: "hi" });
    expect(t.render({ role: "a coder" })[0].content).toBe("You are a coder");
  });

  it("interpolates user variables", () => {
    const t = new PromptTemplate({ user: "Explain {{topic}}" });
    expect(t.render({ topic: "closures" })[0].content).toBe("Explain closures");
  });

  it("same variable used in both system and user is interpolated correctly in each", () => {
    const t = new PromptTemplate({ system: "Lang: {{lang}}", user: "Write in {{lang}}" });
    const msgs = t.render({ lang: "Python" });
    expect(msgs[0].content).toBe("Lang: Python");
    expect(msgs[1].content).toBe("Write in Python");
  });

  it("throws TemplateRenderError with correct .missingVariables when var absent", () => {
    const t = new PromptTemplate({ user: "Hello {{name}}" });
    try {
      t.render({});
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TemplateRenderError);
      expect((e as TemplateRenderError).missingVariables).toEqual(["name"]);
    }
  });
});

describe("render — few-shot examples are not interpolated", () => {
  it("example strings containing {{placeholder}} are emitted verbatim", () => {
    const t = new PromptTemplate({
      user: "{{q}}",
      examples: [{ user: "What is {{x}}?", assistant: "It is {{y}}." }],
    });
    const msgs = t.render({ q: "hello" });
    expect(msgs[0].content).toBe("What is {{x}}?");
    expect(msgs[1].content).toBe("It is {{y}}.");
  });
});

describe("render — return type", () => {
  it("returned array is a new array each call", () => {
    const t = new PromptTemplate({ user: "hello" });
    expect(t.render()).not.toBe(t.render());
  });

  it("each Message object has exactly role and content keys", () => {
    const t = new PromptTemplate({ system: "sys", user: "usr" });
    for (const msg of t.render()) {
      expect(Object.keys(msg).sort()).toEqual(["content", "role"]);
    }
  });
});

describe("withExamples", () => {
  it("returns a new PromptTemplate, not the same instance", () => {
    const t = new PromptTemplate({ user: "hi" });
    expect(t.withExamples([])).not.toBe(t);
  });

  it("original template is unchanged", () => {
    const t = new PromptTemplate({ user: "hi" });
    t.withExamples([{ user: "Q", assistant: "A" }]);
    expect(t.render().length).toBe(1);
  });

  it("new template renders with both old and new examples", () => {
    const t = new PromptTemplate({
      user: "live",
      examples: [{ user: "u1", assistant: "a1" }],
    });
    const t2 = t.withExamples([{ user: "u2", assistant: "a2" }]);
    const msgs = t2.render();
    expect(msgs.length).toBe(5); // u1, a1, u2, a2, live
    expect(msgs[2].content).toBe("u2");
  });

  it("can be chained", () => {
    const t = new PromptTemplate({ user: "live" });
    const t3 = t
      .withExamples([{ user: "u1", assistant: "a1" }])
      .withExamples([{ user: "u2", assistant: "a2" }]);
    expect(t3.render().length).toBe(5);
  });
});
