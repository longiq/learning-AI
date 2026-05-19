import { describe, it, expect } from "vitest";
import { extractJSON } from "../src/extract.js";
import { JSONExtractionError } from "../src/errors.js";

describe("extractJSON — markdown fence", () => {
  it("extracts JSON from ```json fence", () => {
    const text = "Here is the result:\n```json\n{\"a\":1}\n```";
    expect(extractJSON(text)).toBe('{"a":1}');
  });

  it("extracts JSON from ``` fence without lang tag", () => {
    const text = "Result:\n```\n{\"b\":2}\n```";
    expect(extractJSON(text)).toBe('{"b":2}');
  });

  it("trims whitespace inside fence", () => {
    const text = "```json\n  { \"x\": true }  \n```";
    expect(extractJSON(text)).toBe('{ "x": true }');
  });

  it("prefers fence over inline JSON", () => {
    const text = '{"inline":true}\n```json\n{"fenced":true}\n```';
    expect(extractJSON(text)).toBe('{"fenced":true}');
  });
});

describe("extractJSON — inline JSON object", () => {
  it("extracts plain JSON object", () => {
    expect(extractJSON('{"a":1}')).toBe('{"a":1}');
  });

  it("extracts JSON object embedded in prose", () => {
    const text = 'The answer is {"name":"Alice","age":30} and nothing else.';
    expect(extractJSON(text)).toBe('{"name":"Alice","age":30}');
  });

  it("handles nested objects", () => {
    const text = 'Result: {"outer":{"inner":1}}';
    expect(extractJSON(text)).toBe('{"outer":{"inner":1}}');
  });
});

describe("extractJSON — inline JSON array", () => {
  it("extracts plain JSON array", () => {
    expect(extractJSON("[1,2,3]")).toBe("[1,2,3]");
  });

  it("extracts array embedded in prose", () => {
    const text = "Items: [1,2,3] done.";
    expect(extractJSON(text)).toBe("[1,2,3]");
  });
});

describe("extractJSON — preferLast option", () => {
  it("returns first match by default", () => {
    const text = '```json\n{"first":true}\n```\n```json\n{"last":true}\n```';
    expect(extractJSON(text)).toBe('{"first":true}');
  });

  it("returns last match when preferLast: true", () => {
    const text = '```json\n{"first":true}\n```\n```json\n{"last":true}\n```';
    expect(extractJSON(text, { preferLast: true })).toBe('{"last":true}');
  });

  it("returns last inline object when preferLast: true", () => {
    const text = 'First: {"a":1} then {"b":2}';
    expect(extractJSON(text, { preferLast: true })).toBe('{"b":2}');
  });
});

describe("extractJSON — errors", () => {
  it("throws JSONExtractionError for plain prose", () => {
    expect(() => extractJSON("no json here")).toThrow(JSONExtractionError);
  });

  it("throws JSONExtractionError for empty string", () => {
    expect(() => extractJSON("")).toThrow(JSONExtractionError);
  });

  it("JSONExtractionError.text contains original input", () => {
    const text = "nothing here";
    try {
      extractJSON(text);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(JSONExtractionError);
      expect((e as JSONExtractionError).text).toBe(text);
    }
  });
});
