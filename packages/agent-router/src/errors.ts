export class RouterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RouterError";
  }
}

export class NoAgentsError extends RouterError {
  constructor() {
    super("No agents registered — call register() before route()");
    this.name = "NoAgentsError";
  }
}

export class UnknownAgentError extends RouterError {
  constructor(
    public readonly agentName: string,
    available: string[],
  ) {
    super(
      `LLM selected unknown agent "${agentName}". Available: ${available.join(", ")}`,
    );
    this.name = "UnknownAgentError";
  }
}

export class AgentRunError extends RouterError {
  constructor(
    public readonly agentName: string,
    options?: ErrorOptions,
  ) {
    super(`Agent "${agentName}" threw during execution`, options);
    this.name = "AgentRunError";
  }
}
