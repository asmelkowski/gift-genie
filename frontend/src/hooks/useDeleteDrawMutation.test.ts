import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDeleteDrawMutation } from './useDeleteDrawMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

describe('useDeleteDrawMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct delete endpoint', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('draw-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.delete).toHaveBeenCalledWith('/groups/group-1/draws/draw-1');
  });

  it('invalidates draws query with group ID on success', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('draw-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draws', 'group-1'],
    });
  });

  it('shows success toast', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('draw-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Draw deleted successfully');
  });

  it('handles errors correctly', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Cannot delete finalized draw' },
      },
    };

    vi.mocked(api.delete).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useDeleteDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('draw-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Cannot delete finalized draw');
  });

  it('uses default error message when detail missing', async () => {
    const errorResponse = {
      response: {
        data: {},
      },
    };

    vi.mocked(api.delete).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useDeleteDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('draw-1');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete draw');
  });
});
