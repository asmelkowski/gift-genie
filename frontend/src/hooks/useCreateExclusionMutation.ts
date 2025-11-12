import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';

type CreateExclusionRequest = components['schemas']['CreateExclusionRequest'];
type CreateExclusionResponse = components['schemas']['CreateExclusionResponse'];

interface ApiErrorResponse {
  code?: string;
  detail?: string;
  message?: string;
}

export const useCreateExclusionMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExclusionRequest) => {
      const response = await api.post<CreateExclusionResponse>(
        `/groups/${groupId}/exclusions`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', groupId] });
      toast.success('Exclusion created successfully');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to create exclusion';
      toast.error(detail);
    },
  });
};
