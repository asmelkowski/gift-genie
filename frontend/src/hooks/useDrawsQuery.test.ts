import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDrawsQuery } from './useDrawsQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type DrawResponse = components['schemas']['DrawResponse'];
type PaginatedDrawsResponse = components['schemas']['PaginatedDrawsResponse'];

describe('useDrawsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key', async () => {
    const mockData: PaginatedDrawsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('calls API with correct group ID', async () => {
    const mockData: PaginatedDrawsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-456' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group-456/draws', {
        params: expect.any(Object),
      });
    });
  });

  it('returns data when API succeeds', async () => {
    const mockDraws: DrawResponse[] = [
      {
        id: '1',
        group_id: 'group-1',
        status: 'pending',
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: null,
        notification_sent_at: null,
        assignments_count: 0,
      },
      {
        id: '2',
        group_id: 'group-1',
        status: 'finalized',
        created_at: '2024-10-22T10:00:00Z',
        finalized_at: '2024-10-22T11:00:00Z',
        notification_sent_at: null,
        assignments_count: 5,
      },
    ];
    const mockData: PaginatedDrawsResponse = {
      data: mockDraws,
      meta: {
        total: 2,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(2);
  });

  it('returns error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('passes status filter when provided', async () => {
    const mockData: PaginatedDrawsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-1', status: 'finalized' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group-1/draws', {
        params: expect.objectContaining({
          status: 'finalized',
        }),
      });
    });
  });

  it('uses default parameters when not provided', async () => {
    const mockData: PaginatedDrawsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group-1/draws', {
        params: {
          status: undefined,
          page: 1,
          page_size: 10,
          sort: '-created_at',
        },
      });
    });
  });

  it('passes custom page and sort parameters', async () => {
    const mockData: PaginatedDrawsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 2,
        page_size: 20,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(
      () =>
        useDrawsQuery({
          groupId: 'group-1',
          page: 2,
          page_size: 20,
          sort: 'name',
        }),
      {
        wrapper: createTestWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/groups/group-1/draws', {
        params: {
          status: undefined,
          page: 2,
          page_size: 20,
          sort: 'name',
        },
      });
    });
  });
});
