import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateBulkExclusionsMutation } from './useCreateBulkExclusionsMutation';
import { createTestQueryClient, createTestWrapper } from '@/test/test-utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { components } from '@/types/schema';

vi.mock('@/lib/api');
vi.mock('react-hot-toast');

type CreateExclusionsBulkResponse =
  components['schemas']['CreateExclusionsBulkResponse'];

describe('useCreateBulkExclusionsMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('calls API with correct endpoint', async () => {
    const mockData: CreateExclusionsBulkResponse = {
      created: [{ id: '1', exclusion_type: 'unidirectional' }],
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useCreateBulkExclusionsMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    const requestData = {
      exclusions: [{ giver_member_id: 'm1', receiver_member_id: 'm2' }],
    };

    result.current.mutate(requestData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/groups/group-1/exclusions/bulk',
      requestData
    );
  });

  it('shows success toast with count', async () => {
    const mockData: CreateExclusionsBulkResponse = {
      created: [
        { id: '1', exclusion_type: 'unidirectional' },
        { id: '2', exclusion_type: 'unidirectional' },
      ],
    };

    vi.mocked(api.post).mockResolvedValue({ data: mockData });

    const { result } = renderHook(
      () => useCreateBulkExclusionsMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate({
      exclusions: [{ giver_member_id: 'm1', receiver_member_id: 'm2' }],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('2 exclusions created successfully');
  });

  it('invalidates exclusions query on success', async () => {
    const mockData: CreateExclusionsBulkResponse = { created: [] };
    vi.mocked(api.post).mockResolvedValue({ data: mockData });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () => useCreateBulkExclusionsMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate({ exclusions: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['exclusions', 'group-1'],
    });
  });

  it('handles conflict errors', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: {
        data: {
          code: 'conflicts_present',
          details: [
            { giver_member_id: 'm1', receiver_member_id: 'm2', reason: 'exists' },
          ],
        },
      },
    });

    const { result } = renderHook(
      () => useCreateBulkExclusionsMutation('group-1'),
      { wrapper: createTestWrapper(queryClient) }
    );

    result.current.mutate({ exclusions: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('m1 → m2'));
  });
});
