import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAvailablePermissions } from './useAvailablePermissions';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { Permission } from './useUserPermissions';

vi.mock('@/lib/api');

describe('useAvailablePermissions', () => {
  let queryClient = createTestQueryClient();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('fetches available permissions', async () => {
    const mockPermissions: Permission[] = [
      {
        code: 'groups:create',
        name: 'Create Groups',
        description: 'Create new groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
      {
        code: 'draws:notify',
        name: 'Send Draw Notifications',
        description: 'Send email notifications to draw participants',
        category: 'draws',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ data: mockPermissions });

    const { result } = renderHook(() => useAvailablePermissions(), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPermissions);
    expect(api.get).toHaveBeenCalledWith('/admin/permissions');
  });

  it('handles error when fetching permissions', async () => {
    const mockError = new Error('Failed to fetch permissions');
    vi.mocked(api.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAvailablePermissions(), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('uses stale time of 5 minutes', async () => {
    const mockPermissions: Permission[] = [
      {
        code: 'groups:create',
        name: 'Create Groups',
        description: 'Create new groups',
        category: 'groups',
        created_at: '2025-12-17T00:00:00Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValue({ data: mockPermissions });

    const wrapper = createTestWrapper(queryClient);
    const { result: result1 } = renderHook(() => useAvailablePermissions(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second hook should not trigger another fetch due to stale time
    const { result: result2 } = renderHook(() => useAvailablePermissions(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Should only be called once due to stale time
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
