import { TemplateRenderError } from "./types.js";
import type { TemplateVariables } from "./types.js";

// Matches {{variableName}} — must start with letter or underscore, allows hyphens
const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_-]*)\}\}/g;

export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  let match: RegExpExecArray | null;
  VARIABLE_PATTERN.lastIndex = 0;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    const name = match[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

export function interpolate(template: string, vars: TemplateVariables): string {
  const needed = extractVariables(template);
  const missing = needed.filter((name) => !(name in vars));

  if (missing.length > 0) {
    throw new TemplateRenderError(missing);
  }

  // Function-form replacement avoids JS special `$` character issues in values
  VARIABLE_PATTERN.lastIndex = 0;
  return template.replace(VARIABLE_PATTERN, (_, name: string) => vars[name]!);
}
