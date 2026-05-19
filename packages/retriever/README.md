# `@llm-series/retriever`

Module #8b — RAG retriever kết hợp chunker, embedder, và vector-store-lite.

## Tại sao cần

Để trả lời câu hỏi dựa trên tài liệu, agent cần tìm các đoạn văn bản liên quan nhất với câu hỏi. `retriever` tự động hóa toàn bộ pipeline: nhận tài liệu thô → chunk → embed → store; nhận query → embed → tìm top-K đoạn tương đồng nhất.

## Vị trí trong chuỗi

```
chunker + embedder + vector-store-lite → [retriever] → agent-router
```

## Kiến trúc

- **`addDocument(text, metadata?)`** — chunk text → `embedBatch()` (một API call) → lưu vào store
- **`retrieve(query, topK, minScore?)`** — embed query → tìm top-K trong store → trả `RetrievedChunk[]`
- Metadata của tài liệu được lưu dưới `docMetadata` key trong VectorStoreEntry, tránh collision với structural fields (`text`, `chunkIndex`, `start`, `end`)
- `store` getter cho phép inspect hoặc persist store ra ngoài

## API nhanh

```typescript
import { Retriever } from "@llm-series/retriever";
import { Embedder } from "@llm-series/embedder";
import type { RetrievedChunk } from "@llm-series/retriever";

const embedder = new Embedder({ apiKey: process.env.OPENAI_API_KEY! });
const retriever = new Retriever(embedder, {
  chunkOptions: { size: 512, overlap: 64 }, // default
});

// Thêm tài liệu
await retriever.addDocument(longText, { source: "wiki/TypeScript" });
await retriever.addDocument(anotherDoc);

// Tìm kiếm
const chunks: RetrievedChunk[] = await retriever.retrieve("what is TypeScript?", 3);
// chunks[0].text       → đoạn văn bản liên quan nhất
// chunks[0].score      → cosine similarity
// chunks[0].chunkIndex → index trong tài liệu gốc
// chunks[0].start/end  → byte offsets
// chunks[0].metadata   → user-supplied doc metadata (nếu có)

// Persist store
import { VectorStoreLite } from "@llm-series/vector-store-lite";
const json = retriever.store.toJSON();
const restored = VectorStoreLite.fromJSON(json);
const newRetriever = new Retriever(embedder, { store: restored });
```

## Commands

```bash
pnpm --filter @llm-series/retriever build
pnpm --filter @llm-series/retriever test
pnpm --filter @llm-series/retriever typecheck
```
