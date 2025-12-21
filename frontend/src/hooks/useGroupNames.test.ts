import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGroupNames } from './useGroupNames';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('useGroupNames', () => {
  let queryClient = createTestQueryClient();

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('fetches multiple group names in parallel', async () => {
    const groupIds = ['group-1', 'group-2'];
    const mockResponses = [
      { id: 'group-1', name: 'Engineering Team', admin_user_id: 'admin-1', created_at: '2024-01-01' },
      { id: 'group-2', name: 'Marketing Team', admin_user_id: 'admin-2', created_at: '2024-01-02' },
    ];

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockResponses[0] })
      .mockResolvedValueOnce({ data: mockResponses[1] });

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.get('group-1')).toBe('Engineering Team');
    expect(result.current.groupNames.get('group-2')).toBe('Marketing Team');
    expect(result.current.groupNames.size).toBe(2);
    expect(result.current.hasError).toBe(false);

    // Verify parallel requests
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/groups/group-1');
    expect(api.get).toHaveBeenCalledWith('/groups/group-2');
  });

  it('handles failed fetch with placeholder fallback', async () => {
    const groupIds = ['group-1', 'group-2'];

    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { id: 'group-1', name: 'Engineering Team', admin_user_id: 'admin-1', created_at: '2024-01-01' },
      })
      .mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.get('group-1')).toBe('Engineering Team');
    expect(result.current.groupNames.get('group-2')).toBe('Group (group-2...)');
    expect(result.current.groupNames.size).toBe(2);
    expect(result.current.hasError).toBe(true);
  });

  it('returns empty map for empty group IDs array', async () => {
    const { result } = renderHook(() => useGroupNames([]), {
      wrapper: createTestWrapper(queryClient),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.groupNames.size).toBe(0);
    expect(result.current.hasError).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('generates placeholder with shortened group ID on 404 error', async () => {
    const groupId = 'very-long-group-id-that-should-be-shortened';
    const groupIds = [groupId];

    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const placeholder = result.current.groupNames.get(groupId);
    expect(placeholder).toBe(`Group (${groupId.slice(0, 8)}...)`);
  });

  it('returns single group name successfully', async () => {
    const groupIds = ['group-123'];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { id: 'group-123', name: 'Sales Team', admin_user_id: 'admin-1', created_at: '2024-01-01' },
    });

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.get('group-123')).toBe('Sales Team');
    expect(result.current.hasError).toBe(false);
  });

  it('maps group names correctly to their IDs', async () => {
    const groupIds = ['alpha', 'beta', 'gamma'];
    const mockData = [
      { id: 'alpha', name: 'Alpha Group', admin_user_id: 'user-1', created_at: '2024-01-01' },
      { id: 'beta', name: 'Beta Group', admin_user_id: 'user-2', created_at: '2024-01-02' },
      { id: 'gamma', name: 'Gamma Group', admin_user_id: 'user-3', created_at: '2024-01-03' },
    ];

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockData[0] })
      .mockResolvedValueOnce({ data: mockData[1] })
      .mockResolvedValueOnce({ data: mockData[2] });

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.size).toBe(3);
    groupIds.forEach((id, index) => {
      expect(result.current.groupNames.get(id)).toBe(mockData[index].name);
    });
  });

  it('handles mixed success and failure scenarios', async () => {
    const groupIds = ['group-1', 'group-2', 'group-3'];

    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { id: 'group-1', name: 'Success 1', admin_user_id: 'admin-1', created_at: '2024-01-01' },
      })
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce({
        data: { id: 'group-3', name: 'Success 3', admin_user_id: 'admin-3', created_at: '2024-01-03' },
      });

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.get('group-1')).toBe('Success 1');
    expect(result.current.groupNames.get('group-2')).toBe('Group (group-2...)');
    expect(result.current.groupNames.get('group-3')).toBe('Success 3');
    expect(result.current.hasError).toBe(true);
  });

  it('uses correct query key for caching', async () => {
    const groupIds = ['group-1'];

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { id: 'group-1', name: 'Test Group', admin_user_id: 'admin-1', created_at: '2024-01-01' },
    });

    const wrapper = createTestWrapper(queryClient);
    const { result: result1 } = renderHook(() => useGroupNames(groupIds), { wrapper });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second call should use cache
    const { result: result2 } = renderHook(() => useGroupNames(groupIds), { wrapper });

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Should only be called once due to caching with query key ['groups', 'group-1']
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result2.current.groupNames.get('group-1')).toBe('Test Group');
  });

  it('handles 403 Forbidden error with placeholder', async () => {
    const groupIds = ['group-1'];
    const forbiddenError = new Error('Forbidden') as unknown as Error & {
      response: { status: number };
    };
    forbiddenError.response = { status: 403 };

    vi.mocked(api.get).mockRejectedValueOnce(forbiddenError);

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groupNames.get('group-1')).toBe('Group (group-1...)');
    expect(result.current.hasError).toBe(true);
  });

  it('logs warning when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const groupIds = ['group-1'];

    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch group group-1'),
      expect.any(String)
    );

    consoleSpy.mockRestore();
  });

  it('filters out empty group IDs', async () => {
    const groupIds = ['group-1', '', 'group-2'];

    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { id: 'group-1', name: 'Group 1', admin_user_id: 'admin-1', created_at: '2024-01-01' },
      })
      .mockResolvedValueOnce({
        data: { id: 'group-2', name: 'Group 2', admin_user_id: 'admin-2', created_at: '2024-01-02' },
      });

    const { result } = renderHook(() => useGroupNames(groupIds), {
      wrapper: createTestWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Empty string should not trigger a query
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/groups/group-1');
    expect(api.get).toHaveBeenCalledWith('/groups/group-2');
  });
});
