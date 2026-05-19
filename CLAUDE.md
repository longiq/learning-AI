# Learning AI — Project Memory

## Mục tiêu
Build 9 module nhỏ để học modern LLM/agent architecture. Tất cả module nằm trong monorepo này.

## Cấu trúc monorepo

```
learning-AI/
├── packages/
│   ├── llm-client/       ✅ Module #1
│   ├── prompt-template/  ✅ Module #2
│   └── ...               (các module tiếp theo)
├── package.json          (workspace root, private)
├── pnpm-workspace.yaml
└── CLAUDE.md
```

## Thứ tự module

| # | Module | Package | Status |
|---|---|---|---|
| 1 | `llm-client` | `@llm-series/llm-client` | ✅ Done |
| 2 | `prompt-template` | `@llm-series/prompt-template` | ✅ Done |
| 3 | `structured-output` | `@llm-series/structured-output` | ✅ Done |
| 4 | `tool-registry` | `@llm-series/tool-registry` | ✅ Done |
| 5 | `simple-react-agent` | `@llm-series/simple-react-agent` | ✅ Done |
| 6 | `memory-store` | `@llm-series/memory-store` | ✅ Done |
| 7 | `chunker` + `embedder` | `@llm-series/chunker`, `@llm-series/embedder` | ⏳ |
| 8 | `vector-store-lite` + `retriever` | — | ⏳ |
| 9 | `agent-router` | `@llm-series/agent-router` | ⏳ |

## Module #1: llm-client

**Package:** `@llm-series/llm-client` — `packages/llm-client/`

### Public API
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

## Module #2: prompt-template

**Package:** `@llm-series/prompt-template` — `packages/prompt-template/`

### Public API
```typescript
export type { Message, MessageRole, PromptTemplateConfig, TemplateVariables, FewShotExample }
export { TemplateRenderError }
export { PromptTemplate }
export { interpolate, extractVariables }
```

### Key design decisions
- `{{variableName}}` syntax — regex `[a-zA-Z_][a-zA-Z0-9_-]*`
- `render(vars)` → `Message[]` — output dùng trực tiếp trong `CompletionOptions.messages`
- `TemplateRenderError` thrown với `missingVariables[]` khi thiếu variable
- `withExamples()` → immutable builder pattern cho few-shot
- Biến thừa trong vars bị bỏ qua silently

### render() output order
1. `system` message (nếu có)
2. Các cặp user/assistant few-shot examples (không interpolate)
3. `user` message cuối (có interpolation)

## Module #3: structured-output

**Package:** `@llm-series/structured-output` — `packages/structured-output/`

### Public API
```typescript
export type { ParseOptions }
export { StructuredOutputError, JSONExtractionError, JSONParseError, SchemaValidationError }
export { extractJSON }
export { parseStructured }
```

### Key design decisions
- `extractJSON(text, options?)` — ưu tiên markdown fence → inline `{}` → inline `[]`; option `preferLast` để lấy match cuối
- `parseStructured<T>(text, schema, options?)` — pipeline: extract → JSON.parse → Zod safeParse → typed result
- Error hierarchy extend `StructuredOutputError` (base có `.text`): `JSONExtractionError`, `JSONParseError` (có `.raw`), `SchemaValidationError` (có `.zodError`)
- Runtime dep duy nhất: `zod`

## Module #4: tool-registry

**Package:** `@llm-series/tool-registry` — `packages/tool-registry/`

### Public API
```typescript
export type { ToolDefinition, ToolCall, ToolResult, OpenAIToolDefinition, AnthropicToolDefinition }
export { ToolRegistryError, ToolNotFoundError, ToolInputError, ToolExecutionError }
export { ToolRegistry }
```

### Key design decisions
- `register(tool)` → `this` — fluent chaining; throws `ToolRegistryError` on duplicate name
- `execute(name, argsJson)` — pipeline: JSON.parse → Zod safeParse → tool.execute(); each step throws a distinct error type
- `toOpenAITools()` / `toAnthropicTools()` — convert Zod schemas via `zod-to-json-schema`; Anthropic format uses `input_schema.type = "object"` with `properties` and optional `required`
- Internal state: `Map<string, ToolDefinition>` với private field — no external mutation
- `ToolDefinition.execute()` accepts `TInput` generic — typed at definition time; registry calls with `Record<string, unknown>` after Zod validates

