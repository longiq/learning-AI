import { describe, it, expect } from "vitest";
import { MemoryStore } from "../src/index.js";
import type { MemoryEntry } from "../src/index.js";

describe("MemoryStore — constructor / size", () => {
  it("starts empty", () => {
    const store = new MemoryStore();
    expect(store.size).toBe(0);
    expect(store.getMessages()).toEqual([]);
    expect(store.getEntries()).toHaveLength(0);
  });
});

describe("MemoryStore — add()", () => {
  it("stores role and content correctly", () => {
    const store = new MemoryStore();
    store.add("user", "hello");
    expect(store.size).toBe(1);
    const entry = store.getEntries()[0]!;
    expect(entry.role).toBe("user");
    expect(entry.content).toBe("hello");
  });

  it("records timestamp as a number", () => {
    const store = new MemoryStore();
    const before = Date.now();
    store.add("assistant", "hi");
    const after = Date.now();
    const entry = store.getEntries()[0]!;
    expect(typeof entry.timestamp).toBe("number");
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  it("attaches metadata when provided", () => {
    const store = new MemoryStore();
    store.add("user", "test", { source: "api" });
    const entry = store.getEntries()[0]!;
    expect(entry.metadata).toEqual({ source: "api" });
  });

  it("omits the metadata property entirely when not provided", () => {
    const store = new MemoryStore();
    store.add("user", "no meta");
    const entry = store.getEntries()[0]!;
    expect("metadata" in entry).toBe(false);
  });
});

describe("MemoryStore — maxEntries sliding window", () => {
  it("evicts oldest entries when maxEntries is exceeded", () => {
    const store = new MemoryStore({ maxEntries: 2 });
    store.add("user", "first");
    store.add("assistant", "second");
    store.add("user", "third");
    expect(store.size).toBe(2);
    const entries = store.getEntries();
    expect(entries[0]!.content).toBe("second");
    expect(entries[1]!.content).toBe("third");
  });

  it("stores all entries when maxEntries is not set", () => {
    const store = new MemoryStore();
    for (let i = 0; i < 10; i++) {
      store.add("user", `msg ${i}`);
    }
    expect(store.size).toBe(10);
  });
});

describe("MemoryStore — addMessage() / clear()", () => {
  it("addMessage() delegates to add() correctly", () => {
    const store = new MemoryStore();
    store.addMessage({ role: "user", content: "via addMessage" });
    expect(store.size).toBe(1);
    expect(store.getEntries()[0]!.content).toBe("via addMessage");
  });

  it("addMessage() passes metadata through", () => {
    const store = new MemoryStore();
    store.addMessage({ role: "assistant", content: "reply" }, { turn: 1 });
    expect(store.getEntries()[0]!.metadata).toEqual({ turn: 1 });
  });

  it("clear() empties the store", () => {
    const store = new MemoryStore();
    store.add("user", "a");
    store.add("assistant", "b");
    store.clear();
    expect(store.size).toBe(0);
    expect(store.getMessages()).toEqual([]);
  });
});

describe("MemoryStore — getMessages()", () => {
  it("returns Message[] without metadata or timestamp", () => {
    const store = new MemoryStore();
    store.add("user", "question", { extra: true });
    store.add("assistant", "answer");
    const msgs = store.getMessages();
    expect(msgs).toEqual([
      { role: "user", content: "question" },
      { role: "assistant", content: "answer" },
    ]);
  });

  it("prepends systemPrompt when configured", () => {
    const store = new MemoryStore({ systemPrompt: "You are a bot" });
    store.add("user", "hello");
    const msgs = store.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toEqual({ role: "system", content: "You are a bot" });
    expect(msgs[1]).toEqual({ role: "user", content: "hello" });
  });

  it("returns only the system message when store is otherwise empty", () => {
    const store = new MemoryStore({ systemPrompt: "Sys" });
    const msgs = store.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.role).toBe("system");
  });
});

describe("MemoryStore — toJSON() / fromJSON()", () => {
  it("toJSON() returns a copy equal in content to getEntries()", () => {
    const store = new MemoryStore();
    store.add("user", "a");
    store.add("assistant", "b");
    const snap = store.toJSON();
    expect(snap).toHaveLength(2);
    expect(snap[0]!.content).toBe("a");
    expect(snap[1]!.content).toBe("b");
  });

  it("toJSON() returns an independent copy — mutating it does not affect the store", () => {
    const store = new MemoryStore();
    store.add("user", "original");
    const snap = store.toJSON();
    (snap[0] as MemoryEntry).content = "mutated";
    expect(store.getEntries()[0]!.content).toBe("original");
  });

  it("fromJSON() restores entries faithfully", () => {
    const entries: MemoryEntry[] = [
      { role: "user", content: "hi", timestamp: 1000 },
      { role: "assistant", content: "hello", timestamp: 2000 },
    ];
    const store = MemoryStore.fromJSON(entries);
    expect(store.size).toBe(2);
    expect(store.getEntries()[0]!.content).toBe("hi");
    expect(store.getEntries()[1]!.timestamp).toBe(2000);
  });

  it("fromJSON() applies config (systemPrompt) to restored store", () => {
    const entries: MemoryEntry[] = [{ role: "user", content: "hey", timestamp: 1000 }];
    const store = MemoryStore.fromJSON(entries, { systemPrompt: "Restored" });
    const msgs = store.getMessages();
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.content).toBe("Restored");
    expect(msgs[1]!.content).toBe("hey");
  });

  it("fromJSON() does not apply maxEntries window during restore", () => {
    const entries: MemoryEntry[] = Array.from({ length: 5 }, (_, i) => ({
      role: "user" as const,
      content: `msg ${i}`,
      timestamp: i * 1000,
    }));
    const store = MemoryStore.fromJSON(entries, { maxEntries: 3 });
    expect(store.size).toBe(5);
  });
});
