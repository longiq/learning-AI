import type { z } from "zod";
import { extractJSON } from "./extract.js";
import { JSONParseError, SchemaValidationError } from "./errors.js";
import type { ParseOptions } from "./types.js";

export function parseStructured<T>(
  text: string,
  schema: z.ZodSchema<T>,
  options?: ParseOptions,
): T {
  const raw = extractJSON(text, options);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new JSONParseError(raw, text, e);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new SchemaValidationError(result.error, text);
  }

  return result.data;
}
