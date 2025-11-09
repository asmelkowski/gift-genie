import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateExclusionMutation } from './useCreateExclusionMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type CreateExclusionRequest = components['schemas']['CreateExclusionRequest'];
type CreateExclusionResponse = components['schemas']['CreateExclusionResponse'];

describe('useCreateExclusionMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint', async () => {
    const mockData: CreateExclusionResponse = {
      created: [
        {
          id: 'exclusion-1',
          group_id: 'group-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          exclusion_type: 'manual',
          is_mutual: false,
          created_at: '2024-10-22T10:00:00Z',
          created_by_user_id: null,
        },
      ],
      mutual: false,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    const exclusionData: CreateExclusionRequest = {
      giver_member_id: 'member-1',
      receiver_member_id: 'member-2',
      is_mutual: false,
    };

    result.current.mutate(exclusionData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/groups/group-1/exclusions', exclusionData);
  });

  it('invalidates exclusions query on success', async () => {
    const mockData: CreateExclusionResponse = {
      created: [
        {
          id: 'exclusion-1',
          group_id: 'group-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          exclusion_type: 'manual',
          is_mutual: false,
          created_at: '2024-10-22T10:00:00Z',
          created_by_user_id: null,
        },
      ],
      mutual: false,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({
      giver_member_id: 'member-1',
      receiver_member_id: 'member-2',
      is_mutual: false,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['exclusions', 'group-1'],
    });
  });

  it('shows success toast', async () => {
    const mockData: CreateExclusionResponse = {
      created: [
        {
          id: 'exclusion-1',
          group_id: 'group-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          exclusion_type: 'manual',
          is_mutual: false,
          created_at: '2024-10-22T10:00:00Z',
          created_by_user_id: null,
        },
      ],
      mutual: false,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({
      giver_member_id: 'member-1',
      receiver_member_id: 'member-2',
      is_mutual: false,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Exclusion created successfully');
  });

  it('handles errors with detail field', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Member not found' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useCreateExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({
      giver_member_id: 'member-1',
      receiver_member_id: 'member-2',
      is_mutual: false,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Member not found');
  });

  it('returns exclusion data on success', async () => {
    const mockData: CreateExclusionResponse = {
      created: [
        {
          id: 'exclusion-1',
          group_id: 'group-1',
          giver_member_id: 'member-1',
          receiver_member_id: 'member-2',
          exclusion_type: 'manual',
          is_mutual: true,
          created_at: '2024-10-22T10:00:00Z',
          created_by_user_id: null,
        },
      ],
      mutual: true,
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateExclusionMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({
      giver_member_id: 'member-1',
      receiver_member_id: 'member-2',
      is_mutual: true,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