### Error hierarchy
```
ToolRegistryError (base)
├── ToolNotFoundError   — tool không tồn tại; có .toolName
├── ToolInputError      — JSON invalid hoặc Zod fail; có .toolName, .argsJson
└── ToolExecutionError  — execute() ném lỗi; có .toolName
```

## Module #5: simple-react-agent

**Package:** `@llm-series/simple-react-agent` — `packages/simple-react-agent/`

### Public API
```typescript
export type { AgentOptions, AgentStep, AgentResult, ToolCall, ToolResult }
export { AgentError, MaxIterationsError }
export { runAgent }
```

### Key design decisions
- `runAgent(options)` → `AgentResult` — stateless function, no class, easy to test
- `registry: ToolRegistry` — imports real type từ `@llm-series/tool-registry`
- `adapters.ts` is internal (not exported) — extracts/builds OpenAI & Anthropic tool call message shapes from raw responses
- `history` typed as `unknown[]` internally — provider tool messages don't conform to `Message[]` but are valid for the SDKs
- Tool execution errors are caught and returned as `ToolResult.error` — LLM sees the error and can reason about it
- `MaxIterationsError` extends `AgentError` — catch either; `.iterations` field tells you the limit hit

## Module #6: memory-store

**Package:** `@llm-series/memory-store` — `packages/memory-store/`

### Public API
```typescript
export type { MemoryEntry, MemoryStoreConfig }
export { MemoryError }
export { MemoryStore }
```

### Key design decisions
- `MemoryStore` là class (stateful) — khác với `runAgent` stateless ở module 5
- `#entries` dùng ES private field — không thể mutate từ ngoài
- `add(role, content, metadata?)` dùng spread-with-condition `...(metadata !== undefined && { metadata })` — bắt buộc bởi `exactOptionalPropertyTypes`
- `maxEntries` → sliding window: `splice(0, length - maxEntries)` loại bỏ entry cũ nhất
- `systemPrompt` không lưu vào `#entries` — chỉ thêm khi `getMessages()` được gọi, giữ lịch sử sạch
- `getMessages()` dùng `for...of` — tránh index access, không bị `noUncheckedIndexedAccess` ảnh hưởng
- `toJSON()` / `static fromJSON()` cho session persistence
- `fromJSON()` bypass `add()` — restore trung thực, không để `maxEntries` làm mất dữ liệu khi deserialization
- Dependency duy nhất: `@llm-series/llm-client` (lấy `Message`, `MessageRole` types)

## Quy ước chung (áp dụng cho tất cả module)
- Package scope: `@llm-series/<module-name>`
- Build: ESM only, tsup, `dts: true`
- Test: vitest, mock bằng custom fetch injection (không dùng MSW)
- tsconfig: strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`
- `pnpm.onlyBuiltDependencies: ["esbuild"]` ở root workspace (không phải trong từng package)
- Không add error handling cho scenarios không thể xảy ra
- Không add comments trừ khi WHY là non-obvious

## Checklist khi hoàn thành một module mới

1. Cập nhật bảng trạng thái trong `CLAUDE.md` → `✅ Done`
2. Thêm section `## Module #N` vào `CLAUDE.md` (public API + key design decisions)
3. Cập nhật bảng trong `README.md` ở root — đổi `⏳` → `✅`, thêm link `[tên](./packages/<module>)`
4. Tạo `packages/<module>/README.md` theo mẫu prompt-template: tại sao cần, kiến trúc, vị trí trong chuỗi, API nhanh, commands

## Cách thêm module mới

```bash
mkdir packages/<module-name>
# Tạo package.json với name "@llm-series/<module-name>"
# Dependency vào module khác trong workspace:
#   "@llm-series/llm-client": "workspace:*"
pnpm install   # từ root, pnpm tự wire up workspace
```
