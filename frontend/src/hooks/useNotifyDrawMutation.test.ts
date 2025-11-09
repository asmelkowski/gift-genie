import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useNotifyDrawMutation } from './useNotifyDrawMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type NotifyDrawResponse = components['schemas']['NotifyDrawResponse'];

describe('useNotifyDrawMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint and resend parameter', async () => {
    const mockData: NotifyDrawResponse = {
      sent: 5,
      skipped: 0,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: false });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/draws/draw-1/notify', { resend: false });
  });

  it('invalidates both draws and draw queries on success', async () => {
    const mockData: NotifyDrawResponse = {
      sent: 5,
      skipped: 0,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: false });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draws', 'group-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['draw', 'draw-1'],
    });
  });

  it('handles resend parameter correctly', async () => {
    const mockData: NotifyDrawResponse = {
      sent: 5,
      skipped: 0,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: true });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/draws/draw-1/notify', { resend: true });
  });

  it('returns notification response data', async () => {
    const mockData: NotifyDrawResponse = {
      sent: 5,
      skipped: 0,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: false });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('handles errors correctly', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Draw not finalized yet' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: false });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Draw not finalized yet');
  });

  it('uses default error message when detail missing', async () => {
    const errorResponse = {
      response: {
        data: {},
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useNotifyDrawMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ drawId: 'draw-1', resend: false });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to send notifications');
  });
});
