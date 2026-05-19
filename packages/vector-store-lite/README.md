# `@llm-series/vector-store-lite`

Module #8a — in-memory vector store với cosine similarity search.

## Tại sao cần

Sau khi embed các text chunks thành vectors, cần một nơi để lưu và tìm kiếm chúng theo độ tương đồng ngữ nghĩa. `vector-store-lite` cung cấp Map-based store đơn giản, không cần server hay external deps, phù hợp cho RAG pipeline trong học tập và prototype.

## Vị trí trong chuỗi

```
chunker → embedder → [vector-store-lite] → retriever → agent-router
```

## Kiến trúc

- **`VectorStoreLite`** — stateful class, lưu `Map<string, VectorStoreEntry>`
- Dimension được set khi `add()` đầu tiên, enforce consistency cho các entry tiếp theo
- `query()` tính cosine similarity với toàn bộ store, trả top-K kết quả sorted desc
- `similarityFn` injectable qua config để swap ra metric khác (dot product, euclidean...)
- `toJSON()` / `fromJSON()` cho session persistence

## API nhanh

```typescript
import { VectorStoreLite } from "@llm-series/vector-store-lite";
import type { VectorStoreEntry, SimilarityResult } from "@llm-series/vector-store-lite";

const store = new VectorStoreLite();

// Thêm entries
store.add({ id: "doc-1", vector: [0.1, 0.8, 0.3], metadata: { text: "hello" } });
store.addBatch([
  { id: "doc-2", vector: [0.9, 0.1, 0.2] },
  { id: "doc-3", vector: [0.5, 0.5, 0.5] },
]);

// Query top-3 kết quả tương đồng nhất
const results: SimilarityResult[] = store.query([0.8, 0.2, 0.3], 3);
// results[0].score → cosine similarity (cao nhất)
// results[0].entry → VectorStoreEntry

// Query với threshold
const results = store.query(queryVec, 5, 0.7); // chỉ trả score >= 0.7

// Persistence
const json = store.toJSON();
const restored = VectorStoreLite.fromJSON(json);
```

## Errors

```typescript
import { VectorStoreError, VectorStoreDimensionError } from "@llm-series/vector-store-lite";
// VectorStoreDimensionError thrown khi add() vector có dimension khác với entries đã có
// err.expected → dimension đang được store
// err.actual   → dimension của vector mới
```

## Commands

```bash
pnpm --filter @llm-series/vector-store-lite build
pnpm --filter @llm-series/vector-store-lite test
pnpm --filter @llm-series/vector-store-lite typecheck
```
