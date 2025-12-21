import { type Permission } from '@/hooks/useUserPermissions';

/**
 * Represents the parsed components of a permission code.
 * Permission codes follow the format: `resource:action:resource_id` or `resource:action`
 *
 * Examples:
 * - `groups:read:550e8400-e29b-41d4-a716-446655440000` -> { resource: 'groups', action: 'read', resourceId: '550e8400-...' }
 * - `admin:view_dashboard` -> { resource: 'admin', action: 'view_dashboard', resourceId: null }
 */
export interface ParsedPermission {
  resource: string;
  action: string;
  resourceId: string | null;
}

/**
 * Parses a permission code into its component parts.
 *
 * @param code - The permission code to parse (e.g., "groups:read:uuid" or "admin:view_dashboard")
 * @returns An object containing the parsed resource, action, and optional resourceId
 *
 * @example
 * // Resource-scoped permission
 * parsePermissionCode("groups:read:550e8400-e29b-41d4-a716-446655440000")
 * // Returns: { resource: "groups", action: "read", resourceId: "550e8400-..." }
 *
 * @example
 * // Unscoped permission
 * parsePermissionCode("admin:view_dashboard")
 * // Returns: { resource: "admin", action: "view_dashboard", resourceId: null }
 */
export function parsePermissionCode(code: string): ParsedPermission {
  // Handle empty or malformed codes
  if (!code || typeof code !== 'string') {
    return {
      resource: '',
      action: '',
      resourceId: null,
    };
  }

  const parts = code.split(':');

  // Handle malformed codes with less than 2 parts
  if (parts.length < 2) {
    return {
      resource: parts[0] || '',
      action: '',
      resourceId: null,
    };
  }

  // Handle codes with 2 parts (unscoped: resource:action)
  if (parts.length === 2) {
    return {
      resource: parts[0],
      action: parts[1],
      resourceId: null,
    };
  }

  // Handle codes with 3+ parts (resource-scoped: resource:action:resourceId)
  // Join remaining parts in case resourceId itself contains colons (unlikely but defensive)
  return {
    resource: parts[0],
    action: parts[1],
    resourceId: parts.slice(2).join(':'),
  };
}

/**
 * Extracts unique group IDs from an array of permissions.
 *
 * Only extracts resource IDs from permissions with the "groups" resource.
 * Filters out null/undefined resource IDs and deduplicates the results.
 *
 * @param permissions - Array of Permission objects with `code` field
 * @returns Array of unique group ID strings
 *
 * @example
 * // With multiple groups and duplicates
 * const permissions: Permission[] = [
 *   { code: "groups:read:group-1", name: "...", description: "...", category: "...", created_at: "..." },
 *   { code: "groups:write:group-2", name: "...", description: "...", category: "...", created_at: "..." },
 *   { code: "groups:read:group-1", name: "...", description: "...", category: "...", created_at: "..." },
 *   { code: "admin:view_dashboard", name: "...", description: "...", category: "...", created_at: "..." }
 * ]
 * extractGroupIds(permissions)
 * // Returns: ["group-1", "group-2"]
 */
export function extractGroupIds(permissions: Permission[]): string[] {
  // Handle empty or null array
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return [];
  }

  // Use Set to track unique group IDs
  const groupIds = new Set<string>();

  for (const permission of permissions) {
    // Skip if permission or code is missing
    if (!permission || !permission.code) {
      continue;
    }

    const parsed = parsePermissionCode(permission.code);

    // Only extract resource IDs from "groups" resource
    if (parsed.resource === 'groups' && parsed.resourceId) {
      groupIds.add(parsed.resourceId);
    }
  }

  // Return sorted array for consistent ordering
  return Array.from(groupIds).sort();
}
