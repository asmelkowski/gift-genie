/**
 * Types of behaviors for handling 403 Forbidden errors at the resource level.
 */
export type PermissionErrorBehavior = 'show-404' | 'show-empty' | 'show-forbidden';

/**
 * Interface for defining endpoint patterns and their associated permission error behavior.
 */
export interface EndpointPattern {
  /** Regular expression to match the URL path */
  pattern: RegExp;
  /** HTTP methods this rule applies to */
  methods: string[];
  /** Behavior to apply when a 403 error occurs */
  behavior: PermissionErrorBehavior;
}

/**
 * Configuration for how 403 Forbidden errors should be handled for different endpoints.
 * This allows us to gracefully handle permission issues by showing a 404 Not Found
 * instead of a 403 Forbidden for single resources, or an empty list for list endpoints.
 */
export const PERMISSION_ERROR_RULES: EndpointPattern[] = [
  // Admin endpoints - Always show forbidden to distinguish from 404s
  {
    pattern: /^\/admin(\/.*)?$/,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    behavior: 'show-forbidden',
  },

  // Top-level groups list - Show empty list for better UX when user has no groups
  // Matches: /groups, /groups/, /groups?page=1
  {
    pattern: /^\/groups\/?(\?.*)?$/,
    methods: ['GET'],
    behavior: 'show-empty',
  },

  // Nested resource lists under a specific group - Show forbidden to indicate permission issue
  // When a user tries to access /groups/{id}/members, they should see Access Denied, not empty list
  // Matches: /groups/123/members, /groups/123/draws, /groups/123/exclusions
  {
    pattern: /^\/groups\/[^/]+\/(members|draws|exclusions)\/?(\?.*)?$/,
    methods: ['GET'],
    behavior: 'show-forbidden',
  },

  // Single resource endpoints - Show 404 instead of 403 to avoid leaking existence
  // Matches: /groups/123, /groups/123/, /groups/123/members/456, etc.
  {
    pattern: /^\/groups\/[^/]+\/?(\?.*)?$/,
    methods: ['GET', 'PATCH', 'DELETE'],
    behavior: 'show-404',
  },
  {
    pattern: /^\/groups\/[^/]+\/(members|draws|exclusions)\/[^/]+\/?(\?.*)?$/,
    methods: ['GET', 'PATCH', 'DELETE'],
    behavior: 'show-404',
  },
];

/**
 * Determines the behavior for a 403 Forbidden error based on the URL and HTTP method.
 *
 * @param url - The request URL (without base URL)
 * @param method - The HTTP method (e.g., 'GET', 'PATCH')
 * @returns The determined PermissionErrorBehavior
 */
export function getPermissionErrorBehavior(url: string, method: string): PermissionErrorBehavior {
  const normalizedMethod = method.toUpperCase();

  for (const rule of PERMISSION_ERROR_RULES) {
    if (rule.methods.includes(normalizedMethod) && rule.pattern.test(url)) {
      return rule.behavior;
    }
  }

  // Default behavior is to show forbidden
  return 'show-forbidden';
}
