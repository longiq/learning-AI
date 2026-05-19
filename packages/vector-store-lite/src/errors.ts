export class VectorStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VectorStoreError";
  }
}

export class VectorStoreDimensionError extends VectorStoreError {
  readonly expected: number;
  readonly actual: number;

  constructor(expected: number, actual: number, options?: ErrorOptions) {
    super(
      `Vector dimension mismatch: expected ${expected}, got ${actual}`,
      options,
    );
    this.name = "VectorStoreDimensionError";
    this.expected = expected;
    this.actual = actual;
  }
}
