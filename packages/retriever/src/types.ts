import type { ChunkOptions } from "@llm-series/chunker";
import type { VectorStoreLite } from "@llm-series/vector-store-lite";

export type { ChunkOptions };

export interface RetrieverConfig {
  chunkOptions?: ChunkOptions;
  store?: VectorStoreLite;
}

export interface RetrievedChunk {
  text: string;
  score: number;
  chunkIndex: number;
  start: number;
  end: number;
  metadata?: Record<string, unknown>;
}
