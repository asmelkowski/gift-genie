import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDeleteExclusionMutation } from './useDeleteExclusionMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

describe('useDeleteExclusionMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct delete endpoint', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('exclusion-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.delete).toHaveBeenCalledWith('/api/v1/groups/group-1/exclusions/exclusion-1');
  });

  it('invalidates exclusions query on success', async () => {
    vi.mocked(api.delete).mockResolvedValue({});
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('exclusion-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['exclusions', 'group-1'],
    });
  });

  it('shows success toast', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    const { result } = renderHook(() => useDeleteExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('exclusion-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('Exclusion deleted successfully');
  });

  it('handles errors', async () => {
    vi.mocked(api.delete).mockRejectedValue({
      response: { data: { detail: 'Not found' } },
    });

    const { result } = renderHook(() => useDeleteExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate('invalid-id');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Not found');
  });
});
