import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolExecutionError, ToolInputError, ToolNotFoundError, ToolRegistryError } from "./errors.js";
import type {
  AnthropicToolDefinition,
  OpenAIToolDefinition,
  ToolDefinition,
  ToolResult,
} from "./types.js";

export class ToolRegistry {
  readonly #tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): this {
    if (this.#tools.has(tool.name)) {
      throw new ToolRegistryError(`Tool already registered: "${tool.name}"`);
    }
    this.#tools.set(tool.name, tool);
    return this;
  }

  get(name: string): ToolDefinition | undefined {
    return this.#tools.get(name);
  }

  has(name: string): boolean {
    return this.#tools.has(name);
  }

  async execute(name: string, argsJson: string): Promise<ToolResult> {
    const tool = this.#tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(argsJson);
    } catch (cause) {
      throw new ToolInputError(name, argsJson, { cause });
    }

    const result = tool.schema.safeParse(parsed);
    if (!result.success) {
      throw new ToolInputError(name, argsJson, { cause: result.error });
    }

    let output: unknown;
    try {
      output = await tool.execute(result.data as Record<string, unknown>);
    } catch (cause) {
      throw new ToolExecutionError(name, { cause });
    }

    return { id: "", name, output };
  }

  toOpenAITools(): OpenAIToolDefinition[] {
    return Array.from(this.#tools.values()).map((tool) => {
      const schema = zodToJsonSchema(tool.schema) as Record<string, unknown>;
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: schema,
        },
      };
    });
  }

  toAnthropicTools(): AnthropicToolDefinition[] {
    return Array.from(this.#tools.values()).map((tool) => {
      const schema = zodToJsonSchema(tool.schema) as {
        properties?: Record<string, unknown>;
        required?: string[];
        [key: string]: unknown;
      };
      const anthropicTool: AnthropicToolDefinition = {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: "object",
          properties: schema["properties"] ?? {},
        },
      };
      if (schema["required"] !== undefined) {
        anthropicTool.input_schema.required = schema["required"];
      }
      return anthropicTool;
    });
  }
}
