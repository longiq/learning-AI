import { describe, it, expect } from "vitest";
import {
  VectorStoreLite,
  VectorStoreError,
  VectorStoreDimensionError,
} from "../src/index.js";
import { cosineSimilarity } from "../src/similarity.js";

// --- cosineSimilarity ---

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for anti-parallel vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 when a vector is zero", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [0, 0])).toBe(0);
  });
});

// --- VectorStoreLite ---

describe("VectorStoreLite", () => {
  describe("add()", () => {
    it("stores entry and increments size", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      expect(store.size).toBe(1);
    });

    it("overwrites existing entry with same id", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      store.add({ id: "a", vector: [0, 1] });
      expect(store.size).toBe(1);
    });

    it("throws VectorStoreDimensionError on dimension mismatch", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0, 0] });
      expect(() => store.add({ id: "b", vector: [1, 0] })).toThrow(
        VectorStoreDimensionError,
      );
    });

    it("VectorStoreDimensionError has correct expected and actual fields", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0, 0] });
      try {
        store.add({ id: "b", vector: [1, 0] });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(VectorStoreDimensionError);
        const e = err as VectorStoreDimensionError;
        expect(e.expected).toBe(3);
        expect(e.actual).toBe(2);
      }
    });

    it("VectorStoreDimensionError is instance of VectorStoreError", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      expect(() => store.add({ id: "b", vector: [1, 0, 0] })).toThrow(
        VectorStoreError,
      );
    });
  });

  describe("addBatch()", () => {
    it("adds all entries", () => {
      const store = new VectorStoreLite();
      store.addBatch([
        { id: "a", vector: [1, 0] },
        { id: "b", vector: [0, 1] },
      ]);
      expect(store.size).toBe(2);
    });

    it("partial commit — entries before mismatch are stored, error thrown", () => {
      const store = new VectorStoreLite();
      expect(() =>
        store.addBatch([
          { id: "a", vector: [1, 0] },
          { id: "b", vector: [0, 1] },
          { id: "c", vector: [1, 0, 0] }, // wrong dim
        ]),
      ).toThrow(VectorStoreDimensionError);
      expect(store.size).toBe(2);
    });
  });

  describe("query()", () => {
    it("returns empty array when store is empty", () => {
      const store = new VectorStoreLite();
      expect(store.query([1, 0], 5)).toEqual([]);
    });

    it("returns results sorted by score descending", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });  // score 1.0 with [1,0]
      store.add({ id: "b", vector: [0, 1] });  // score 0.0 with [1,0]
      store.add({ id: "c", vector: [-1, 0] }); // score -1.0 with [1,0]

      const results = store.query([1, 0], 3);
      expect(results).toHaveLength(3);
      expect(results[0]!.entry.id).toBe("a");
      expect(results[1]!.entry.id).toBe("b");
      expect(results[2]!.entry.id).toBe("c");
      expect(results[0]!.score).toBeCloseTo(1);
      expect(results[1]!.score).toBeCloseTo(0);
      expect(results[2]!.score).toBeCloseTo(-1);
    });

    it("limits results to topK", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      store.add({ id: "b", vector: [0, 1] });
      store.add({ id: "c", vector: [-1, 0] });

      expect(store.query([1, 0], 2)).toHaveLength(2);
    });

    it("filters by minScore", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });  // score 1.0
      store.add({ id: "b", vector: [0, 1] });  // score 0.0
      store.add({ id: "c", vector: [-1, 0] }); // score -1.0

      const results = store.query([1, 0], 10, 0.5);
      expect(results).toHaveLength(1);
      expect(results[0]!.entry.id).toBe("a");
    });

    it("uses custom similarityFn from config", () => {
      const store = new VectorStoreLite({ similarityFn: () => 42 });
      store.add({ id: "a", vector: [1, 0] });
      store.add({ id: "b", vector: [0, 1] });

      const results = store.query([1, 0], 5);
      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.score).toBe(42);
      }
    });
  });

  describe("delete()", () => {
    it("returns true and removes existing entry", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      expect(store.delete("a")).toBe(true);
      expect(store.size).toBe(0);
    });

    it("returns false for non-existent id", () => {
      const store = new VectorStoreLite();
      expect(store.delete("nope")).toBe(false);
    });
  });

  describe("clear()", () => {
    it("removes all entries", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      store.add({ id: "b", vector: [0, 1] });
      store.clear();
      expect(store.size).toBe(0);
    });

    it("resets dimension — can add different dim after clear", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0] });
      store.clear();
      expect(() => store.add({ id: "b", vector: [1, 0, 0] })).not.toThrow();
    });
  });

  describe("toJSON() / fromJSON()", () => {
    it("roundtrips entries", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0], metadata: { tag: "hello" } });
      store.add({ id: "b", vector: [0, 1] });

      const restored = VectorStoreLite.fromJSON(store.toJSON());
      expect(restored.size).toBe(2);

      const results = restored.query([1, 0], 2);
      expect(results[0]!.entry.id).toBe("a");
    });

    it("toJSON returns independent copy — mutation does not affect store", () => {
      const store = new VectorStoreLite();
      store.add({ id: "a", vector: [1, 0], metadata: { x: 1 } });

      const snap = store.toJSON();
      (snap[0] as { id: string; vector: number[]; metadata?: Record<string, unknown> }).id = "mutated";

      expect(store.query([1, 0], 1)[0]!.entry.id).toBe("a");
    });

    it("fromJSON with empty entries creates empty store", () => {
      const store = VectorStoreLite.fromJSON([]);
      expect(store.size).toBe(0);
    });

    it("fromJSON preserves custom similarityFn", () => {
      const fn = () => 99;
      const store = VectorStoreLite.fromJSON(
        [{ id: "a", vector: [1, 0] }],
        { similarityFn: fn },
      );
      expect(store.query([1, 0], 1)[0]!.score).toBe(99);
    });
  });
});
