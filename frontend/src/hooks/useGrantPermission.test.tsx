import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGrantPermission } from './useGrantPermission';
import api from '@/lib/api';
import toast from 'react-hot-toast';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

describe('useGrantPermission', () => {
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
      <QueryClientProvider {...{ client: queryClient }}>{children}</QueryClientProvider>
    );
  };

  it('grants permission successfully', async () => {
    const userId = 'user-123';
    const mockResponse = {
      user_id: userId,
      permission_code: 'draws:notify',
      granted_at: '2025-12-17T00:00:00Z',
      granted_by: 'admin-user',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

    const { result } = renderHook(() => useGrantPermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      permission_code: 'draws:notify',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);

    expect(api.post).toHaveBeenCalledWith(`/admin/users/${userId}/permissions`, {
      permission_code: 'draws:notify',
    });

    expect(toast.success).toHaveBeenCalledWith('Permission granted successfully');
  });

  it('handles error when granting permission', async () => {
    const userId = 'user-123';
    const mockError = new Error('Permission already granted');
    vi.mocked(api.post).mockRejectedValue(mockError);

    const { result } = renderHook(() => useGrantPermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      permission_code: 'draws:notify',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('invalidates user permissions query on success', async () => {
    const userId = 'user-123';
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const mockResponse = {
      user_id: userId,
      permission_code: 'draws:notify',
      granted_at: '2025-12-17T00:00:00Z',
      granted_by: 'admin-user',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

    const { result } = renderHook(() => useGrantPermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      permission_code: 'draws:notify',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['admin', 'users', userId, 'permissions'],
    });
  });

  it('sends optional notes with request', async () => {
    const userId = 'user-123';
    const mockResponse = {
      user_id: userId,
      permission_code: 'draws:notify',
      granted_at: '2025-12-17T00:00:00Z',
      granted_by: 'admin-user',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

    const { result } = renderHook(() => useGrantPermission(userId), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      permission_code: 'draws:notify',
      notes: 'Granted for special project',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith(`/admin/users/${userId}/permissions`, {
      permission_code: 'draws:notify',
      notes: 'Granted for special project',
    });
  });
});
