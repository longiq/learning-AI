# LLM Series — Project Memory

## Mục tiêu
Build 9 module nhỏ để học modern LLM/agent architecture. Mỗi module là một GitHub repo riêng, mỗi session Claude Code riêng.

## Thứ tự module

| # | Module | Repo | Status |
|---|---|---|---|
| 1 | `llm-client` | `longiq/llm-client` | ✅ Done |
| 2 | `prompt-template` | — | ⏳ |
| 3 | `structured-output` | — | ⏳ |
| 4 | `tool-registry` | — | ⏳ |
| 5 | `simple-react-agent` | — | ⏳ |
| 6 | `memory-store` | — | ⏳ |
| 7 | `chunker` + `embedder` | — | ⏳ |
| 8 | `vector-store-lite` + `retriever` | — | ⏳ |
| 9 | `agent-router` | — | ⏳ |

## Module #1: llm-client — Đã hoàn thành

**Repo:** `longiq/llm-client`  
**PR:** https://github.com/longiq/llm-client/pull/1  
**Package name:** `@llm-series/llm-client`

### Stack
- TypeScript 5.x, ESM only (`"type": "module"`)
- pnpm, tsup (build), vitest (test)
- `tsconfig`: strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`

### Public API (src/index.ts)
```typescript
// Types
export type { Message, MessageRole, CompletionOptions, CompletionResult, LLMClient, OpenAIClientConfig, AnthropicClientConfig }

// Errors
export { LLMError, LLMAuthError, LLMRateLimitError, LLMContextLengthError, LLMProviderError }

// Factory + helper
export { createClient, collectStream }

// Concrete classes (cho instanceof checks)
export { OpenAIClient, AnthropicClient }
```

### Key design decisions
- `stream()` trả `AsyncGenerator<string, CompletionResult, unknown>` — TReturn cho phép lấy usage stats sau stream
- `collectStream(gen)` → `{ text, result }` — helper để downstream không cần biết generator protocol
- `maxRetries: 0` trong SDK constructors — retry logic thuộc về agent layer
- `baseURL` trên cả hai config → Ollama/LM Studio compatible
- `fetch?: typeof globalThis.fetch` trên config → dễ mock trong tests
- Direct deps (không phải peer deps) cho `openai` + `@anthropic-ai/sdk`

### LLMClient interface
```typescript
interface LLMClient {
  complete(options: CompletionOptions): Promise<CompletionResult>;
  stream(options: CompletionOptions): AsyncGenerator<string, CompletionResult, unknown>;
  readonly provider: "openai" | "anthropic";
}
```

### Error hierarchy
```
LLMError (base, có provider field)
├── LLMAuthError          — 401, fail fast
├── LLMRateLimitError     — 429, có retryAfter?: number
├── LLMContextLengthError — prompt too long
└── LLMProviderError      — 5xx, có statusCode?: number
```

## Cách downstream modules link về llm-client

```json
// package.json của module kế tiếp
{
  "dependencies": {
    "@llm-series/llm-client": "file:../llm-client"
  }
}
```

```typescript
import { createClient, collectStream, LLMRateLimitError } from "@llm-series/llm-client";
import type { LLMClient, Message, CompletionOptions, CompletionResult } from "@llm-series/llm-client";
```

## Quy ước chung (áp dụng cho tất cả module)
- Package scope: `@llm-series/<module-name>`
- Build: ESM only, tsup, `dts: true`
- Test: vitest, mock bằng custom fetch injection (không dùng MSW)
- Không add error handling cho scenarios không thể xảy ra
- Không add comments trừ khi WHY là non-obvious
- Mỗi module có `pnpm.onlyBuiltDependencies: ["esbuild"]` trong package.json
