export class ChunkerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ChunkerError";
  }
}
