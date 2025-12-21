import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRevokePermission } from './useRevokePermission';
import api from '@/lib/api';
import toast from 'react-hot-toast';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

describe('useRevokePermission', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider {...{ client: queryClient }}>
        {children}
      </QueryClientProvider>
    );
  };

  it('revokes permission successfully', async () => {
    const userId = 'user-123';
    const permissionCode = 'draws:notify';

    vi.mocked(api.delete).mockResolvedValue({ data: null });

    const { result } = renderHook(() => useRevokePermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(permissionCode);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.delete).toHaveBeenCalledWith(
      `/admin/users/${userId}/permissions/${permissionCode}`
    );

    expect(toast.success).toHaveBeenCalledWith(
      'Permission revoked successfully'
    );
  });

  it('handles error when revoking permission', async () => {
    const userId = 'user-123';
    const permissionCode = 'draws:notify';
    const mockError = new Error('Permission not found');

    vi.mocked(api.delete).mockRejectedValue(mockError);

    const { result } = renderHook(() => useRevokePermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(permissionCode);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('invalidates user permissions query on success', async () => {
    const userId = 'user-123';
    const permissionCode = 'draws:notify';
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    vi.mocked(api.delete).mockResolvedValue({ data: null });

    const { result } = renderHook(() => useRevokePermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(permissionCode);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['admin', 'users', userId, 'permissions'],
    });
  });

  it('accepts permission code as mutation parameter', async () => {
    const userId = 'user-123';
    const permissionCode = 'groups:delete';

    vi.mocked(api.delete).mockResolvedValue({ data: null });

    const { result } = renderHook(() => useRevokePermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(permissionCode);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.delete).toHaveBeenCalledWith(
      `/admin/users/${userId}/permissions/${permissionCode}`
    );
  });
});
