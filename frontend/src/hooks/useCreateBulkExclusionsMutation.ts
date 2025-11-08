import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type CreateExclusionsBulkRequest = components['schemas']['CreateExclusionsBulkRequest'];
type CreateExclusionsBulkResponse = components['schemas']['CreateExclusionsBulkResponse'];

interface ApiErrorResponse {
  code?: string;
  detail?: string;
  message?: string;
  details?: Array<{
    giver_member_id: string;
    receiver_member_id: string;
    reason: string;
  }>;
}

export const useCreateBulkExclusionsMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExclusionsBulkRequest) => {
      const response = await api.post<CreateExclusionsBulkResponse>(
        `/api/v1/groups/${groupId}/exclusions/bulk`,
        data
      );
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', groupId] });
      toast.success(`${data.created.length} exclusions created successfully`);
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const errorCode = error.response?.data?.code;
      if (errorCode === 'conflicts_present') {
        const conflicts = error.response?.data?.details || [];
        const conflictMsg = conflicts
          .map(c => `${c.giver_member_id} → ${c.receiver_member_id}`)
          .join(', ');
        toast.error(`Conflicts detected: ${conflictMsg}`);
      } else {
        const detail =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Failed to create exclusions';
        toast.error(detail);
      }
    },
  });
};
