import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateDrawMutation } from './useCreateDrawMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type DrawResponse = components['schemas']['DrawResponse'];

describe('useCreateDrawMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint and empty payload', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/api/v1/groups/group-1/draws', {});
  });

  it('invalidates draws query on success', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draws', 'group-1'],
    });
  });

  it('shows success toast', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Draw created successfully');
  });

  it('handles errors correctly', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Group must have at least 2 members' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useCreateDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Group must have at least 2 members'
    );
  });

  it('returns draw data on success', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
