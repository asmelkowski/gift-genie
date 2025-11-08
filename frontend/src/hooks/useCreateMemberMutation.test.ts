import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateMemberMutation } from './useCreateMemberMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type CreateMemberRequest = components['schemas']['CreateMemberRequest'];
type MemberResponse = components['schemas']['MemberResponse'];

describe('useCreateMemberMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint including group ID', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    const memberData: CreateMemberRequest = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    result.current.mutate(memberData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.post).toHaveBeenCalledWith('/api/v1/groups/group-1/members', memberData);
  });

  it('invalidates members query with correct group ID on success', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['members', 'group-1'],
    });
  });

  it('shows success toast on successful mutation', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Member added successfully');
  });

  it('calls custom onError callback when provided', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Email already exists' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);
    const onErrorCallback = vi.fn();

    const { result } = renderHook(() => useCreateMemberMutation('group-1', onErrorCallback), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(onErrorCallback).toHaveBeenCalledWith('Email already exists');
  });

  it('shows toast error when no custom callback provided', async () => {
    const errorResponse = {
      response: {
        data: { detail: 'Email already exists' },
      },
    };

    vi.mocked(api.post).mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(toast.error).toHaveBeenCalledWith('Email already exists');
  });

  it('returns data on successful mutation', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('provides loading state during mutation', async () => {
    const mockData: MemberResponse = {
      id: 'member-1',
      group_id: 'group-1',
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2024-10-22T10:00:00Z',
    };

    vi.mocked(api.post).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: mockData }), 100))
    );

    const { result } = renderHook(() => useCreateMemberMutation('group-1'), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.mutate({ name: 'John Doe', email: 'john@example.com' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.isPending).toBe(false);
  });
});
