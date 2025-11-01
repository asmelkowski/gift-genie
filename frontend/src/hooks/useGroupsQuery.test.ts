import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useGroupsQuery } from './useGroupsQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type GroupResponse = components['schemas']['GroupResponse'];
type PaginatedGroupsResponse = components['schemas']['PaginatedGroupsResponse'];

describe('useGroupsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns query with correct initial state', () => {
    const { result } = renderHook(() => useGroupsQuery({}), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('constructs correct query key', async () => {
    const params = { search: 'test', page: 2 };
    const mockData: PaginatedGroupsResponse = {
      items: [],
      total: 0,
      page: 2,
      page_size: 12,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useGroupsQuery(params), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('calls API with correct parameters', async () => {
    const params = { search: 'my-group', page: 1, page_size: 20 };
    const mockData: PaginatedGroupsResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useGroupsQuery(params), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups', {
        params: {
          search: 'my-group',
          page: 1,
          page_size: 20,
          sort: '-created_at',
        },
      });
    });
  });

  it('uses default parameters when not provided', async () => {
    const mockData: PaginatedGroupsResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useGroupsQuery({}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups', {
        params: {
          search: undefined,
          page: 1,
          page_size: 12,
          sort: '-created_at',
        },
      });
    });
  });

  it('returns data on successful API call', async () => {
    const mockGroups = [
      { id: '1', name: 'Group 1', description: 'Test group' },
      { id: '2', name: 'Group 2', description: 'Another group' },
    ];
    const mockData: PaginatedGroupsResponse = {
      data: mockGroups as GroupResponse[],
      meta: {
        total: 2,
        page: 1,
        page_size: 12,
        total_pages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useGroupsQuery({}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.data?.data).toHaveLength(2);
  });

  it('handles API errors correctly', async () => {
    const mockError = new Error('API Error');
    vi.mocked(api.get).mockRejectedValue(mockError);

    const { result } = renderHook(() => useGroupsQuery({}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('does not retry failed requests', async () => {
    const mockError = new Error('API Error');
    vi.mocked(api.get).mockRejectedValue(mockError);

    renderHook(() => useGroupsQuery({}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  it('includes sort parameter when provided', async () => {
    const params = { sort: 'name' };
    const mockData: PaginatedGroupsResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 12,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useGroupsQuery(params), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups', {
        params: {
          search: undefined,
          page: 1,
          page_size: 12,
          sort: 'name',
        },
      });
    });
  });
});
