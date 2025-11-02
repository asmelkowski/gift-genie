import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useExecuteDrawMutation } from './useExecuteDrawMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type ExecuteDrawResponse = components['schemas']['ExecuteDrawResponse'];

describe('useExecuteDrawMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint', async () => {
    const mockData: ExecuteDrawResponse = {
      draw: {
        id: 'draw-1',
        group_id: 'group-1',
        status: 'pending',
        assignments_count: 5,
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: null,
        notification_sent_at: null,
      },
      assignments: [{ giver_member_id: 'm1', receiver_member_id: 'm2' }],
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useExecuteDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/draws/draw-1/execute',
      {}
    );
  });

  it('invalidates draws query on success', async () => {
    const mockData: ExecuteDrawResponse = {
      draw: {
        id: 'draw-1',
        group_id: 'group-1',
        status: 'pending',
        assignments_count: 5,
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: null,
        notification_sent_at: null,
      },
      assignments: [{ giver_member_id: 'm1', receiver_member_id: 'm2' }],
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useExecuteDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draws', 'group-1'],
    });
  });

  it('shows success toast with assignment count', async () => {
    const mockData: ExecuteDrawResponse = {
      draw: {
        id: 'draw-1',
        group_id: 'group-1',
        status: 'pending',
        assignments_count: 3,
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: null,
        notification_sent_at: null,
      },
      assignments: [
        { giver_member_id: 'm1', receiver_member_id: 'm2' },
        { giver_member_id: 'm2', receiver_member_id: 'm3' },
        { giver_member_id: 'm3', receiver_member_id: 'm1' },
      ],
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useExecuteDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith(
      'Draw executed! 3 assignments generated.'
    );
  });

  it('handles errors', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { detail: 'Insufficient members' } },
    });

    const { result } = renderHook(
      () => useExecuteDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Insufficient members');
  });
});
