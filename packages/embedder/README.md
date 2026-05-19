# `@llm-series/embedder`

Module #7b — turn text into embedding vectors via OpenAI-compatible API.

## Tại sao cần

Sau khi chunk văn bản, cần chuyển từng chunk thành vector số để có thể so sánh similarity trong vector store. `embedder` wrap OpenAI `/embeddings` endpoint (tương thích Ollama, LM Studio, bất kỳ provider nào dùng cùng API shape).

## Vị trí trong chuỗi

```
chunker → [embedder] → vector-store-lite → retriever → agent-router
```

## Kiến trúc

- **`Embedder`** class — stateful (giữ config/API key)
- `embed(text)` — single text, trả `Promise<EmbeddingResult>`
- `embedBatch(texts)` — nhiều text trong một request, kết quả luôn theo thứ tự input
- `fetch?` trên config → inject mock trong tests, dùng Ollama qua `baseURL`

## API nhanh

```typescript
import { Embedder } from "@llm-series/embedder";
import type { EmbeddingResult } from "@llm-series/embedder";

const embedder = new Embedder({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-3-small",  // default
  // baseURL: "http://localhost:11434/v1",  // Ollama
});

const result = await embedder.embed("Hello world");
// result.vector: number[]
// result.model: string
// result.usage: { promptTokens, totalTokens }

const results = await embedder.embedBatch(["text one", "text two"]);
```

## Error hierarchy

```
EmbedderError (base)
├── EmbedderAuthError        — 401
├── EmbedderRateLimitError   — 429; .retryAfter?: number
└── EmbedderProviderError    — 5xx; .statusCode?: number
```

## Commands

```bash
pnpm --filter @llm-series/embedder build
pnpm --filter @llm-series/embedder test
pnpm --filter @llm-series/embedder typecheck
```
