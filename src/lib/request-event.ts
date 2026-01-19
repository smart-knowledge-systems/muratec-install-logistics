/**
 * Wide Event Logging (Canonical Log Lines)
 *
 * Instead of scattered console.logs, emit ONE comprehensive event per request
 * with all context. This makes logs queryable and debugging easier.
 *
 * @see https://loggingsucks.com/
 */

export interface RequestEvent {
  // Identity
  requestId: string;
  timestamp: string;

  // Request context
  path: string;
  method: string;
  durationMs?: number;

  // Business context (high cardinality)
  userEmail?: string;
  featureRequestId?: string;
  isRefinement?: boolean;

  // Outcome
  status: "started" | "success" | "error";
  errorType?: string;
  errorMessage?: string;

  // Accumulated context (added throughout lifecycle)
  [key: string]: unknown;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new request event with initial context
 */
export function createRequestEvent(
  init: Partial<RequestEvent> & Pick<RequestEvent, "path" | "method">,
): RequestEvent {
  return {
    requestId: init.requestId ?? generateRequestId(),
    timestamp: new Date().toISOString(),
    status: "started",
    ...init,
  };
}

/**
 * Enrich an event with additional context during request lifecycle
 */
export function enrichEvent(
  event: RequestEvent,
  data: Record<string, unknown>,
): void {
  Object.assign(event, data);
}

/**
 * Emit the event as a single JSON line
 * In production, this could be sent to a logging service
 */
export function emitEvent(event: RequestEvent): void {
  // Single JSON line with all context
  const logLine = JSON.stringify(event);

  if (event.status === "error") {
    console.error(logLine);
  } else {
    console.log(logLine);
  }
}

/**
 * Helper to finalize and emit an event with duration
 */
export function finalizeEvent(
  event: RequestEvent,
  status: "success" | "error",
  startTime: number,
  error?: Error,
): void {
  event.status = status;
  event.durationMs = Date.now() - startTime;

  if (error) {
    event.errorType = error.name;
    event.errorMessage = error.message;
  }

  emitEvent(event);
}
