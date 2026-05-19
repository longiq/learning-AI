# @llm-series/memory-store

Module #6 in the `@llm-series` learning chain. Provides stateful conversation memory that stores `Message` history and returns `Message[]` slices ready for LLM calls.

## Why this module?

`runAgent()` in module 5 is stateless — every call starts from a caller-supplied `Message[]`. Real applications need to persist history across turns and cap context size so it doesn't overflow the model's context window.

`MemoryStore` is the bridge: callers append each turn's messages, then call `getMessages()` to get a ready-to-use `Message[]` for the next LLM call.

## Where it fits

```
llm-client  +  tool-registry
         \       /
       simple-react-agent
              |
         memory-store        ← you are here
              |
       chunker + embedder
```

## Quick API

```typescript
import { MemoryStore } from "@llm-series/memory-store";
import type { MemoryEntry, MemoryStoreConfig } from "@llm-series/memory-store";

const store = new MemoryStore({
  maxEntries: 20,                  // optional: sliding window
  systemPrompt: "You are a bot",   // optional: always prepended
});

// Add messages individually
store.add("user", "What is the capital of France?");
store.add("assistant", "Paris.");

// Or from a Message object
store.addMessage({ role: "user", content: "And Germany?" });

// Pass to LLM
const messages = store.getMessages();
// → [{ role: "system", content: "You are a bot" }, { role: "user", ... }, ...]

// Inspect full entries (with timestamps + metadata)
const entries: readonly MemoryEntry[] = store.getEntries();

// Persist session
const saved = store.toJSON();                         // MemoryEntry[]
const restored = MemoryStore.fromJSON(saved, config); // faithfully restores

// Reset
store.clear();
```

### Types

```typescript
interface MemoryEntry {
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface MemoryStoreConfig {
  maxEntries?: number;    // sliding window — oldest evicted first; undefined = unlimited
  systemPrompt?: string;  // prepended by getMessages(), not stored as an entry
}
```

### Errors

```typescript
import { MemoryError } from "@llm-series/memory-store";
// Base class for downstream modules to wrap memory failures
```

## Commands

```bash
pnpm build      # compile to dist/
pnpm test       # run vitest
pnpm typecheck  # tsc --noEmit
```
