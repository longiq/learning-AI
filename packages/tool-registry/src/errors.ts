export class ToolRegistryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ToolRegistryError";
  }
}

export class ToolNotFoundError extends ToolRegistryError {
  constructor(public readonly toolName: string) {
    super(`Tool not found: "${toolName}"`);
    this.name = "ToolNotFoundError";
  }
}

export class ToolInputError extends ToolRegistryError {
  constructor(
    public readonly toolName: string,
    public readonly argsJson: string,
    options?: ErrorOptions,
  ) {
    super(`Invalid input for tool "${toolName}"`, options);
    this.name = "ToolInputError";
  }
}

export class ToolExecutionError extends ToolRegistryError {
  constructor(
    public readonly toolName: string,
    options?: ErrorOptions,
  ) {
    super(`Tool "${toolName}" threw during execution`, options);
    this.name = "ToolExecutionError";
  }
}
