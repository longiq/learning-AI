export interface VectorStoreEntry {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorStoreConfig {
  similarityFn?: (a: number[], b: number[]) => number;
}

export interface SimilarityResult {
  entry: VectorStoreEntry;
  score: number;
}
