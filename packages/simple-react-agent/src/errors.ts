export class AgentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AgentError";
  }
}

export class MaxIterationsError extends AgentError {
  constructor(public readonly iterations: number) {
    super(`Agent reached maximum iterations (${iterations}) without a final answer`);
    this.name = "MaxIterationsError";
  }
}
