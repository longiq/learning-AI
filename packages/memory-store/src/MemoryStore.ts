import type { Message, MessageRole } from "@llm-series/llm-client";
import type { MemoryEntry, MemoryStoreConfig } from "./types.js";

export class MemoryStore {
  readonly #entries: MemoryEntry[] = [];
  readonly #config: Readonly<MemoryStoreConfig>;

  constructor(config: MemoryStoreConfig = {}) {
    this.#config = config;
  }

  add(role: MessageRole, content: string, metadata?: Record<string, unknown>): void {
    const entry: MemoryEntry = {
      role,
      content,
      timestamp: Date.now(),
      ...(metadata !== undefined && { metadata }),
    };
    this.#entries.push(entry);
    if (this.#config.maxEntries !== undefined && this.#entries.length > this.#config.maxEntries) {
      this.#entries.splice(0, this.#entries.length - this.#config.maxEntries);
    }
  }

  addMessage(message: Message, metadata?: Record<string, unknown>): void {
    this.add(message.role, message.content, metadata);
  }

  getMessages(): Message[] {
    const messages: Message[] = [];
    if (this.#config.systemPrompt !== undefined) {
      messages.push({ role: "system", content: this.#config.systemPrompt });
    }
    for (const entry of this.#entries) {
      messages.push({ role: entry.role, content: entry.content });
    }
    return messages;
  }

  getEntries(): readonly MemoryEntry[] {
    return this.#entries;
  }

  clear(): void {
    this.#entries.splice(0, this.#entries.length);
  }

  get size(): number {
    return this.#entries.length;
  }

  toJSON(): MemoryEntry[] {
    return this.#entries.map((e) => ({ ...e }));
  }

  static fromJSON(entries: MemoryEntry[], config: MemoryStoreConfig = {}): MemoryStore {
    const store = new MemoryStore(config);
    for (const entry of entries) {
      store.#entries.push({ ...entry });
    }
    return store;
  }
}
