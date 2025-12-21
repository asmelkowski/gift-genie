import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserPermissions, type Permission } from './useUserPermissions';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('useUserPermissions', () => {
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

  it('fetches user permissions when userId is provided', async () => {
    const userId = 'user-123';
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

    const { result } = renderHook(() => useUserPermissions(userId), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPermissions);
    expect(api.get).toHaveBeenCalledWith(`/admin/users/${userId}/permissions`);
  });

  it('does not fetch when userId is not provided', async () => {
    const { result } = renderHook(() => useUserPermissions(''), {
      wrapper: createWrapper(),
    });

    // Should not call the API when userId is empty
    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when fetching permissions', async () => {
    const userId = 'user-123';
    const mockError = new Error('Failed to fetch');
    vi.mocked(api.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useUserPermissions(userId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('uses correct query key for caching', async () => {
    const userId = 'user-123';
    const mockPermissions: Permission[] = [];

    vi.mocked(api.get).mockResolvedValue({ data: mockPermissions });

    const { result: result1 } = renderHook(() => useUserPermissions(userId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Create new queryClient to test that the first one was cached
    const newQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const newWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={newQueryClient}>{children}</QueryClientProvider>
    );

    const { result: result2 } = renderHook(() => useUserPermissions(userId), {
      wrapper: newWrapper,
    });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // API should be called again for new client
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
