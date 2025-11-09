import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useUpdateMemberMutation } from './useUpdateMemberMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type MemberResponse = components['schemas']['MemberResponse'];
type UpdateMemberRequest = components['schemas']['UpdateMemberRequest'];

describe('useUpdateMemberMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with PATCH and correct endpoint', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Updated',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.patch).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useUpdateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    const updateData: UpdateMemberRequest = { name: 'John Updated' };
    result.current.mutate({ memberId: 'member-1', payload: updateData });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.patch).toHaveBeenCalledWith('/groups/group-1/members/member-1', updateData);
  });

  it('invalidates members query on success', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Updated',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.patch).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ memberId: 'member-1', payload: { name: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['members', 'group-1'],
    });
  });

  it('shows success toast', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Updated',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.patch).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useUpdateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ memberId: 'member-1', payload: { name: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Member updated successfully');
  });

  it('calls custom error callback', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Email already in use' },
      },
    };

    vi.mocked(api.patch).mockRejectedValue(errorResponse);
    const onError = vi.fn();

    const { result } = renderHook(() => useUpdateMemberMutation('group-1', onError), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ memberId: 'member-1', payload: { name: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onError).toHaveBeenCalledWith('Email already in use');
  });

  it('returns updated member data', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Updated',
      email: 'john@example.com',
      is_active: false,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.patch).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useUpdateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ memberId: 'member-1', payload: { name: 'Updated' } });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });
});
