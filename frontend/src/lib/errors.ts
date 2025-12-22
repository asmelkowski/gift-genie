import axios, { AxiosError } from 'axios';

/**
 * HTTP status codes for common error responses
 */
export const HTTP_STATUS = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
} as const;

/**
 * Type guard to check if an error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Check if an error is a 403 Forbidden response
 */
export function isForbiddenError(error: unknown): boolean {
  if (isAxiosError(error)) {
    if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
      return true;
    }

    // Check if the backend returned a 400 with a forbidden code
    // (sometimes used in certain API designs, though rare for 403)
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (
      data?.detail &&
      typeof data.detail === 'object' &&
      'code' in data.detail &&
      (data.detail as Record<string, unknown>).code === 'forbidden'
    ) {
      return true;
    }
    if (data?.code === 'forbidden') {
      return true;
    }
  }
  return false;
}

/**
 * Check if an error is a 404 Not Found response
 */
export function isNotFoundError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return error.response?.status === HTTP_STATUS.NOT_FOUND;
  }
  return false;
}

/**
 * Extract a user-friendly error message from an error object
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    // Handle common backend error formats
    if (data?.detail) {
      const detail = data.detail;
      if (typeof detail === 'string') return detail;
      if (typeof detail === 'object') {
        if ('message' in detail && typeof detail.message === 'string') return detail.message;
        if ('detail' in detail && typeof detail.detail === 'string') return detail.detail; // Nested detail
      }
    }

    if (data?.message && typeof data.message === 'string') return data.message;

    // Fallback to status text
    if (error.response?.statusText) {
      return error.response.statusText;
    }

    // Default Axios message
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
