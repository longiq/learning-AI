# `@llm-series/chunker`

Module #7a — split text into overlapping windows for embedding and retrieval.

## Tại sao cần

LLMs có context limit. Trước khi embed tài liệu dài vào vector store, cần cắt thành `Chunk[]` nhỏ. `chunker` cung cấp hai chiến lược: theo ký tự (chính xác, nhanh) và theo câu (ranh giới ngữ nghĩa tự nhiên hơn).

## Vị trí trong chuỗi

```
memory-store → [chunker] → embedder → vector-store-lite → retriever → agent-router
```

## Kiến trúc

- **`chunk(text, options)`** — pure function, không có side effect
- `"character"` strategy: fixed sliding window theo byte offset
- `"sentence"` strategy: gom câu cho đến khi đủ `size` ký tự, sau đó tạo chunk mới
- `overlap` controls how many characters of the previous chunk re-appear at the start of the next one

## API nhanh

```typescript
import { chunk } from "@llm-series/chunker";
import type { Chunk, ChunkOptions } from "@llm-series/chunker";

// Character-based (default)
const chunks = chunk("long text...", { size: 512, overlap: 64 });

// Sentence-based
const chunks = chunk(doc, { strategy: "sentence", size: 1000, overlap: 100 });

// Each Chunk:
// { text: string, index: number, start: number, end: number }
// text.slice(start, end) === text  ← always true
```

## Error

```typescript
import { ChunkerError } from "@llm-series/chunker";
// Thrown when: size <= 0, overlap < 0, overlap >= size
```

## Commands

```bash
pnpm --filter @llm-series/chunker build
pnpm --filter @llm-series/chunker test
pnpm --filter @llm-series/chunker typecheck
```
