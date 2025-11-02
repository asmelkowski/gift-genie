import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useFinalizeDrawMutation } from './useFinalizeDrawMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

type DrawResponse = components['schemas']['DrawResponse'];

describe('useFinalizeDrawMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('calls API with correct endpoint', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'finalized',
      assignments_count: 5,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: '2024-10-22T15:00:00Z',
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useFinalizeDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/draws/draw-1/finalize',
      {}
    );
  });

  it('invalidates draws query on success', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'finalized',
      assignments_count: 5,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: '2024-10-22T15:00:00Z',
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useFinalizeDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draws', 'group-1'],
    });
  });

  it('sets confetti flag in sessionStorage', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'finalized',
      assignments_count: 5,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: '2024-10-22T15:00:00Z',
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useFinalizeDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sessionStorage.getItem('draw-draw-1-just-finalized')).toBe('true');
  });

  it('shows success toast', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      status: 'finalized',
      assignments_count: 5,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: '2024-10-22T15:00:00Z',
      notification_sent_at: null,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useFinalizeDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('Draw finalized successfully!');
  });

  it('handles errors', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: { data: { detail: 'Draw already finalized' } },
    });

    const { result } = renderHook(
      () => useFinalizeDrawMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate('draw-1');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Draw already finalized');
  });
});
