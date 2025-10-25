import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useAssignmentsQuery } from './useAssignmentsQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type ListAssignmentsResponse = components['schemas']['ListAssignmentsResponse'];

describe('useAssignmentsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key with draw ID', async () => {
    const mockData: ListAssignmentsResponse = {
      items: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useAssignmentsQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('returns data when API succeeds', async () => {
    const mockAssignments = [
      {
        id: '1',
        draw_id: 'draw-1',
        giver_member_id: 'member-1',
        receiver_member_id: 'member-2',
        created_at: '2024-10-22T10:00:00Z',
      },
      {
        id: '2',
        draw_id: 'draw-1',
        giver_member_id: 'member-2',
        receiver_member_id: 'member-1',
        created_at: '2024-10-22T10:00:00Z',
      },
    ];
    const mockData: ListAssignmentsResponse = {
      items: mockAssignments as any,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useAssignmentsQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
  });

  it('returns error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useAssignmentsQuery('invalid-draw'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('calls API with correct draw ID', async () => {
    const mockData: ListAssignmentsResponse = {
      items: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useAssignmentsQuery('draw-456'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/draws/draw-456/assignments', {
        params: { include: 'names' },
      });
    });
  });

  it('does not execute query when draw ID is empty', () => {
    const mockData: ListAssignmentsResponse = {
      items: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useAssignmentsQuery(''), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('passes include=names parameter to API', async () => {
    const mockData: ListAssignmentsResponse = {
      items: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useAssignmentsQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/api/v1/draws/draw-1/assignments',
        expect.objectContaining({
          params: { include: 'names' },
        })
      );
    });
  });
});
