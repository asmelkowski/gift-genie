/**
 * API error response types for structured error handling
 */

/**
 * Structured error detail from the API
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
}

/**
 * Draw execution error with both code and message
 */
export interface DrawExecutionError {
  code: string;
  message: string;
}

/**
 * Type guard to check if an error detail is structured
 */
export function isStructuredErrorDetail(detail: unknown): detail is ApiErrorDetail {
  if (typeof detail !== 'object' || detail === null) {
    return false;
  }

  const obj = detail as Record<string, unknown>;
  return typeof obj.code === 'string' && typeof obj.message === 'string';
}

/**
 * Type guard to check if an error is a draw execution error
 */
export function isDrawExecutionError(error: unknown): error is DrawExecutionError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const obj = error as Record<string, unknown>;
  return typeof obj.code === 'string' && typeof obj.message === 'string';
}
