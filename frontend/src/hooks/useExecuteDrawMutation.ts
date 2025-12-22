import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { components } from '@/types/schema';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { isStructuredErrorDetail, type DrawExecutionError } from '@/types/errors';

type ExecuteDrawResponse = components['schemas']['ExecuteDrawResponse'];

export const useExecuteDrawMutation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (drawId: string) => {
      const response = await api.post<ExecuteDrawResponse>(
        `/groups/${groupId}/draws/${drawId}/execute`,
        {}
      );
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['draws', groupId] });
      queryClient.setQueryData(['draw', data.draw.id], data.draw);
      toast.success(`Draw executed! ${data.assignments.length} assignments generated.`);
    },
    onError: (error: AxiosError<{ detail: string | object }>) => {
      // Check for 400 status with structured error detail (no_valid_draw_configuration)
      if (error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        if (isStructuredErrorDetail(detail)) {
          const drawError: DrawExecutionError = {
            code: detail.code,
            message: detail.message,
          };
          throw drawError;
        }
      }

      // For other errors, show a toast message
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Failed to execute draw';
      toast.error(errorMessage);
    },
  });
};
