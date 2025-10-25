import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateGroupMutation } from './useCreateGroupMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

type CreateGroupRequest = components['schemas']['CreateGroupRequest'];
type GroupDetailResponse = components['schemas']['GroupDetailResponse'];

describe('useCreateGroupMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint and data', async () => {
    const mockData: GroupDetailResponse = {
      id: 'group-1',
      name: 'New Group',
      description: 'Test group',
      created_at: '2024-10-22T10:00:00Z',
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    const groupData: CreateGroupRequest = {
      name: 'New Group',
      description: 'Test group',
    };

    result.current.mutate(groupData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/api/v1/groups', groupData);
  });

  it('returns data on successful mutation', async () => {
    const mockData: GroupDetailResponse = {
      id: 'group-1',
      name: 'New Group',
      description: 'Test group',
      created_at: '2024-10-22T10:00:00Z',
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'New Group' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('invalidates groups query on success', async () => {
    const mockData: GroupDetailResponse = {
      id: 'group-1',
      name: 'New Group',
      description: 'Test group',
      created_at: '2024-10-22T10:00:00Z',
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'New Group' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] });
  });

  it('shows success toast on successful mutation', async () => {
    const mockData: GroupDetailResponse = {
      id: 'group-1',
      name: 'New Group',
      description: 'Test group',
      created_at: '2024-10-22T10:00:00Z',
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'New Group' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Group created successfully');
  });

  it('handles API errors correctly', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Group name already exists' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'Duplicate Group' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Group name already exists');
  });

  it('shows generic error message when API response missing detail', async () => {
    const errorResponse = {
      response: {
        data: {},
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'Test Group' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to create group');
  });

  it('provides loading state during mutation', async () => {
    const mockData: GroupDetailResponse = {
      id: 'group-1',
      name: 'New Group',
      description: 'Test group',
      created_at: '2024-10-22T10:00:00Z',
      updated_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: mockData }), 100)
        )
    );

    const { result } = renderHook(() => useCreateGroupMutation(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'New Group' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
