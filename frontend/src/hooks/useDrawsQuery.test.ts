import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDrawsQuery } from './useDrawsQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type PaginatedDrawsResponse = components['schemas']['PaginatedDrawsResponse'];

describe('useDrawsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key', async () => {
    const mockData: PaginatedDrawsResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
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
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-456' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-456/draws', {
        params: expect.any(Object),
      });
    });
  });

  it('returns data when API succeeds', async () => {
    const mockDraws = [
      { id: '1', name: 'Draw 1', status: 'pending' },
      { id: '2', name: 'Draw 2', status: 'finalized' },
    ];
    const mockData: PaginatedDrawsResponse = {
      items: mockDraws as any,
      total: 2,
      page: 1,
      page_size: 10,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
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
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-1', status: 'finalized' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/draws', {
        params: expect.objectContaining({
          status: 'finalized',
        }),
      });
    });
  });

  it('uses default parameters when not provided', async () => {
    const mockData: PaginatedDrawsResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/draws', {
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
      items: [],
      total: 0,
      page: 2,
      page_size: 20,
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
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/draws', {
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
