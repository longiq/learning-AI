import { describe, it, expect } from "vitest";
import { Embedder } from "@llm-series/embedder";
import { VectorStoreLite } from "@llm-series/vector-store-lite";
import { Retriever } from "../src/index.js";

function makeVector(dim: number, fill = 0): number[] {
  return Array.from({ length: dim }, (_, i) => (fill === 0 ? i / dim : fill));
}

function makeEmbeddingResponse(
  vectors: number[][],
  model = "text-embedding-3-small",
): object {
  return {
    data: vectors.map((embedding, index) => ({ embedding, index })),
    model,
    usage: { prompt_tokens: vectors.length, total_tokens: vectors.length },
  };
}

function makeFetchQueue(responses: object[]): typeof globalThis.fetch {
  let i = 0;
  return async () => {
    const body = responses[i++] ?? responses[responses.length - 1]!;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function makeEmbedder(responses: object[]): Embedder {
  return new Embedder({
    apiKey: "sk-test",
    fetch: makeFetchQueue(responses),
  });
}

describe("Retriever — addDocument()", () => {
  it("chunks text and adds entries to the store", async () => {
    // 3-word chunks of 5 chars each with no overlap → multiple chunks for long text
    const longText = "A".repeat(600); // 600 chars → 2 chunks at default size 512
    const vectors = [makeVector(4, 0.1), makeVector(4, 0.2)];
    const embedder = makeEmbedder([makeEmbeddingResponse(vectors)]);
    const retriever = new Retriever(embedder);

    await retriever.addDocument(longText);
    expect(retriever.store.size).toBe(2);
  });

  it("does nothing for text that produces no chunks", async () => {
    const embedder = makeEmbedder([]);
    const retriever = new Retriever(embedder);

    await retriever.addDocument("");
    expect(retriever.store.size).toBe(0);
  });

  it("uses custom chunkOptions from config", async () => {
    // size: 5, no overlap → "hello" (5 chars) = 1 chunk
    const text = "hello";
    const vectors = [makeVector(4, 0.5)];
    const embedder = makeEmbedder([makeEmbeddingResponse(vectors)]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 5, overlap: 0 },
    });

    await retriever.addDocument(text);
    expect(retriever.store.size).toBe(1);
  });

  it("preserves user metadata in the store", async () => {
    const text = "hello world";
    const vectors = [makeVector(4, 0.5)];
    const embedder = makeEmbedder([makeEmbeddingResponse(vectors)]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 100, overlap: 0 },
    });

    await retriever.addDocument(text, { source: "doc1", page: 42 });
    expect(retriever.store.size).toBe(1);

    // metadata should be accessible in the store entry
    const entries = retriever.store.toJSON();
    const meta = entries[0]!.metadata!;
    expect((meta["docMetadata"] as Record<string, unknown>)["source"]).toBe("doc1");
    expect((meta["docMetadata"] as Record<string, unknown>)["page"]).toBe(42);
  });
});

describe("Retriever — retrieve()", () => {
  it("returns RetrievedChunk with correct fields", async () => {
    const text = "hello world this is a test document";
    const chunkVec = [1, 0, 0, 0];
    const queryVec = [1, 0, 0, 0]; // identical → score 1.0

    const embedder = makeEmbedder([
      makeEmbeddingResponse([chunkVec]),    // addDocument embedBatch
      makeEmbeddingResponse([queryVec]),    // retrieve embed
    ]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 200, overlap: 0 },
    });

    await retriever.addDocument(text);
    const results = await retriever.retrieve("query", 1);

    expect(results).toHaveLength(1);
    const r = results[0]!;
    expect(r.text).toBe(text);
    expect(r.score).toBeCloseTo(1);
    expect(r.chunkIndex).toBe(0);
    expect(r.start).toBe(0);
    expect(r.end).toBe(text.length);
  });

  it("returns user metadata when provided", async () => {
    const text = "hello world";
    const vec = [1, 0, 0, 0];

    const embedder = makeEmbedder([
      makeEmbeddingResponse([vec]),
      makeEmbeddingResponse([vec]),
    ]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 200, overlap: 0 },
    });

    await retriever.addDocument(text, { source: "wiki" });
    const results = await retriever.retrieve("query", 1);

    expect(results[0]!.metadata).toEqual({ source: "wiki" });
  });

  it("does not include metadata key when none was provided", async () => {
    const text = "hello world";
    const vec = [1, 0, 0, 0];

    const embedder = makeEmbedder([
      makeEmbeddingResponse([vec]),
      makeEmbeddingResponse([vec]),
    ]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 200, overlap: 0 },
    });

    await retriever.addDocument(text); // no metadata
    const results = await retriever.retrieve("query", 1);

    expect(results[0]!.metadata).toBeUndefined();
  });

  it("applies minScore filter", async () => {
    // Store two chunks with known vectors
    const vec1 = [1, 0, 0, 0];  // parallel to query → score 1.0
    const vec2 = [0, 1, 0, 0];  // orthogonal to query → score 0.0
    const queryVec = [1, 0, 0, 0];

    const embedder = makeEmbedder([
      makeEmbeddingResponse([vec1, vec2]),  // addDocument (two chunks)
      makeEmbeddingResponse([queryVec]),    // retrieve
    ]);

    // Use a shared store so we can pre-populate it manually
    const store = new VectorStoreLite();
    const retriever = new Retriever(
      makeEmbedder([
        makeEmbeddingResponse([vec1, vec2]),
        makeEmbeddingResponse([queryVec]),
      ]),
      { chunkOptions: { size: 5, overlap: 0 }, store },
    );

    // Add two separate docs to get two chunks
    const embedder2 = makeEmbedder([
      makeEmbeddingResponse([vec1]),
      makeEmbeddingResponse([vec2]),
      makeEmbeddingResponse([queryVec]),
    ]);
    const retriever2 = new Retriever(embedder2, {
      chunkOptions: { size: 200, overlap: 0 },
      store: new VectorStoreLite(),
    });

    await retriever2.addDocument("doc one");    // → vec1
    await retriever2.addDocument("doc two");    // → vec2
    const results = await retriever2.retrieve("query", 10, 0.5);

    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("doc one");
  });

  it("returns results sorted by score descending", async () => {
    const vec1 = [1, 0, 0, 0];  // score 1.0 with queryVec
    const vec2 = [0, 1, 0, 0];  // score 0.0 with queryVec
    const queryVec = [1, 0, 0, 0];

    const embedder = makeEmbedder([
      makeEmbeddingResponse([vec2]),          // addDocument("low score")
      makeEmbeddingResponse([vec1]),          // addDocument("high score")
      makeEmbeddingResponse([queryVec]),      // retrieve
    ]);
    const retriever = new Retriever(embedder, {
      chunkOptions: { size: 200, overlap: 0 },
    });

    await retriever.addDocument("low score");
    await retriever.addDocument("high score");
    const results = await retriever.retrieve("query", 2);

    expect(results[0]!.text).toBe("high score");
    expect(results[1]!.text).toBe("low score");
  });
});

describe("Retriever — store getter", () => {
  it("returns the VectorStoreLite instance", () => {
    const embedder = new Embedder({ apiKey: "sk-test" });
    const retriever = new Retriever(embedder);
    expect(retriever.store).toBeInstanceOf(VectorStoreLite);
  });

  it("uses the provided store from config", () => {
    const store = new VectorStoreLite();
    const embedder = new Embedder({ apiKey: "sk-test" });
    const retriever = new Retriever(embedder, { store });
    expect(retriever.store).toBe(store);
  });
});
