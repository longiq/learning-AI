import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ToolExecutionError,
  ToolInputError,
  ToolNotFoundError,
  ToolRegistry,
  ToolRegistryError,
} from "../src/index.js";

const addTool = {
  name: "add",
  description: "adds two numbers",
  schema: z.object({ a: z.number(), b: z.number() }),
  execute: ({ a, b }: { a: number; b: number }) => a + b,
};

const greetTool = {
  name: "greet",
  description: "greets a person",
  schema: z.object({ name: z.string() }),
  execute: ({ name }: { name: string }) => `Hello, ${name}!`,
};

describe("ToolRegistry — register / get / has", () => {
  it("registers a tool and gets it back", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    expect(registry.get("add")).toBe(addTool);
  });

  it("has() returns true for registered tool", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    expect(registry.has("add")).toBe(true);
  });

  it("has() returns false for unknown tool", () => {
    const registry = new ToolRegistry();
    expect(registry.has("unknown")).toBe(false);
  });

  it("get() returns undefined for unknown tool", () => {
    const registry = new ToolRegistry();
    expect(registry.get("unknown")).toBeUndefined();
  });

  it("register() returns this for chaining", () => {
    const registry = new ToolRegistry();
    const result = registry.register(addTool);
    expect(result).toBe(registry);
  });

  it("chaining multiple register() calls works", () => {
    const registry = new ToolRegistry();
    registry.register(addTool).register(greetTool);
    expect(registry.has("add")).toBe(true);
    expect(registry.has("greet")).toBe(true);
  });

  it("throws ToolRegistryError when registering duplicate name", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    expect(() => registry.register(addTool)).toThrowError(ToolRegistryError);
    expect(() => registry.register(addTool)).toThrowError(/already registered/);
  });
});

describe("ToolRegistry — execute", () => {
  it("executes a tool with valid args and returns ToolResult", async () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    const result = await registry.execute("add", JSON.stringify({ a: 2, b: 3 }));
    expect(result.name).toBe("add");
    expect(result.output).toBe(5);
  });

  it("execute with async tool works", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "asyncAdd",
      description: "async add",
      schema: z.object({ a: z.number(), b: z.number() }),
      execute: async ({ a, b }: { a: number; b: number }) => {
        await Promise.resolve();
        return a + b;
      },
    });
    const result = await registry.execute("asyncAdd", JSON.stringify({ a: 10, b: 20 }));
    expect(result.output).toBe(30);
  });

  it("throws ToolNotFoundError for unknown tool", async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute("nonexistent", "{}")).rejects.toThrowError(ToolNotFoundError);
    await expect(registry.execute("nonexistent", "{}")).rejects.toThrowError(/Tool not found/);
  });

  it("throws ToolInputError for invalid JSON", async () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    await expect(registry.execute("add", "not-json")).rejects.toThrowError(ToolInputError);
    await expect(registry.execute("add", "not-json")).rejects.toThrowError(/Invalid input/);
  });

  it("throws ToolInputError when zod validation fails", async () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    // Missing required fields
    await expect(registry.execute("add", JSON.stringify({ a: 1 }))).rejects.toThrowError(ToolInputError);
    // Wrong types
    await expect(
      registry.execute("add", JSON.stringify({ a: "not-a-number", b: 3 }))
    ).rejects.toThrowError(ToolInputError);
  });

  it("throws ToolExecutionError when execute() throws", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "failing",
      description: "always fails",
      schema: z.object({}),
      execute: () => {
        throw new Error("execution failure");
      },
    });
    await expect(registry.execute("failing", "{}")).rejects.toThrowError(ToolExecutionError);
    await expect(registry.execute("failing", "{}")).rejects.toThrowError(/threw during execution/);
  });

  it("ToolExecutionError preserves original error as cause", async () => {
    const originalError = new Error("original failure");
    const registry = new ToolRegistry();
    registry.register({
      name: "causeFailing",
      description: "fails with cause",
      schema: z.object({}),
      execute: () => {
        throw originalError;
      },
    });
    try {
      await registry.execute("causeFailing", "{}");
    } catch (e) {
      expect(e).toBeInstanceOf(ToolExecutionError);
      expect((e as ToolExecutionError).cause).toBe(originalError);
    }
  });

  it("ToolInputError stores toolName and argsJson", async () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    try {
      await registry.execute("add", "bad-json");
    } catch (e) {
      expect(e).toBeInstanceOf(ToolInputError);
      const err = e as ToolInputError;
      expect(err.toolName).toBe("add");
      expect(err.argsJson).toBe("bad-json");
    }
  });

  it("ToolNotFoundError stores toolName", async () => {
    const registry = new ToolRegistry();
    try {
      await registry.execute("missing", "{}");
    } catch (e) {
      expect(e).toBeInstanceOf(ToolNotFoundError);
      expect((e as ToolNotFoundError).toolName).toBe("missing");
    }
  });
});

