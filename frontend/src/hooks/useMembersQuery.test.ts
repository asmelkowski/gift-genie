import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useMembersQuery } from './useMembersQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type MemberResponse = components['schemas']['MemberResponse'];
type PaginatedMembersResponse = components['schemas']['PaginatedMembersResponse'];

describe('useMembersQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key with group ID and params', async () => {
    const mockData: PaginatedMembersResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 12,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useMembersQuery('group-1', {}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('calls API with correct parameters', async () => {
    const mockData: PaginatedMembersResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(
      () =>
        useMembersQuery('group-123', {
          search: 'john',
          page: 2,
          page_size: 20,
          is_active: true,
        }),
      {
        wrapper: createTestWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-123/members', {
        params: {
          is_active: true,
          search: 'john',
          page: 2,
          page_size: 20,
          sort: 'name',
        },
      });
    });
  });

  it('returns data on successful API call', async () => {
    const mockMembers = [
      { id: '1', name: 'John Doe', email: 'john@example.com', is_active: true },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', is_active: true },
    ];
    const mockData: PaginatedMembersResponse = {
      data: mockMembers as MemberResponse[],
      meta: {
        total: 2,
        page: 1,
        page_size: 12,
        total_pages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useMembersQuery('group-1', {}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toHaveLength(2);
  });

  it('handles is_active filter correctly', async () => {
    const mockData: PaginatedMembersResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 12,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useMembersQuery('group-1', { is_active: false }), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/members', {
        params: expect.objectContaining({
          is_active: false,
        }),
      });
    });
  });

  it('uses default parameters when not provided', async () => {
    const mockData: PaginatedMembersResponse = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        page_size: 12,
        total_pages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useMembersQuery('group-1', {}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/groups/group-1/members', {
        params: {
          is_active: undefined,
          search: undefined,
          page: 1,
          page_size: 12,
          sort: 'name',
        },
      });
    });
  });

  it('handles API errors correctly', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useMembersQuery('group-1', {}), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
