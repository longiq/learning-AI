export class EmbedderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbedderError";
  }
}

export class EmbedderAuthError extends EmbedderError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbedderAuthError";
  }
}

export class EmbedderRateLimitError extends EmbedderError {
  readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbedderRateLimitError";
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}

export class EmbedderProviderError extends EmbedderError {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbedderProviderError";
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}