describe("ToolRegistry — toOpenAITools", () => {
  it("returns empty array when no tools registered", () => {
    const registry = new ToolRegistry();
    expect(registry.toOpenAITools()).toEqual([]);
  });

  it("returns OpenAI format for registered tools", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    const tools = registry.toOpenAITools();
    expect(tools).toHaveLength(1);
    const tool = tools[0]!;
    expect(tool.type).toBe("function");
    expect(tool.function.name).toBe("add");
    expect(tool.function.description).toBe("adds two numbers");
    expect(tool.function.parameters).toBeDefined();
  });

  it("includes all registered tools", () => {
    const registry = new ToolRegistry();
    registry.register(addTool).register(greetTool);
    const tools = registry.toOpenAITools();
    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.function.name);
    expect(names).toContain("add");
    expect(names).toContain("greet");
  });

  it("parameters include properties from schema", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    const tools = registry.toOpenAITools();
    const params = tools[0]!.function.parameters;
    expect(params).toHaveProperty("properties");
    const props = params["properties"] as Record<string, unknown>;
    expect(props).toHaveProperty("a");
    expect(props).toHaveProperty("b");
  });
});

describe("ToolRegistry — toAnthropicTools", () => {
  it("returns empty array when no tools registered", () => {
    const registry = new ToolRegistry();
    expect(registry.toAnthropicTools()).toEqual([]);
  });

  it("returns Anthropic format for registered tools", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    const tools = registry.toAnthropicTools();
    expect(tools).toHaveLength(1);
    const tool = tools[0]!;
    expect(tool.name).toBe("add");
    expect(tool.description).toBe("adds two numbers");
    expect(tool.input_schema.type).toBe("object");
    expect(tool.input_schema.properties).toBeDefined();
  });

  it("input_schema includes required fields", () => {
    const registry = new ToolRegistry();
    registry.register(addTool);
    const tools = registry.toAnthropicTools();
    const schema = tools[0]!.input_schema;
    expect(schema.required).toContain("a");
    expect(schema.required).toContain("b");
  });

  it("input_schema.properties includes schema fields", () => {
    const registry = new ToolRegistry();
    registry.register(greetTool);
    const tools = registry.toAnthropicTools();
    const schema = tools[0]!.input_schema;
    expect(schema.properties).toHaveProperty("name");
  });

  it("includes all registered tools", () => {
    const registry = new ToolRegistry();
    registry.register(addTool).register(greetTool);
    const tools = registry.toAnthropicTools();
    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain("add");
    expect(names).toContain("greet");
  });
});

describe("Error instanceof hierarchy", () => {
  it("ToolNotFoundError instanceof ToolRegistryError", () => {
    const err = new ToolNotFoundError("foo");
    expect(err).toBeInstanceOf(ToolRegistryError);
    expect(err).toBeInstanceOf(ToolNotFoundError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ToolInputError instanceof ToolRegistryError", () => {
    const err = new ToolInputError("foo", "{}");
    expect(err).toBeInstanceOf(ToolRegistryError);
    expect(err).toBeInstanceOf(ToolInputError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ToolExecutionError instanceof ToolRegistryError", () => {
    const err = new ToolExecutionError("foo");
    expect(err).toBeInstanceOf(ToolRegistryError);
    expect(err).toBeInstanceOf(ToolExecutionError);
    expect(err).toBeInstanceOf(Error);
  });

  it("ToolRegistryError instanceof Error", () => {
    const err = new ToolRegistryError("base error");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ToolRegistryError");
  });

  it("errors have correct .name property", () => {
    expect(new ToolNotFoundError("x").name).toBe("ToolNotFoundError");
    expect(new ToolInputError("x", "{}").name).toBe("ToolInputError");
    expect(new ToolExecutionError("x").name).toBe("ToolExecutionError");
  });
});
