import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseStructured } from "../src/parseStructured.js";
import {
  StructuredOutputError,
  JSONExtractionError,
  JSONParseError,
  SchemaValidationError,
} from "../src/errors.js";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

describe("parseStructured — happy path", () => {
  it("parses plain JSON object matching schema", () => {
    const result = parseStructured('{"name":"Alice","age":30}', PersonSchema);
    expect(result).toEqual({ name: "Alice", age: 30 });
  });

  it("parses JSON wrapped in prose", () => {
    const text = 'Here is the person: {"name":"Bob","age":25} from the LLM.';
    const result = parseStructured(text, PersonSchema);
    expect(result).toEqual({ name: "Bob", age: 25 });
  });

  it("parses JSON in markdown fence", () => {
    const text = '```json\n{"name":"Carol","age":40}\n```';
    const result = parseStructured(text, PersonSchema);
    expect(result).toEqual({ name: "Carol", age: 40 });
  });

  it("works with z.array() schema", () => {
    const schema = z.array(z.string());
    const result = parseStructured('["a","b","c"]', schema);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("works with nested schema", () => {
    const schema = z.object({ user: z.object({ id: z.number() }) });
    const result = parseStructured('{"user":{"id":1}}', schema);
    expect(result).toEqual({ user: { id: 1 } });
  });

  it("strips extra fields via schema (passthrough not used)", () => {
    const result = parseStructured('{"name":"Dave","age":20,"extra":"ignored"}', PersonSchema);
    expect(result).toEqual({ name: "Dave", age: 20 });
    expect((result as Record<string, unknown>)["extra"]).toBeUndefined();
  });

  it("passes ParseOptions through to extractJSON", () => {
    const text = '{"name":"First","age":1}\n{"name":"Last","age":2}';
    const result = parseStructured(text, PersonSchema, { preferLast: true });
    expect(result).toEqual({ name: "Last", age: 2 });
  });
});

describe("parseStructured — JSONExtractionError", () => {
  it("throws JSONExtractionError when no JSON in text", () => {
    expect(() => parseStructured("no json here", PersonSchema)).toThrow(JSONExtractionError);
  });

  it("JSONExtractionError is instanceof StructuredOutputError", () => {
    try {
      parseStructured("no json here", PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StructuredOutputError);
      expect(e).toBeInstanceOf(JSONExtractionError);
    }
  });
});

describe("parseStructured — JSONParseError", () => {
  it("throws JSONParseError for invalid JSON syntax inside a fence", () => {
    const text = "```json\n{invalid json}\n```";
    expect(() => parseStructured(text, PersonSchema)).toThrow(JSONParseError);
  });

  it("JSONParseError.raw contains the extracted string", () => {
    const text = "```json\n{bad:json}\n```";
    try {
      parseStructured(text, PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(JSONParseError);
      expect((e as JSONParseError).raw).toBe("{bad:json}");
    }
  });

  it("JSONParseError is instanceof StructuredOutputError", () => {
    const text = "```\n{bad}\n```";
    try {
      parseStructured(text, PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StructuredOutputError);
    }
  });
});

describe("parseStructured — SchemaValidationError", () => {
  it("throws SchemaValidationError when JSON doesn't match schema", () => {
    expect(() => parseStructured('{"name":123,"age":"wrong"}', PersonSchema)).toThrow(
      SchemaValidationError,
    );
  });

  it("SchemaValidationError.zodError is a ZodError", () => {
    try {
      parseStructured('{"name":123}', PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaValidationError);
      expect((e as SchemaValidationError).zodError).toBeDefined();
      expect((e as SchemaValidationError).zodError.issues.length).toBeGreaterThan(0);
    }
  });

  it("SchemaValidationError.text contains original input", () => {
    const text = '{"name":999,"age":"bad"}';
    try {
      parseStructured(text, PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SchemaValidationError);
      expect((e as SchemaValidationError).text).toBe(text);
    }
  });

  it("SchemaValidationError is instanceof StructuredOutputError", () => {
    try {
      parseStructured("{}", PersonSchema);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StructuredOutputError);
    }
  });
});
