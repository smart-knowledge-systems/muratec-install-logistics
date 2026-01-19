/**
 * Standard error types and helpers for Convex functions.
 * Provides consistent error messages across the codebase.
 */

/**
 * Error thrown when a requested resource is not found.
 * Provides consistent formatting for "not found" errors.
 */
export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";
  readonly resourceType: string;
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Error thrown when an operation is invalid given the current state.
 */
export class InvalidOperationError extends Error {
  readonly code = "INVALID_OPERATION";

  constructor(message: string) {
    super(message);
    this.name = "InvalidOperationError";
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

/**
 * Helper function to throw NotFoundError consistently.
 * Useful for inline checks.
 */
export function notFound(resourceType: string, resourceId: string): never {
  throw new NotFoundError(resourceType, resourceId);
}
