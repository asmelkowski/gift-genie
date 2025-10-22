import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import toast from 'react-hot-toast';

type ExecuteDrawResponse = components['schemas']['ExecuteDrawResponse'];

export const useExecuteDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const response = await api.post<ExecuteDrawResponse>(
        `/api/v1/draws/${drawId}/execute`,
        {}
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.setQueryData(['draw', data.draw.id], data.draw);
      toast.success(
        `Draw executed! ${data.assignments.length} assignments generated.`
      );
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      if (error.response?.status === 422) {
        throw error;
      }
      toast.error(detail || 'Failed to execute draw');
    },
  });
};
