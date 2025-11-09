import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  code?: string;
  detail?: string;
  message?: string;
}

export const useDeleteExclusionMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exclusionId: string) => {
      await api.delete(`/groups/${groupId}/exclusions/${exclusionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusions', groupId] });
      toast.success('Exclusion deleted successfully');
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const detail =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to delete exclusion';
      toast.error(detail);
    },
  });
};
