import { ToolRegistry } from "@llm-series/tool-registry";
import { z } from "zod";
import { evaluate } from "mathjs";

const calculatorTool = {
  name: "calculator",
  description: "Evaluate a math expression. Examples: '2 + 2', '15% of 340', 'sqrt(144)'",
  schema: z.object({ expression: z.string().describe("The math expression to evaluate") }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      const result = evaluate(expression);
      return { result: String(result), expression };
    } catch {
      return { error: "Invalid expression", expression };
    }
  },
};

const weatherStubTool = {
  name: "get_weather",
  description: "Get the current weather for a city (demo stub — returns fake data)",
  schema: z.object({ city: z.string().describe("City name") }),
  execute: async ({ city }: { city: string }) => ({
    city,
    temperature: Math.floor(20 + Math.random() * 15),
    unit: "celsius",
    condition: ["sunny", "cloudy", "rainy", "partly cloudy"][Math.floor(Math.random() * 4)],
    note: "Demo stub — not real weather data",
  }),
};

const wordCountTool = {
  name: "word_count",
  description: "Count words, characters, and sentences in a text",
  schema: z.object({ text: z.string().describe("The text to analyze") }),
  execute: async ({ text }: { text: string }) => ({
    words: text.trim().split(/\s+/).filter(Boolean).length,
    characters: text.length,
    sentences: text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
  }),
};

const dateTool = {
  name: "get_current_date",
  description: "Get the current date and time",
  schema: z.object({}),
  execute: async () => ({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().split(" ")[0],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
  }),
};

export const ALL_TOOLS = [calculatorTool, weatherStubTool, wordCountTool, dateTool];

export const TOOL_META: Record<string, { icon: string; description: string }> = {
  calculator: { icon: "🧮", description: "Arithmetic & math expressions via mathjs" },
  get_weather: { icon: "🌤", description: "City weather (demo stub)" },
  word_count: { icon: "📝", description: "Text statistics" },
  get_current_date: { icon: "📅", description: "Current date & time" },
};

export function buildRegistry(enabledTools: string[]): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of ALL_TOOLS) {
    if (enabledTools.includes(tool.name)) {
      registry.register(tool as Parameters<typeof registry.register>[0]);
    }
  }
  return registry;
}
