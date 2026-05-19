import { interpolate, extractVariables } from "./interpolate.js";
import type {
  Message,
  PromptTemplateConfig,
  TemplateVariables,
  FewShotExample,
} from "./types.js";

export class PromptTemplate {
  private readonly config: Readonly<PromptTemplateConfig>;

  readonly variables: ReadonlyArray<string>;

  constructor(config: PromptTemplateConfig) {
    this.config = {
      ...(config.system !== undefined && { system: config.system }),
      user: config.user,
      ...(config.examples !== undefined && { examples: [...config.examples] }),
    };

    const systemVars = config.system ? extractVariables(config.system) : [];
    const userVars = extractVariables(config.user);
    const seen = new Set<string>();
    const allVars: string[] = [];
    for (const v of [...systemVars, ...userVars]) {
      if (!seen.has(v)) {
        seen.add(v);
        allVars.push(v);
      }
    }
    this.variables = Object.freeze(allVars);
  }

  render(vars: TemplateVariables = {}): Message[] {
    const messages: Message[] = [];

    if (this.config.system !== undefined) {
      messages.push({
        role: "system",
        content: interpolate(this.config.system, vars),
      });
    }

    if (this.config.examples) {
      for (const example of this.config.examples) {
        messages.push({ role: "user", content: example.user });
        messages.push({ role: "assistant", content: example.assistant });
      }
    }

    messages.push({
      role: "user",
      content: interpolate(this.config.user, vars),
    });

    return messages;
  }

  withExamples(examples: FewShotExample[]): PromptTemplate {
    return new PromptTemplate({
      ...this.config,
      examples: [...(this.config.examples ?? []), ...examples],
    });
  }
}
