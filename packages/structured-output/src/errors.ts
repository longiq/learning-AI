import type { ZodError } from "zod";

export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly text: string,
    public override readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "StructuredOutputError";
  }
}

export class JSONExtractionError extends StructuredOutputError {
  constructor(text: string) {
    super("No JSON found in LLM output", text);
    this.name = "JSONExtractionError";
  }
}

export class JSONParseError extends StructuredOutputError {
  constructor(
    public readonly raw: string,
    text: string,
    cause?: unknown,
  ) {
    super("Extracted JSON string is not valid JSON", text, cause);
    this.name = "JSONParseError";
  }
}

export class SchemaValidationError extends StructuredOutputError {
  constructor(
    public readonly zodError: ZodError,
    text: string,
  ) {
    super("Parsed JSON does not match the provided schema", text, zodError);
    this.name = "SchemaValidationError";
  }
}
