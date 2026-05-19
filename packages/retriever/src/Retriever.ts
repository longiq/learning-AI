import { randomUUID } from "node:crypto";
import { chunk } from "@llm-series/chunker";
import type { Embedder } from "@llm-series/embedder";
import { VectorStoreLite } from "@llm-series/vector-store-lite";
import type { RetrieverConfig, RetrievedChunk } from "./types.js";
import type { ChunkOptions } from "@llm-series/chunker";

const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { size: 512, overlap: 64 };

export class Retriever {
  #embedder: Embedder;
  #store: VectorStoreLite;
  #chunkOptions: ChunkOptions;

  constructor(embedder: Embedder, config?: RetrieverConfig) {
    this.#embedder = embedder;
    this.#store = config?.store ?? new VectorStoreLite();
    this.#chunkOptions = config?.chunkOptions ?? DEFAULT_CHUNK_OPTIONS;
  }

  async addDocument(
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const chunks = chunk(text, this.#chunkOptions);
    if (chunks.length === 0) return;

    const results = await this.#embedder.embedBatch(chunks.map((c) => c.text));

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]!;
      const r = results[i]!;
      this.#store.add({
        id: randomUUID(),
        vector: r.vector,
        metadata: {
          text: c.text,
          chunkIndex: c.index,
          start: c.start,
          end: c.end,
          ...(metadata !== undefined ? { docMetadata: metadata } : {}),
        },
      });
    }
  }

  async retrieve(
    query: string,
    topK: number,
    minScore?: number,
  ): Promise<RetrievedChunk[]> {
    const result = await this.#embedder.embed(query);
    const hits = this.#store.query(result.vector, topK, minScore);

    return hits.map((hit) => {
      const m = hit.entry.metadata ?? {};
      const base: RetrievedChunk = {
        text: m["text"] as string,
        score: hit.score,
        chunkIndex: m["chunkIndex"] as number,
        start: m["start"] as number,
        end: m["end"] as number,
      };
      const docMetadata = m["docMetadata"];
      if (docMetadata !== undefined) {
        return { ...base, metadata: docMetadata as Record<string, unknown> };
      }
      return base;
    });
  }

  get store(): VectorStoreLite {
    return this.#store;
  }
}
