import { cosineSimilarity } from "./similarity.js";
import { VectorStoreDimensionError } from "./errors.js";
import type { VectorStoreEntry, VectorStoreConfig, SimilarityResult } from "./types.js";

export class VectorStoreLite {
  #entries: Map<string, VectorStoreEntry>;
  #dim: number | undefined;
  #similarityFn: (a: number[], b: number[]) => number;

  constructor(config?: VectorStoreConfig) {
    this.#entries = new Map();
    this.#dim = undefined;
    this.#similarityFn = config?.similarityFn ?? cosineSimilarity;
  }

  add(entry: VectorStoreEntry): void {
    if (this.#dim === undefined) {
      this.#dim = entry.vector.length;
    } else if (entry.vector.length !== this.#dim) {
      throw new VectorStoreDimensionError(this.#dim, entry.vector.length);
    }
    this.#entries.set(entry.id, entry);
  }

  addBatch(entries: VectorStoreEntry[]): void {
    for (const entry of entries) {
      this.add(entry);
    }
  }

  query(vector: number[], topK: number, minScore?: number): SimilarityResult[] {
    const results: SimilarityResult[] = [];

    for (const entry of this.#entries.values()) {
      const score = this.#similarityFn(vector, entry.vector);
      if (minScore !== undefined && score < minScore) continue;
      results.push({ entry, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  delete(id: string): boolean {
    return this.#entries.delete(id);
  }

  clear(): void {
    this.#entries.clear();
    this.#dim = undefined;
  }

  get size(): number {
    return this.#entries.size;
  }

  toJSON(): VectorStoreEntry[] {
    return Array.from(this.#entries.values()).map((e) => ({ ...e }));
  }

  static fromJSON(
    entries: VectorStoreEntry[],
    config?: VectorStoreConfig,
  ): VectorStoreLite {
    const store = new VectorStoreLite(config);
    for (const e of entries) {
      store.#entries.set(e.id, { ...e });
    }
    const first = entries[0];
    if (first !== undefined) {
      store.#dim = first.vector.length;
    }
    return store;
  }
}
