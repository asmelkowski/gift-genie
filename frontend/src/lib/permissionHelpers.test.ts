import { describe, it, expect } from 'vitest';
import { parsePermissionCode, extractGroupIds, type ParsedPermission } from './permissionHelpers';
import { type Permission } from '@/hooks/useUserPermissions';

describe('permissionHelpers', () => {
  describe('parsePermissionCode', () => {
    describe('resource-scoped permissions', () => {
      it('parses a simple resource-scoped permission code', () => {
        const code = 'groups:read:550e8400-e29b-41d4-a716-446655440000';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'groups',
          action: 'read',
          resourceId: '550e8400-e29b-41d4-a716-446655440000',
        });
      });

      it('parses a members:create permission code', () => {
        const code = 'members:create:550e8400-e29b-41d4-a716-446655440000';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'members',
          action: 'create',
          resourceId: '550e8400-e29b-41d4-a716-446655440000',
        });
      });

      it('parses a draws permission code', () => {
        const code = 'draws:execute:123e4567-e89b-12d3-a456-426614174000';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'draws',
          action: 'execute',
          resourceId: '123e4567-e89b-12d3-a456-426614174000',
        });
      });

      it('handles resource IDs with special characters', () => {
        const code = 'exclusions:delete:abc-123-def-456';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'exclusions',
          action: 'delete',
          resourceId: 'abc-123-def-456',
        });
      });

      it('handles resource IDs with underscores and numbers', () => {
        const code = 'groups:write:group_123_xyz';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'groups',
          action: 'write',
          resourceId: 'group_123_xyz',
        });
      });
    });

    describe('unscoped permissions', () => {
      it('parses an unscoped permission code (2 parts)', () => {
        const code = 'admin:view_dashboard';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'admin',
          action: 'view_dashboard',
          resourceId: null,
        });
      });

      it('parses a system:manage permission', () => {
        const code = 'system:manage';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'system',
          action: 'manage',
          resourceId: null,
        });
      });

      it('parses permissions with underscores in action', () => {
        const code = 'admin:view_all_users';
        const result = parsePermissionCode(code);

        expect(result).toEqual({
          resource: 'admin',
          action: 'view_all_users',
          resourceId: null,
        });
      });
    });

    describe('malformed codes', () => {
      it('handles empty string', () => {
        const result = parsePermissionCode('');

        expect(result).toEqual({
          resource: '',
          action: '',
          resourceId: null,
        });
      });

      it('handles code with only one part', () => {
        const result = parsePermissionCode('groups');

        expect(result).toEqual({
          resource: 'groups',
          action: '',
          resourceId: null,
        });
      });

      it('handles code with only whitespace', () => {
        const result = parsePermissionCode('   ');

        expect(result).toEqual({
          resource: '   ',
          action: '',
          resourceId: null,
        });
      });

      it('handles code with trailing colons', () => {
        const result = parsePermissionCode('groups:read:');

        expect(result).toEqual({
          resource: 'groups',
          action: 'read',
          resourceId: '',
        });
      });

      it('handles code with multiple colons in resource ID', () => {
        const result = parsePermissionCode('groups:read:id:part1:part2');

        expect(result).toEqual({
          resource: 'groups',
          action: 'read',
          resourceId: 'id:part1:part2',
        });
      });

      it('handles non-string input gracefully', () => {
        // @ts-expect-error Testing invalid input
        const result = parsePermissionCode(null);

        expect(result).toEqual({
          resource: '',
          action: '',
          resourceId: null,
        });
      });

      it('handles undefined input gracefully', () => {
        // @ts-expect-error Testing invalid input
        const result = parsePermissionCode(undefined);

        expect(result).toEqual({
          resource: '',
          action: '',
          resourceId: null,
        });
      });
    });

    describe('type correctness', () => {
      it('returns ParsedPermission interface with correct types', () => {
        const result: ParsedPermission = parsePermissionCode('groups:read:uuid-123');

        expect(typeof result.resource).toBe('string');
        expect(typeof result.action).toBe('string');
        expect(result.resourceId === null || typeof result.resourceId === 'string').toBe(true);
      });

      it('returns null for resourceId in unscoped permissions', () => {
        const result = parsePermissionCode('admin:manage');

        expect(result.resourceId).toBeNull();
      });

      it('returns string resourceId for scoped permissions', () => {
        const result = parsePermissionCode('groups:read:id-123');

        expect(typeof result.resourceId).toBe('string');
      });
    });
  });

  describe('extractGroupIds', () => {
    describe('with valid permissions', () => {
      it('extracts single group ID from permissions', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:group-1',
            name: 'Read Group',
            description: 'Read group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual(['group-1']);
      });

      it('extracts multiple group IDs from permissions', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:group-1',
            name: 'Read Group 1',
            description: 'Read group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:write:group-2',
            name: 'Write Group 2',
            description: 'Write group 2',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:admin:group-3',
            name: 'Admin Group 3',
            description: 'Admin group 3',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(3);
        expect(result).toContain('group-1');
        expect(result).toContain('group-2');
        expect(result).toContain('group-3');
      });

      it('deduplicates group IDs', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:group-1',
            name: 'Read Group 1',
            description: 'Read group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:group-1',
            name: 'Read Group 1',
            description: 'Read group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:write:group-1',
            name: 'Write Group 1',
            description: 'Write group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(1);
        expect(result).toEqual(['group-1']);
      });

      it('handles mixed group and non-group permissions', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:group-1',
            name: 'Read Group 1',
            description: 'Read group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'admin:view_dashboard',
            name: 'View Dashboard',
            description: 'View admin dashboard',
            category: 'admin',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:write:group-2',
            name: 'Write Group 2',
            description: 'Write group 2',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'system:manage',
            name: 'Manage System',
            description: 'Manage system',
            category: 'system',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(2);
        expect(result).toContain('group-1');
        expect(result).toContain('group-2');
        expect(result).not.toContain('admin');
        expect(result).not.toContain('system');
      });

      it('filters out non-group permissions correctly', () => {
        const permissions: Permission[] = [
          {
            code: 'members:create:group-1',
            name: 'Create Member',
            description: 'Create member',
            category: 'members',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'draws:execute:group-1',
            name: 'Execute Draw',
            description: 'Execute draw',
            category: 'draws',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'admin:view_dashboard',
            name: 'View Dashboard',
            description: 'View admin dashboard',
            category: 'admin',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(0);
      });

      it('returns sorted group IDs for consistent ordering', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:zebra-group',
            name: 'Read Zebra',
            description: 'Read zebra group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:apple-group',
            name: 'Read Apple',
            description: 'Read apple group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:banana-group',
            name: 'Read Banana',
            description: 'Read banana group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual(['apple-group', 'banana-group', 'zebra-group']);
      });

      it('handles UUID-format resource IDs', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:550e8400-e29b-41d4-a716-446655440000',
            name: 'Read Group',
            description: 'Read group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:write:123e4567-e89b-12d3-a456-426614174000',
            name: 'Write Group',
            description: 'Write group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(2);
        expect(result).toContain('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toContain('123e4567-e89b-12d3-a456-426614174000');
      });
    });

    describe('edge cases', () => {
      it('returns empty array for empty permissions array', () => {
        const result = extractGroupIds([]);

        expect(result).toEqual([]);
      });

      it('returns empty array for null permissions', () => {
        // @ts-expect-error Testing invalid input
        const result = extractGroupIds(null);

        expect(result).toEqual([]);
      });

      it('returns empty array for undefined permissions', () => {
        // @ts-expect-error Testing invalid input
        const result = extractGroupIds(undefined);

        expect(result).toEqual([]);
      });

      it('handles permission with null code', () => {
        const permissions: Permission[] = [
          {
            code: null as unknown as string,
            name: 'Invalid',
            description: 'Invalid permission',
            category: 'test',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:group-1',
            name: 'Valid',
            description: 'Valid permission',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual(['group-1']);
      });

      it('handles permission with empty code', () => {
        const permissions: Permission[] = [
          {
            code: '',
            name: 'Empty Code',
            description: 'Empty code',
            category: 'test',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:group-1',
            name: 'Valid',
            description: 'Valid permission',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual(['group-1']);
      });

      it('handles permissions with only unscoped codes', () => {
        const permissions: Permission[] = [
          {
            code: 'admin:view_dashboard',
            name: 'View Dashboard',
            description: 'View admin dashboard',
            category: 'admin',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'system:manage',
            name: 'Manage System',
            description: 'Manage system',
            category: 'system',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'admin:view_users',
            name: 'View Users',
            description: 'View users',
            category: 'admin',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual([]);
      });

      it('handles permissions with missing resource ID in group codes', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read',
            name: 'Read Groups',
            description: 'Read groups',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:group-1',
            name: 'Read Group 1',
            description: 'Read group 1',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toEqual(['group-1']);
        expect(result).not.toContain('undefined');
      });

      it('handles large number of permissions efficiently', () => {
        const permissions: Permission[] = Array.from(
          { length: 1000 },
          (_, i): Permission => ({
            code: `groups:read:group-${i}`,
            name: `Read Group ${i}`,
            description: `Read group ${i}`,
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          })
        );

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(1000);
        expect(result[0]).toBe('group-0');
        expect(result[999]).toBe('group-999');
      });

      it('handles permissions with special characters in group IDs', () => {
        const permissions: Permission[] = [
          {
            code: 'groups:read:group-with-dashes-123',
            name: 'Read Group',
            description: 'Read group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            code: 'groups:read:group_with_underscores_456',
            name: 'Read Group',
            description: 'Read group',
            category: 'groups',
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        const result = extractGroupIds(permissions);

        expect(result).toHaveLength(2);
        expect(result).toContain('group-with-dashes-123');
        expect(result).toContain('group_with_underscores_456');
      });
    });
  });
});
