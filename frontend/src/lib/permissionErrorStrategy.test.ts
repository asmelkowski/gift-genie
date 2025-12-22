import { describe, it, expect } from 'vitest';
import { getPermissionErrorBehavior } from './permissionErrorStrategy';

describe('getPermissionErrorBehavior', () => {
  it('should return "show-404" for single group GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123', 'GET')).toBe('show-404');
  });

  it('should return "show-404" for single group PATCH', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123', 'PATCH')).toBe('show-404');
  });

  it('should return "show-404" for single group DELETE', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123', 'DELETE')).toBe('show-404');
  });

  it('should return "show-empty" for groups list GET', () => {
    expect(getPermissionErrorBehavior('/groups', 'GET')).toBe('show-empty');
  });

  it('should return "show-empty" for groups list GET with query params', () => {
    expect(getPermissionErrorBehavior('/groups?page=1', 'GET')).toBe('show-empty');
  });

  it('should return "show-empty" for groups list GET with trailing slash', () => {
    expect(getPermissionErrorBehavior('/groups/', 'GET')).toBe('show-empty');
  });

  it('should return "show-404" for single member GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/members/def-456', 'GET')).toBe('show-404');
  });

  it('should return "show-forbidden" for members list GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/members', 'GET')).toBe('show-forbidden');
  });

  it('should return "show-forbidden" for members list GET with query params', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/members?page=1', 'GET')).toBe(
      'show-forbidden'
    );
  });

  it('should return "show-404" for single draw GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/draws/def-456', 'GET')).toBe('show-404');
  });

  it('should return "show-forbidden" for draws list GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/draws', 'GET')).toBe('show-forbidden');
  });

  it('should return "show-404" for single exclusion GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/exclusions/def-456', 'GET')).toBe(
      'show-404'
    );
  });

  it('should return "show-forbidden" for exclusions list GET', () => {
    expect(getPermissionErrorBehavior('/groups/abc-123/exclusions', 'GET')).toBe('show-forbidden');
  });

  it('should return "show-forbidden" for admin endpoints', () => {
    expect(getPermissionErrorBehavior('/admin/users', 'GET')).toBe('show-forbidden');
    expect(getPermissionErrorBehavior('/admin', 'GET')).toBe('show-forbidden');
    expect(getPermissionErrorBehavior('/admin/settings', 'POST')).toBe('show-forbidden');
  });

  it('should return "show-forbidden" for unknown endpoints', () => {
    expect(getPermissionErrorBehavior('/unknown', 'GET')).toBe('show-forbidden');
  });

  it('should return "show-forbidden" for POST requests to resource lists', () => {
    // Creating a group or member should show forbidden if not allowed, not empty list
    expect(getPermissionErrorBehavior('/groups', 'POST')).toBe('show-forbidden');
    expect(getPermissionErrorBehavior('/groups/abc-123/members', 'POST')).toBe('show-forbidden');
  });
});
