import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  parseStructured,
  extractJSON,
  JSONExtractionError,
  JSONParseError,
  SchemaValidationError,
} from "@llm-series/structured-output";
import { getClient } from "@/lib/client-factory";
import { env } from "@/lib/env";
import type { StructuredRequest, StructuredResponse, StructuredStep } from "@/types/api";

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  sentiment: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  extraction: z.object({
    entities: z.array(
      z.object({
        text: z.string(),
        type: z.enum(["PERSON", "PLACE", "ORG", "DATE", "OTHER"]),
      })
    ),
    summary: z.string(),
  }),
  classification: z.object({
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
};

const SYSTEM_PROMPTS: Record<keyof typeof SCHEMAS, string> = {
  sentiment: `Analyze the sentiment of the given text. Respond with ONLY a JSON object:
{"sentiment": "positive"|"negative"|"neutral", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`,
  extraction: `Extract named entities from the text. Respond with ONLY a JSON object:
{"entities": [{"text": "...", "type": "PERSON"|"PLACE"|"ORG"|"DATE"|"OTHER"}], "summary": "one sentence summary"}`,
  classification: `Classify the given text into a category. Respond with ONLY a JSON object:
{"category": "...", "subcategory": "..." (optional), "tags": ["..."], "confidence": 0.0-1.0}`,
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StructuredRequest;
  const { provider, model, prompt, schemaName } = body;

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;
  const schema = SCHEMAS[schemaName] ?? SCHEMAS["sentiment"]!;
  const systemPrompt = SYSTEM_PROMPTS[schemaName] ?? "";

  const steps: StructuredStep[] = [];

  // Step 1: LLM call
  const result = await client.complete({
    model: resolvedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const rawText = result.content;
  steps.push({ label: "LLM raw output", value: rawText, status: "ok" });

  // Step 2: JSON extraction
  let extractedStr: string;
  try {
    extractedStr = extractJSON(rawText);
    steps.push({ label: "Extracted JSON block", value: extractedStr, status: "ok" });
  } catch (err) {
    const message = err instanceof JSONExtractionError ? err.message : String(err);
    steps.push({ label: "JSON extraction", value: message, status: "error" });
    const response: StructuredResponse = {
      rawText,
      extracted: null,
      steps,
      error: { type: "JSONExtractionError", message },
    };
    return NextResponse.json(response, { status: 422 });
  }

  // Step 3: Parse + validate
  try {
    const parsed = parseStructured(rawText, schema);
    steps.push({
      label: "Schema validation",
      value: JSON.stringify(parsed, null, 2),
      status: "ok",
    });
    const response: StructuredResponse = { rawText, extracted: parsed, steps };
    return NextResponse.json(response);
  } catch (err) {
    let errorType = "Unknown";
    let message = String(err);
    if (err instanceof JSONParseError) {
      errorType = "JSONParseError";
      message = err.message;
      steps.push({ label: "JSON.parse failed", value: message, status: "error" });
    } else if (err instanceof SchemaValidationError) {
      errorType = "SchemaValidationError";
      message = err.zodError.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      steps.push({ label: "Zod validation failed", value: message, status: "error" });
    }
    const response: StructuredResponse = {
      rawText,
      extracted: null,
      steps,
      error: { type: errorType, message },
    };
    return NextResponse.json(response, { status: 422 });
  }
}
