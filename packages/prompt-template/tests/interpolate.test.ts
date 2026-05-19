import { describe, it, expect } from "vitest";
import { extractVariables, interpolate } from "../src/interpolate.js";
import { TemplateRenderError } from "../src/types.js";

describe("extractVariables", () => {
  it("returns empty array for string with no variables", () => {
    expect(extractVariables("hello world")).toEqual([]);
  });

  it("extracts a single variable", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
  });

  it("extracts multiple distinct variables in order", () => {
    expect(extractVariables("{{a}} and {{b}} and {{c}}")).toEqual(["a", "b", "c"]);
  });

  it("deduplicates repeated variable names", () => {
    expect(extractVariables("{{x}} plus {{x}}")).toEqual(["x"]);
  });

  it("handles underscore-prefixed names", () => {
    expect(extractVariables("{{_private}}")).toEqual(["_private"]);
  });

  it("handles hyphenated names", () => {
    expect(extractVariables("{{user-name}}")).toEqual(["user-name"]);
  });

  it("does not match {{ spaces inside }}", () => {
    expect(extractVariables("{{ name }}")).toEqual([]);
  });

  it("does not match single-brace {x}", () => {
    expect(extractVariables("{x}")).toEqual([]);
  });

  it("does not match empty braces {{}}", () => {
    expect(extractVariables("{{}}")).toEqual([]);
  });
});

describe("interpolate", () => {
  it("replaces a single variable", () => {
    expect(interpolate("Hello {{name}}", { name: "world" })).toBe("Hello world");
  });

  it("replaces multiple variables", () => {
    expect(interpolate("{{a}} + {{b}}", { a: "1", b: "2" })).toBe("1 + 2");
  });

  it("handles a variable used twice in the same template", () => {
    expect(interpolate("{{x}} and {{x}}", { x: "yes" })).toBe("yes and yes");
  });

  it("throws TemplateRenderError when a variable is missing", () => {
    expect(() => interpolate("Hello {{name}}", {})).toThrow(TemplateRenderError);
  });

  it("throws TemplateRenderError listing ALL missing variables", () => {
    try {
      interpolate("{{a}} {{b}} {{c}}", { a: "1" });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TemplateRenderError);
      expect((e as TemplateRenderError).missingVariables).toEqual(["b", "c"]);
    }
  });

  it("TemplateRenderError.missingVariables is an array of missing names", () => {
    try {
      interpolate("{{foo}}", {});
      expect.fail("should have thrown");
    } catch (e) {
      expect((e as TemplateRenderError).missingVariables).toEqual(["foo"]);
    }
  });

  it("does not mutate the input vars object", () => {
    const vars = { name: "Alice" };
    const original = { ...vars };
    interpolate("Hello {{name}}", vars);
    expect(vars).toEqual(original);
  });

  it("returns original string when template has no variables", () => {
    expect(interpolate("no variables here", {})).toBe("no variables here");
  });

  it("accepts empty string template", () => {
    expect(interpolate("", {})).toBe("");
  });

  it("handles $ in replacement values without mangling", () => {
    expect(interpolate("Price: {{amount}}", { amount: "$5.00" })).toBe("Price: $5.00");
  });

  it("ignores extra variables not present in template", () => {
    expect(interpolate("Hello {{name}}", { name: "Bob", extra: "ignored" })).toBe("Hello Bob");
  });
});
