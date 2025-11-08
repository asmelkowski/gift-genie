import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDeleteMemberMutation } from './useDeleteMemberMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

describe('useDeleteMemberMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct delete endpoint', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('member-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.delete).toHaveBeenCalledWith('/api/v1/groups/group-1/members/member-1');
  });

  it('invalidates members query with correct group ID on success', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('member-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['members', 'group-1'],
    });
  });

  it('shows success toast on successful deletion', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('member-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Member deleted successfully');
  });

  it('handles API errors correctly', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Member not found' },
      },
    };

    vi.mocked(api.delete).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('invalid-id');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Member not found');
  });

  it('shows generic error when detail is missing', async () => {
    const errorResponse = {
      response: {
        data: {},
      },
    };

    vi.mocked(api.delete).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('member-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete member');
  });

  it('provides loading and success states', async () => {
    vi.mocked(api.delete).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    const { result } = renderHook(() => useDeleteMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('member-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
