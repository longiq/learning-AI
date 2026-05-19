import { JSONExtractionError } from "./errors.js";
import type { ParseOptions } from "./types.js";

const FENCE_PATTERN = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/g;

function findBalanced(text: string, open: string, close: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === open) {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === close) {
      depth--;
      if (depth === 0 && start !== -1) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results;
}

export function extractJSON(text: string, options?: ParseOptions): string {
  const preferLast = options?.preferLast === true;

  // 1. Markdown code block — highest priority
  const fenceMatches: string[] = [];
  let match: RegExpExecArray | null;
  FENCE_PATTERN.lastIndex = 0;
  while ((match = FENCE_PATTERN.exec(text)) !== null) {
    const captured = match[1];
    if (captured !== undefined) fenceMatches.push(captured.trim());
  }
  if (fenceMatches.length > 0) {
    return preferLast ? fenceMatches[fenceMatches.length - 1]! : fenceMatches[0]!;
  }

  // 2. Balanced JSON object {...}
  const objects = findBalanced(text, "{", "}");
  if (objects.length > 0) {
    return preferLast ? objects[objects.length - 1]! : objects[0]!;
  }

  // 3. Balanced JSON array [...]
  const arrays = findBalanced(text, "[", "]");
  if (arrays.length > 0) {
    return preferLast ? arrays[arrays.length - 1]! : arrays[0]!;
  }

  throw new JSONExtractionError(text);
}
