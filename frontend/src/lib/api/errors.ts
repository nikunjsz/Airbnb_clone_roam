/**
 * Custom API Error representation.
 * Captures HTTP status code, server detail messages, and optional field-level errors.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;

    // Maintain proper prototype chain for ES5/ES6 extensions
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Type guard to check if an error is an instance of ApiError.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Helper to check if an error represents a 404 Not Found condition.
 */
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}
