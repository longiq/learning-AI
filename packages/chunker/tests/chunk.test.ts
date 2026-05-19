import { describe, it, expect } from "vitest";
import { chunk, ChunkerError } from "../src/index.js";

describe("chunk() — character strategy", () => {
  it("returns empty array for empty string", () => {
    expect(chunk("", { size: 10 })).toEqual([]);
  });

  it("returns single chunk when text fits in one window", () => {
    const result = chunk("hello", { size: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe("hello");
    expect(result[0]!.index).toBe(0);
    expect(result[0]!.start).toBe(0);
    expect(result[0]!.end).toBe(5);
  });

  it("splits text into multiple chunks with no overlap", () => {
    const text = "abcdefghij"; // 10 chars
    const result = chunk(text, { size: 4 });
    expect(result).toHaveLength(3);
    expect(result[0]!.text).toBe("abcd");
    expect(result[1]!.text).toBe("efgh");
    expect(result[2]!.text).toBe("ij");
  });

  it("assigns correct start/end offsets", () => {
    const text = "abcdefghij";
    const result = chunk(text, { size: 4 });
    expect(result[0]!.start).toBe(0);
    expect(result[0]!.end).toBe(4);
    expect(result[1]!.start).toBe(4);
    expect(result[1]!.end).toBe(8);
    expect(result[2]!.start).toBe(8);
    expect(result[2]!.end).toBe(10);
  });

  it("assigns sequential index values", () => {
    const result = chunk("abcdefgh", { size: 3 });
    result.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("applies character overlap correctly", () => {
    const text = "abcdefghij";
    const result = chunk(text, { size: 4, overlap: 2 });
    expect(result[0]!.text).toBe("abcd");
    expect(result[1]!.text).toBe("cdef");
    expect(result[2]!.text).toBe("efgh");
    expect(result[3]!.text).toBe("ghij");
  });

  it("chunk text can be reconstructed from start/end offsets", () => {
    const text = "The quick brown fox jumps";
    const result = chunk(text, { size: 8, overlap: 2 });
    for (const c of result) {
      expect(text.slice(c.start, c.end)).toBe(c.text);
    }
  });

  it("throws ChunkerError when size is 0", () => {
    expect(() => chunk("hello", { size: 0 })).toThrow(ChunkerError);
  });

  it("throws ChunkerError when overlap >= size", () => {
    expect(() => chunk("hello", { size: 4, overlap: 4 })).toThrow(ChunkerError);
  });

  it("throws ChunkerError when overlap is negative", () => {
    expect(() => chunk("hello", { size: 4, overlap: -1 })).toThrow(ChunkerError);
  });

  it("defaults to character strategy when strategy is omitted", () => {
    const result = chunk("abcdef", { size: 3 });
    expect(result[0]!.text).toBe("abc");
    expect(result[1]!.text).toBe("def");
  });
});

describe("chunk() — sentence strategy", () => {
  it("returns empty array for empty string", () => {
    expect(chunk("", { strategy: "sentence", size: 100 })).toEqual([]);
  });

  it("groups sentences into a chunk under the size limit", () => {
    const text = "Hello world. How are you? I am fine.";
    const result = chunk(text, { strategy: "sentence", size: 200 });
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe(text);
    expect(result[0]!.start).toBe(0);
    expect(result[0]!.end).toBe(text.length);
  });

  it("splits into multiple chunks when sentences exceed size", () => {
    const text = "First sentence here. Second sentence here. Third sentence here.";
    const result = chunk(text, { strategy: "sentence", size: 25 });
    expect(result.length).toBeGreaterThan(1);
  });

  it("assigns sequential index values", () => {
    const text = "Sentence one. Sentence two. Sentence three. Sentence four.";
    const result = chunk(text, { strategy: "sentence", size: 20 });
    result.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("chunk text matches slice from original via start/end", () => {
    const text = "One sentence. Another sentence. Yet another one.";
    const result = chunk(text, { strategy: "sentence", size: 20 });
    for (const c of result) {
      expect(text.slice(c.start, c.end)).toBe(c.text);
    }
  });

  it("throws ChunkerError when size is 0", () => {
    expect(() => chunk("Hello.", { strategy: "sentence", size: 0 })).toThrow(ChunkerError);
  });
});
