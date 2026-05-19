export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: "openai" | "anthropic",
    public override readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "LLMError";
  }
}

export class LLMAuthError extends LLMError {
  constructor(message: string, provider: "openai" | "anthropic", cause?: unknown) {
    super(message, provider, cause);
    this.name = "LLMAuthError";
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(
    message: string,
    provider: "openai" | "anthropic",
    public readonly retryAfter?: number,
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.name = "LLMRateLimitError";
  }
}

export class LLMContextLengthError extends LLMError {
  constructor(message: string, provider: "openai" | "anthropic", cause?: unknown) {
    super(message, provider, cause);
    this.name = "LLMContextLengthError";
  }
}

export class LLMProviderError extends LLMError {
  constructor(
    message: string,
    provider: "openai" | "anthropic",
    public readonly statusCode?: number,
    cause?: unknown,
  ) {
    super(message, provider, cause);
    this.name = "LLMProviderError";
  }
}
