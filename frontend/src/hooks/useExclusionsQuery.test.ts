import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useExclusionsQuery } from './useExclusionsQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type ExclusionResponse = components['schemas']['ExclusionResponse'];
type PaginatedExclusionsResponse = components['schemas']['PaginatedExclusionsResponse'];

describe('useExclusionsQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key with group ID', async () => {
    const mockData: PaginatedExclusionsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useExclusionsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('calls API with correct group ID', async () => {
    const mockData: PaginatedExclusionsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useExclusionsQuery({ groupId: 'group-123' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-123/exclusions', {
        params: expect.any(Object),
      });
    });
  });

  it('uses default parameters when not provided', async () => {
    const mockData: PaginatedExclusionsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useExclusionsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/exclusions', {
        params: {
          type: undefined,
          giver_member_id: undefined,
          receiver_member_id: undefined,
          page: 1,
          page_size: 10,
          sort: 'exclusion_type,name',
        },
      });
    });
  });

  it('returns data on successful API call', async () => {
    const mockExclusions = [
      { id: '1', giver_member_id: 'member-1', receiver_member_id: 'member-2' },
    ];
    const mockData: PaginatedExclusionsResponse = {
      data: mockExclusions as ExclusionResponse[],
      meta: {
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useExclusionsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(1);
  });

  it('passes filter parameters correctly', async () => {
    const mockData: PaginatedExclusionsResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(
      () =>
        useExclusionsQuery({
          groupId: 'group-1',
          type: 'manual',
          giver_member_id: 'member-1',
          page: 2,
        }),
      {
        wrapper: createTestWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/exclusions', {
        params: {
          type: 'manual',
          giver_member_id: 'member-1',
          receiver_member_id: undefined,
          page: 2,
          page_size: 10,
          sort: 'exclusion_type,name',
        },
      });
    });
  });

  it('handles API errors correctly', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useExclusionsQuery({ groupId: 'group-1' }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
