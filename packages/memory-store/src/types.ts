import type { MessageRole } from "@llm-series/llm-client";

export interface MemoryEntry {
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryStoreConfig {
  maxEntries?: number;
  systemPrompt?: string;
}
