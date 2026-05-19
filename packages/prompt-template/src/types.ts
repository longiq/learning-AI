export type MessageRole = "system" | "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface FewShotExample {
  user: string;
  assistant: string;
}

export interface PromptTemplateConfig {
  system?: string;
  user: string;
  examples?: FewShotExample[];
}

export type TemplateVariables = Record<string, string>;

export class TemplateRenderError extends Error {
  readonly missingVariables: string[];

  constructor(missingVariables: string[]) {
    const list = missingVariables.map((v) => `"${v}"`).join(", ");
    super(`PromptTemplate.render() is missing variables: ${list}`);
    this.name = "TemplateRenderError";
    this.missingVariables = missingVariables;
  }
}
