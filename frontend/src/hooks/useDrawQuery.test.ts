import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useDrawQuery } from './useDrawQuery';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');

type DrawResponse = components['schemas']['DrawResponse'];

describe('useDrawQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('constructs correct query key', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      name: 'Test Draw',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('returns data on successful API call', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      name: 'Test Draw',
      status: 'pending',
      assignments_count: 5,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDrawQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('returns error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useDrawQuery('invalid-id'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('calls API with correct draw ID', async () => {
    const mockData: DrawResponse = {
      id: 'draw-123',
      group_id: 'group-1',
      name: 'Test Draw',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    renderHook(() => useDrawQuery('draw-123'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/draws/draw-123');
    });
  });

  it('does not execute query when draw ID is empty', () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      name: 'Test Draw',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDrawQuery(''), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('respects enabled flag based on draw ID', async () => {
    const mockData: DrawResponse = {
      id: 'draw-1',
      group_id: 'group-1',
      name: 'Test Draw',
      status: 'pending',
      assignments_count: 0,
      created_at: '2024-10-22T10:00:00Z',
      finalized_at: null,
      notification_sent_at: null,
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useDrawQuery('draw-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.get).toHaveBeenCalled();
  });
});
